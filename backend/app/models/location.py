from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.base import Base


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    city = Column(String, nullable=False)
    country = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    weather_logs = relationship("WeatherLog", back_populates="location", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("city", "country", name="uq_location_city_country"),
    )