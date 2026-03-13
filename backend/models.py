from extensions import db
from datetime import datetime, timezone


class EmergencyContact(db.Model):
    """An emergency contact saved by the user."""
    __tablename__ = 'emergency_contacts'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    relation = db.Column(db.String(50), nullable=True)  # e.g. "Mum", "Friend"
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'relation': self.relation,
            'created_at': self.created_at.isoformat(),
        }


class SafePlace(db.Model):
    """A known safe place saved by the user (home, work, college, etc.)."""
    __tablename__ = 'safe_places'

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(100), nullable=False)   # e.g. "Home", "College"
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    radius_meters = db.Column(db.Float, default=200.0)  # safe zone radius
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'label': self.label,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'radius_meters': self.radius_meters,
            'created_at': self.created_at.isoformat(),
        }


class HeatmapReport(db.Model):
    """A danger zone report submitted by a user."""
    __tablename__ = 'heatmap_reports'

    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    weight = db.Column(db.Float, default=1.0)  # heatmap intensity (1.0 = normal, higher = more dangerous)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'description': self.description,
            'weight': self.weight,
            'created_at': self.created_at.isoformat(),
        }


class AnomalyLog(db.Model):
    """A logged accelerometer anomaly event."""
    __tablename__ = 'anomaly_logs'

    id = db.Column(db.Integer, primary_key=True)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    z = db.Column(db.Float, nullable=False)
    magnitude = db.Column(db.Float, nullable=False)
    alert_triggered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'z': self.z,
            'magnitude': self.magnitude,
            'alert_triggered': self.alert_triggered,
            'created_at': self.created_at.isoformat(),
        }


class LiveLocationSession(db.Model):
    """A live location sharing session for SOS tracking."""
    __tablename__ = 'live_location_sessions'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, index=True)
    person_name = db.Column(db.String(100), nullable=True)
    latest_latitude = db.Column(db.Float, nullable=False)
    latest_longitude = db.Column(db.Float, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'token': self.token,
            'person_name': self.person_name,
            'latest_latitude': self.latest_latitude,
            'latest_longitude': self.latest_longitude,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
