import logging
import time
from collections import Counter
from datetime import datetime, date

import requests

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.weather_request import WeatherRequest as WeatherRequestModel
from app.models.weather_current import WeatherCurrent
from app.models.weather_forecast_day import WeatherForecastDay
from app.schemas.weather import WeatherResponse, CurrentWeatherSchema, ForecastDaySchema
from app.services.api_log_service import log_api_call
from app.services.cache_service import get_cached_request, get_or_create_location

logger = logging.getLogger(__name__)

CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"


def get_weather(city: str, country: str, db: Session) -> WeatherResponse:
    """
    Pipeline:
      1. Geocode via current weather endpoint (lat/lon in response)
      2. Get or create Location
      3. Check cache (WeatherRequest within WEATHER_CACHE_MINUTES)
      4. Cache hit → return stored result
      5. Cache miss → fetch current + forecast, store, return
    """
    # Step 1+2: Fetch current weather (also provides lat/lon — no separate geocoding call needed)
    current_data, lat, lon = _fetch_current(city, country, db)

    location = get_or_create_location(db, city, country, lat, lon)

    # Step 3: Cache check
    cached_request = get_cached_request(db, location.id)
    if cached_request and cached_request.current and len(cached_request.forecast_days) > 0:
        logger.info(f"Cache hit for location_id={location.id}")
        return _build_response(location, cached_request, cached=True)

    # Step 4: Fetch forecast
    forecast_data = _fetch_forecast(city, country, db)

    # Step 5: Persist
    weather_req = _store(db, location, current_data, forecast_data)

    return _build_response(location, weather_req, cached=False)


# ── Fetchers ───────────────────────────────────────────────────────────────

def _fetch_current(city: str, country: str, db: Session) -> tuple[dict, float, float]:
    params = {
        "q": f"{city},{country}",
        "units": "metric",
        "appid": settings.OPENWEATHER_API_KEY,
    }
    data = _call(CURRENT_URL, params, endpoint="current_weather", db=db)

    coord = data.get("coord", {})
    lat = coord.get("lat")
    lon = coord.get("lon")

    if lat is None or lon is None:
        raise ValueError(f"Could not geocode location: {city}, {country}")

    return data, lat, lon


def _fetch_forecast(city: str, country: str, db: Session) -> dict:
    params = {
        "q": f"{city},{country}",
        "units": "metric",
        "cnt": 40,   # 5 days × 8 intervals per day
        "appid": settings.OPENWEATHER_API_KEY,
    }
    return _call(FORECAST_URL, params, endpoint="forecast", db=db)


def _call(url: str, params: dict, endpoint: str, db: Session) -> dict:
    start = time.monotonic()
    status_code = None
    try:
        response = requests.get(url, params=params, timeout=10)
        status_code = response.status_code
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        log_api_call(db, provider="openweather", endpoint=endpoint, status_code=None, elapsed_ms=None)
        raise RuntimeError(f"OpenWeather {endpoint} timed out.")
    except requests.HTTPError as exc:
        log_api_call(db, provider="openweather", endpoint=endpoint, status_code=status_code, elapsed_ms=None)
        if status_code == 404:
            raise ValueError("Location not found.")
        if status_code == 401:
            raise RuntimeError("Invalid OpenWeather API key.")
        if status_code == 429:
            raise RuntimeError("OpenWeather rate limit reached.")
        raise RuntimeError(f"OpenWeather {endpoint} error: {exc}")
    finally:
        elapsed_ms = int((time.monotonic() - start) * 1000)
        log_api_call(db, provider="openweather", endpoint=endpoint, status_code=status_code, elapsed_ms=elapsed_ms)


# ── Storage ────────────────────────────────────────────────────────────────

def _store(db: Session, location, current_data: dict, forecast_data: dict) -> WeatherRequestModel:
    weather_req = WeatherRequestModel(
        location_id=location.id,
        units="metric",
    )
    db.add(weather_req)
    db.flush()  # Populate weather_req.id before FK references

    # Current weather
    w = current_data["weather"][0]
    m = current_data["main"]
    current = WeatherCurrent(
        request_id=weather_req.id,
        temperature=m["temp"],
        feels_like=m["feels_like"],
        humidity=m["humidity"],
        wind_speed=current_data["wind"]["speed"],
        weather_main=w["main"],
        weather_description=w["description"],
    )
    db.add(current)

    # Forecast days
    daily_summaries = _aggregate_forecast(forecast_data)
    for day in daily_summaries:
        db.add(WeatherForecastDay(
            request_id=weather_req.id,
            forecast_date=day["date"],
            temp_min=day["temp_min"],
            temp_max=day["temp_max"],
            temp_avg=day["temp_avg"],
            humidity_avg=day["humidity_avg"],
            weather_main=day["weather_main"],
            weather_description=day["weather_description"],
        ))

    db.commit()
    db.refresh(weather_req)
    return weather_req


# ── Forecast aggregation ───────────────────────────────────────────────────

def _aggregate_forecast(forecast_data: dict) -> list[dict]:
    """
    OpenWeather /forecast returns 3-hour intervals.
    Group by calendar date (UTC), compute min/max/avg temp,
    avg humidity, and pick the most frequent weather_main per day.
    Return exactly up to 5 days.
    """
    from collections import defaultdict

    buckets: dict[date, list[dict]] = defaultdict(list)

    for item in forecast_data.get("list", []):
        dt_txt = item.get("dt_txt", "")
        try:
            item_date = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S").date()
        except ValueError:
            continue
        buckets[item_date].append(item)

    summaries = []
    for day_date in sorted(buckets.keys())[:5]:
        entries = buckets[day_date]
        temps = [e["main"]["temp"] for e in entries]
        humidities = [e["main"]["humidity"] for e in entries]
        weather_mains = [e["weather"][0]["main"] for e in entries]
        weather_descs = [e["weather"][0]["description"] for e in entries]

        most_common_main = Counter(weather_mains).most_common(1)[0][0]
        # Pick description that corresponds to most common main
        desc_for_main = [
            d for m, d in zip(weather_mains, weather_descs) if m == most_common_main
        ]
        most_common_desc = Counter(desc_for_main).most_common(1)[0][0]

        summaries.append({
            "date": day_date,
            "temp_min": round(min(temps), 2),
            "temp_max": round(max(temps), 2),
            "temp_avg": round(sum(temps) / len(temps), 2),
            "humidity_avg": round(sum(humidities) / len(humidities)),
            "weather_main": most_common_main,
            "weather_description": most_common_desc,
        })

    return summaries


# ── Response builder ───────────────────────────────────────────────────────

def _build_response(location, req: WeatherRequestModel, cached: bool) -> WeatherResponse:
    current = req.current
    return WeatherResponse(
        id=req.id,
        city=location.city,
        country=location.country,
        latitude=location.latitude,
        longitude=location.longitude,
        current=CurrentWeatherSchema(
            temperature=current.temperature,
            feels_like=current.feels_like,
            humidity=current.humidity,
            wind_speed=current.wind_speed,
            weather_main=current.weather_main,
            weather_description=current.weather_description,
            retrieved_at=current.retrieved_at,
        ),
        forecast=[
            ForecastDaySchema(
                forecast_date=day.forecast_date,
                temp_min=day.temp_min,
                temp_max=day.temp_max,
                temp_avg=day.temp_avg,
                humidity_avg=day.humidity_avg,
                weather_main=day.weather_main,
                weather_description=day.weather_description,
            )
            for day in req.forecast_days
        ],
        cached=cached,
        created_at=req.created_at,
    )