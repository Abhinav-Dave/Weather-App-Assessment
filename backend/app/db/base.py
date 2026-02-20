from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Models imported here so Base.metadata.create_all() registers them.
from app.models.location import Location        # noqa: F401, E402
from app.models.weather_log import WeatherLog   # noqa: F401, E402
from app.models.api_log import APILog           # noqa: F401, E402