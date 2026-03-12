from extensions import db
from datetime import datetime, timezone


class HeatmapReport(db.Model):
    """A danger zone report submitted by a user."""
    __tablename__ = 'heatmap_reports'

    id = db.Column(db.Integer, primary_key=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'description': self.description,
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
