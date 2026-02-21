import csv
import io
import logging
import time
from collections import Counter, defaultdict
from datetime import datetime, date
from typing import Any, Generator, Optional
from uuid import UUID

import requests
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.location import Location
from app.models.weather_request import WeatherRequest as WeatherRequestModel
from app.models.weather_current import WeatherCurrent
from app.models.weather_forecast_day import WeatherForecastDay
from app.schemas.weather import (
    WeatherResponse, CurrentWeatherSchema, ForecastDaySchema,
    WeatherUpdateRequest, ReverseGeocodeResponse,
)
from app.services.api_log_service import log_api_call
from app.services.cache_service import get_cached_request, get_or_create_location

logger = logging.getLogger(__name__)

GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/direct"
REVERSE_GEOCODE_URL = "https://api.openweathermap.org/geo/1.0/reverse"
CURRENT_URL = "https://api.openweathermap.org/data/2.5/weather"
FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast"

CSV_COLUMNS = [
    "id", "city", "country", "latitude", "longitude",
    "retrieved_at", "temperature", "feels_like", "humidity",
    "wind_speed", "weather_main", "weather_description",
    "label", "notes",
]


def _normalize_city(city: str) -> str:
    return " ".join(city.strip().split()).title()


def _normalize_country(country: str) -> str:
    return country.strip().upper()


# ── Reverse geocoding ──────────────────────────────────────────────────────

def reverse_geocode(lat: float, lon: float, db: Session) -> ReverseGeocodeResponse:
    """
    Convert lat/lon to city + country using OpenWeather Reverse Geocoding API.
    Raises ValueError if the location cannot be resolved.
    """
    params = {
        "lat": lat,
        "lon": lon,
        "limit": 1,
        "appid": settings.OPENWEATHER_API_KEY,
    }
    data = _call(REVERSE_GEOCODE_URL, params, endpoint="reverse_geocoding", db=db)

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("Location not found for the provided coordinates.")

    result = data[0]
    city = _normalize_city(result.get("name", ""))
    country = _normalize_country(result.get("country", ""))

    if not city or not country:
        raise ValueError("Location not found for the provided coordinates.")

    return ReverseGeocodeResponse(city=city, country=country)


# ── Main pipeline ──────────────────────────────────────────────────────────

def get_weather(city: str, country: str, db: Session) -> WeatherResponse:
    city_n = _normalize_city(city)
    country_n = _normalize_country(country)

    location = (
        db.query(Location)
        .filter(Location.city == city_n, Location.country == country_n)
        .first()
    )

    if location:
        cached_request = get_cached_request(db, location.id)
        if cached_request and cached_request.current and len(cached_request.forecast_days) > 0:
            logger.info(f"Cache hit for location_id={location.id}")
            return _build_response(location, cached_request, cached=True)

    lat, lon = _geocode(city_n, country_n, db)
    location = get_or_create_location(db, city_n, country_n, lat, lon)

    cached_request = get_cached_request(db, location.id)
    if cached_request and cached_request.current and len(cached_request.forecast_days) > 0:
        logger.info(f"Cache hit for location_id={location.id}")
        return _build_response(location, cached_request, cached=True)

    logger.info(f"Cache miss — fetching from OpenWeather for location_id={location.id}")
    current_data = _fetch_current(city_n, country_n, db)
    forecast_data = _fetch_forecast(city_n, country_n, db)

    weather_req = _store(db, location, current_data, forecast_data)
    return _build_response(location, weather_req, cached=False)


# ── UPDATE ─────────────────────────────────────────────────────────────────

def update_weather_request(
    request_id: UUID,
    payload: WeatherUpdateRequest,
    db: Session,
) -> WeatherResponse:
    req = (
        db.query(WeatherRequestModel)
        .options(
            joinedload(WeatherRequestModel.current),
            joinedload(WeatherRequestModel.forecast_days),
            joinedload(WeatherRequestModel.location),
        )
        .filter(WeatherRequestModel.id == request_id)
        .first()
    )

    if not req:
        return None

    if payload.label is not None:
        req.label = payload.label
    if payload.notes is not None:
        req.notes = payload.notes

    db.commit()
    db.refresh(req)
    return _build_response(req.location, req, cached=False)


# ── EXPORT ─────────────────────────────────────────────────────────────────

