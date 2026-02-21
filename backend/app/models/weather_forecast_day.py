import uuid

from sqlalchemy import Column, String, Float, Integer, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class WeatherForecastDay(Base):
    __tablename__ = "weather_forecast_days"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    request_id = Column(UUID(as_uuid=True), ForeignKey("weather_requests.id"), nullable=False, index=True)
    forecast_date = Column(Date, nullable=False)
    temp_min = Column(Float, nullable=False)
    temp_max = Column(Float, nullable=False)
    temp_avg = Column(Float, nullable=False)
    humidity_avg = Column(Integer, nullable=True)
    weather_main = Column(String, nullable=False)
    weather_description = Column(String, nullable=False)

    request = relationship("WeatherRequest", back_populates="forecast_days")