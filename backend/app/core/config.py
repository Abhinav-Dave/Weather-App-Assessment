from pydantic_settings import BaseSettings
import logging

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    PROJECT_NAME: str = "Weather App API"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DATABASE_URL: str
    FRONTEND_ORIGIN: str = "http://localhost:5173"
    OPENWEATHER_API_KEY: str
    WEATHER_CACHE_MINUTES: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()