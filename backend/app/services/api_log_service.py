import logging

from sqlalchemy.orm import Session

from app.models.api_log import APILog

logger = logging.getLogger(__name__)


def log_api_call(
    db: Session,
    provider: str,
    endpoint: str,
    status_code: int | None,
    elapsed_ms: int | None,
) -> None:
    """
    Persist a record of every outbound API call.
    Silently catches write failures so logging never breaks a request.
    """
    try:
        entry = APILog(
            provider=provider,
            endpoint=endpoint,
            status_code=status_code,
            response_time_ms=elapsed_ms,
        )
        db.add(entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to write API log: {e}")
        db.rollback()