from datetime import datetime, date
from uuid import UUID
from pydantic import BaseModel, Field


class WeatherRequest(BaseModel):
    city: str = Field(..., min_length=1, examples=["Toronto"])
    country: str = Field(..., min_length=2, max_length=2, examples=["CA"])


class CurrentWeatherSchema(BaseModel):
    temperature: float
    feels_like: float
    humidity: int
    wind_speed: float
    weather_main: str
    weather_description: str
    retrieved_at: datetime

    model_config = {"from_attributes": True}


class ForecastDaySchema(BaseModel):
    forecast_date: date
    temp_min: float
    temp_max: float
    temp_avg: float
    humidity_avg: int | None
    weather_main: str
    weather_description: str

    model_config = {"from_attributes": True}


class WeatherResponse(BaseModel):
    id: UUID
    city: str
    country: str
    latitude: float
    longitude: float
    current: CurrentWeatherSchema
    forecast: list[ForecastDaySchema]
    cached: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class WeatherHistoryItem(BaseModel):
    id: UUID
    city: str
    country: str
    created_at: datetime
    temperature: float
    weather_main: str
    weather_description: str
    cached: bool = False

    model_config = {"from_attributes": True}