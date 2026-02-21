import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class WeatherCurrent(Base):
    __tablename__ = "weather_current"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("weather_requests.id"), nullable=False, unique=True)
    temperature = Column(Float, nullable=False)
    feels_like = Column(Float, nullable=False)
    humidity = Column(Integer, nullable=False)
    wind_speed = Column(Float, nullable=False)
    weather_main = Column(String, nullable=False)
    weather_description = Column(String, nullable=False)
    retrieved_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    request = relationship("WeatherRequest", back_populates="current")