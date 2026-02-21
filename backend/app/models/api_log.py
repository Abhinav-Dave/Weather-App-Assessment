from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime

from app.db.base import Base


class APILog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False)
    endpoint = Column(String, nullable=False)
    status_code = Column(Integer, nullable=True)
    response_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)