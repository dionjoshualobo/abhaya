from flask import Blueprint, request, jsonify
from extensions import db
from models import AnomalyLog, EmergencyContact
from services.sms_service import send_sms
from services.gemini_service import generate_sos_message
from math import sqrt

anomaly_bp = Blueprint('anomaly', __name__)

# Magnitude threshold above which we consider it a real anomaly (struggle/attack)
ANOMALY_THRESHOLD = 25.0


@anomaly_bp.route('/anomaly', methods=['POST'])
def detect_anomaly():
    """
    POST /anomaly — receive accelerometer data and detect if it's an anomaly.
    Body: {
        "x": 3.2, "y": -18.5, "z": 14.1,
        "latitude": 12.9716,   // optional, used in SOS message
        "longitude": 77.5946   // optional
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    x = data.get('x')
    y = data.get('y')
    z = data.get('z')

    if x is None or y is None or z is None:
        return jsonify({'error': 'x, y, and z accelerometer values are required'}), 400

    magnitude = sqrt(x**2 + y**2 + z**2)
    is_anomaly = magnitude >= ANOMALY_THRESHOLD

    # Log to DB
    log = AnomalyLog(
        x=x, y=y, z=z,
        magnitude=round(magnitude, 4),
        alert_triggered=is_anomaly
    )
    db.session.add(log)
    db.session.commit()

    if not is_anomaly:
        return jsonify({
            'anomaly_detected': False,
            'magnitude': round(magnitude, 4),
            'threshold': ANOMALY_THRESHOLD,
            'alert_triggered': False,
            'log_id': log.id
        }), 200

    # Anomaly detected — auto-send SOS to all saved contacts
    latitude = data.get('latitude', 0.0)
    longitude = data.get('longitude', 0.0)

    contacts = EmergencyContact.query.all()
    sms_result = None
    sms_error = None

    if contacts:
        phone_numbers = [c.phone for c in contacts]
        first_name = contacts[0].name
        try:
            message = generate_sos_message(latitude, longitude, first_name)
            sms_result = send_sms(phone_numbers, message)
        except Exception as e:
            sms_error = str(e)
    else:
        sms_error = 'No emergency contacts saved. Add contacts via POST /contacts.'

    return jsonify({
        'anomaly_detected': True,
        'magnitude': round(magnitude, 4),
        'threshold': ANOMALY_THRESHOLD,
        'alert_triggered': True,
        'log_id': log.id,
        'sms_result': sms_result,
        'sms_error': sms_error
    }), 200
