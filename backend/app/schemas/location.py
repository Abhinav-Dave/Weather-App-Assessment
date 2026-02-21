from datetime import datetime
from pydantic import BaseModel


class LocationBase(BaseModel):
    city: str
    country: str


class LocationRead(LocationBase):
    id: int
    latitude: float
    longitude: float
    created_at: datetime

    model_config = {"from_attributes": True}