from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import models here in Section 2 so Base.metadata.create_all() sees them.
# Example:
#   from app.models.location import Location       # noqa: F401
#   from app.models.weather_log import WeatherLog  # noqa: F401