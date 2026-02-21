import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class WeatherRequest(Base):
    __tablename__ = "weather_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False, index=True)
    units = Column(String, default="metric", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    location = relationship("Location", back_populates="weather_requests")
    current = relationship(
        "WeatherCurrent",
        back_populates="request",
        uselist=False,
        cascade="all, delete-orphan",
    )
    forecast_days = relationship(
        "WeatherForecastDay",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="WeatherForecastDay.forecast_date",
    )