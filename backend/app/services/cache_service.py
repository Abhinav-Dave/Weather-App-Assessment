# app/services/cache_service.py

from datetime import datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.location import Location
from app.models.weather_request import WeatherRequest


def _normalize_city(city: str) -> str:
    # Trim, collapse internal whitespace, and title-case for canonical storage
    return " ".join(city.strip().split()).title()


def _normalize_country(country: str) -> str:
    # Trim and uppercase for canonical storage (ISO-3166 style)
    return country.strip().upper()


def get_cached_request(db: Session, location_id: int) -> WeatherRequest | None:
    """
    Return the most recent WeatherRequest for this location if it was created
    within WEATHER_CACHE_MINUTES. Eagerly load current + forecast.
    """
    threshold = datetime.utcnow() - timedelta(minutes=settings.WEATHER_CACHE_MINUTES)

    return (
        db.query(WeatherRequest)
        .options(
            joinedload(WeatherRequest.current),
            joinedload(WeatherRequest.forecast_days),
        )
        .filter(
            WeatherRequest.location_id == location_id,
            WeatherRequest.created_at >= threshold,
        )
        .order_by(WeatherRequest.created_at.desc())
        .first()
    )


def get_or_create_location(db: Session, city: str, country: str, lat: float, lon: float) -> Location:
    """
    Get a Location by canonical (city,country) or create it.
    Normalization here prevents duplicates like 'toronto' vs 'Toronto', 'ca' vs 'CA'.
    """
    city_n = _normalize_city(city)
    country_n = _normalize_country(country)

    location = (
        db.query(Location)
        .filter(Location.city == city_n, Location.country == country_n)
        .first()
    )
    if location:
        return location

    location = Location(city=city_n, country=country_n, latitude=lat, longitude=lon)
    db.add(location)
    db.commit()
    db.refresh(location)
    return location