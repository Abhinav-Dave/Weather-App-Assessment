from datetime import datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.location import Location
from app.models.weather_request import WeatherRequest


def get_cached_request(db: Session, location_id: int) -> WeatherRequest | None:
    """
    Return the most recent WeatherRequest for this location if it was
    created within WEATHER_CACHE_MINUTES. Eagerly load current + forecast.
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
    location = (
        db.query(Location)
        .filter(Location.city == city, Location.country == country)
        .first()
    )
    if location:
        return location

    location = Location(city=city, country=country, latitude=lat, longitude=lon)
    db.add(location)
    db.commit()
    db.refresh(location)
    return location