def export_weather_csv(db: Session, city_filter: Optional[str] = None) -> Generator[str, None, None]:
    query = (
        db.query(WeatherRequestModel)
        .options(
            joinedload(WeatherRequestModel.current),
            joinedload(WeatherRequestModel.location),
        )
        .order_by(WeatherRequestModel.created_at.desc())
    )

    if city_filter:
        city_n = _normalize_city(city_filter)
        query = query.join(WeatherRequestModel.location).filter(Location.city == city_n)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    yield output.getvalue()

    for req in query.yield_per(100):
        output.seek(0)
        output.truncate(0)
        loc = req.location
        cur = req.current
        if not loc or not cur:
            continue
        writer.writerow({
            "id": str(req.id),
            "city": loc.city,
            "country": loc.country,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "retrieved_at": cur.retrieved_at.isoformat(),
            "temperature": cur.temperature,
            "feels_like": cur.feels_like,
            "humidity": cur.humidity,
            "wind_speed": cur.wind_speed,
            "weather_main": cur.weather_main,
            "weather_description": cur.weather_description,
            "label": req.label or "",
            "notes": req.notes or "",
        })
        yield output.getvalue()


# ── Fetchers ───────────────────────────────────────────────────────────────

def _geocode(city: str, country: str, db: Session) -> tuple[float, float]:
    params = {"q": f"{city},{country}", "limit": 1, "appid": settings.OPENWEATHER_API_KEY}
    data = _call(GEOCODE_URL, params, endpoint="geocoding", db=db)
    if not isinstance(data, list) or len(data) == 0:
        raise ValueError("Location not found.")
    lat, lon = data[0].get("lat"), data[0].get("lon")
    if lat is None or lon is None:
        raise ValueError("Location not found.")
    return float(lat), float(lon)


def _fetch_current(city: str, country: str, db: Session) -> dict:
    params = {"q": f"{city},{country}", "units": "metric", "appid": settings.OPENWEATHER_API_KEY}
    data = _call(CURRENT_URL, params, endpoint="current_weather", db=db)
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected response from current weather API.")
    return data


def _fetch_forecast(city: str, country: str, db: Session) -> dict:
    params = {"q": f"{city},{country}", "units": "metric", "cnt": 40, "appid": settings.OPENWEATHER_API_KEY}
    data = _call(FORECAST_URL, params, endpoint="forecast", db=db)
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected response from forecast API.")
    return data


def _call(url: str, params: dict, endpoint: str, db: Session) -> Any:
    start = time.monotonic()
    status_code: int | None = None
    logged_in_except = False

    try:
        response = requests.get(url, params=params, timeout=10)
        status_code = response.status_code
        response.raise_for_status()
        return response.json()
    except requests.Timeout:
        logged_in_except = True
        log_api_call(db, provider="openweather", endpoint=endpoint, status_code=None, elapsed_ms=None)
        raise RuntimeError(f"OpenWeather {endpoint} timed out.")
    except requests.HTTPError as exc:
        logged_in_except = True
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
        if not logged_in_except:
            log_api_call(db, provider="openweather", endpoint=endpoint, status_code=status_code, elapsed_ms=elapsed_ms)


# ── Storage ────────────────────────────────────────────────────────────────

def _store(db: Session, location, current_data: dict, forecast_data: dict) -> WeatherRequestModel:
    weather_req = WeatherRequestModel(location_id=location.id, units="metric")
    db.add(weather_req)
    db.flush()

    w = current_data["weather"][0]
    m = current_data["main"]
    db.add(WeatherCurrent(
        request_id=weather_req.id,
        temperature=m["temp"],
        feels_like=m["feels_like"],
        humidity=m["humidity"],
        wind_speed=current_data.get("wind", {}).get("speed", 0.0),
        weather_main=w["main"],
        weather_description=w["description"],
    ))

    for day in _aggregate_forecast(forecast_data):
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
    buckets: dict[date, list[dict]] = defaultdict(list)
    for item in forecast_data.get("list", []):
        dt_txt = item.get("dt_txt", "")
        try:
            item_date = datetime.strptime(dt_txt, "%Y-%m-%d %H:%M:%S").date()
        except ValueError:
            continue
        buckets[item_date].append(item)

    summaries: list[dict] = []
    for day_date in sorted(buckets.keys())[:5]:
        entries = buckets[day_date]
        temps = [e["main"]["temp"] for e in entries]
        humidities = [e["main"]["humidity"] for e in entries]
        weather_mains = [e["weather"][0]["main"] for e in entries]
        weather_descs = [e["weather"][0]["description"] for e in entries]
        most_common_main = Counter(weather_mains).most_common(1)[0][0]
        desc_for_main = [d for m, d in zip(weather_mains, weather_descs) if m == most_common_main]
        most_common_desc = Counter(desc_for_main).most_common(1)[0][0] if desc_for_main else weather_descs[0]
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
        label=req.label,
        notes=req.notes,
    )