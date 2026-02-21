# Rename concept: base.py holds only Base.
# This file imports all models so create_all() sees them.
# Import this module in main.py instead of base.py.

from app.db.base import Base  # noqa: F401

from app.models.location import Location                        # noqa: F401
from app.models.weather_request import WeatherRequest           # noqa: F401
from app.models.weather_current import WeatherCurrent           # noqa: F401
from app.models.weather_forecast_day import WeatherForecastDay  # noqa: F401
from app.models.api_log import APILog                           # noqa: F401