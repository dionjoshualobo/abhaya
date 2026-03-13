from secrets import token_urlsafe

from config import BACKEND_PUBLIC_BASE_URL
from extensions import db
from models import LiveLocationSession


def build_tracking_url(token: str, request_root: str) -> str:
    base_url = (BACKEND_PUBLIC_BASE_URL or request_root).rstrip('/')
    return f"{base_url}/tracking/view/{token}"


def create_live_tracking_session(person_name: str | None, latitude: float, longitude: float) -> LiveLocationSession:
    session = LiveLocationSession(
        token=token_urlsafe(24),
        person_name=person_name,
        latest_latitude=latitude,
        latest_longitude=longitude,
        is_active=True,
    )
    db.session.add(session)
    db.session.commit()
    return session


def update_live_tracking_session(token: str, latitude: float, longitude: float) -> LiveLocationSession | None:
    session = LiveLocationSession.query.filter_by(token=token).first()
    if not session:
        return None

    session.latest_latitude = latitude
    session.latest_longitude = longitude
    db.session.commit()
    return session


def stop_live_tracking_session(token: str) -> LiveLocationSession | None:
    session = LiveLocationSession.query.filter_by(token=token).first()
    if not session:
        return None

    session.is_active = False
    db.session.commit()
    return session
