import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.weather_request import WeatherRequest as WeatherRequestModel
from app.schemas.weather import WeatherRequest, WeatherResponse, WeatherHistoryItem
from app.services.weather_service import get_weather

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.post("/", response_model=WeatherResponse, status_code=200)
def fetch_weather(payload: WeatherRequest, db: Session = Depends(get_db)):
    """
    Geocode city, check cache, fetch current + forecast from OpenWeather
    if needed, persist, and return structured weather data.
    """
    try:
        return get_weather(city=payload.city, country=payload.country, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


@router.get("/history", response_model=list[WeatherHistoryItem])
def get_history(limit: int = 50, db: Session = Depends(get_db)):
    """
    Return recent weather requests with current snapshot summary.
    """
    requests = (
        db.query(WeatherRequestModel)
        .options(
            joinedload(WeatherRequestModel.current),
            joinedload(WeatherRequestModel.location),
        )
        .order_by(WeatherRequestModel.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for req in requests:
        if not req.current or not req.location:
            continue
        result.append(WeatherHistoryItem(
            id=req.id,
            city=req.location.city,
            country=req.location.country,
            created_at=req.created_at,
            temperature=req.current.temperature,
            weather_main=req.current.weather_main,
            weather_description=req.current.weather_description,
        ))
    return result


@router.delete("/{request_id}", status_code=204)
def delete_weather_request(request_id: UUID, db: Session = Depends(get_db)):
    """
    Delete a weather request and its associated current + forecast rows (cascade).
    """
    req = db.get(WeatherRequestModel, request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Weather request {request_id} not found.")
    db.delete(req)
    db.commit()