import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.weather_request import WeatherRequest as WeatherRequestModel
from app.schemas.weather import (
    WeatherRequest, WeatherResponse, WeatherHistoryItem,
    WeatherUpdateRequest, ReverseGeocodeResponse,
)
from app.services.weather_service import (
    get_weather, update_weather_request, export_weather_csv, reverse_geocode,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/weather", tags=["Weather"])


@router.post("/", response_model=WeatherResponse, status_code=200)
def fetch_weather(payload: WeatherRequest, db: Session = Depends(get_db)):
    try:
        return get_weather(city=payload.city, country=payload.country, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")


@router.get("/reverse-geocode", response_model=ReverseGeocodeResponse)
def reverse_geocode_endpoint(
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude (-90 to 90)"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude (-180 to 180)"),
    db: Session = Depends(get_db),
):
    try:
        return reverse_geocode(lat=lat, lon=lon, db=db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/export")
def export_weather(
    format: str = Query(default="csv"),
    city: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    if format.lower() != "csv":
        raise HTTPException(status_code=400, detail=f"Unsupported format '{format}'. Only 'csv' is supported.")
    filename = f"weather_export_{city.lower()}.csv" if city else "weather_export.csv"
    return StreamingResponse(
        export_weather_csv(db=db, city_filter=city),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/history", response_model=list[WeatherHistoryItem])
def get_history(limit: int = 50, db: Session = Depends(get_db)):
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
            label=req.label,
            notes=req.notes,
        ))
    return result


@router.patch("/{request_id}", response_model=WeatherResponse)
def patch_weather_request(
    request_id: UUID,
    payload: WeatherUpdateRequest,
    db: Session = Depends(get_db),
):
    if payload.label is None and payload.notes is None:
        raise HTTPException(status_code=400, detail="Request body must include at least one of: label, notes.")
    updated = update_weather_request(request_id=request_id, payload=payload, db=db)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Weather request {request_id} not found.")
    return updated


@router.delete("/{request_id}", status_code=204)
def delete_weather_request(request_id: UUID, db: Session = Depends(get_db)):
    req = db.get(WeatherRequestModel, request_id)
    if not req:
        raise HTTPException(status_code=404, detail=f"Weather request {request_id} not found.")
    db.delete(req)
    db.commit()