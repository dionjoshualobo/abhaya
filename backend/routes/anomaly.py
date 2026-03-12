from flask import Blueprint, request, jsonify
from extensions import db
from models import AnomalyLog, EmergencyContact
from services.sms_service import send_sms
from services.gemini_service import generate_sos_message
from math import sqrt
from datetime import datetime, timezone

anomaly_bp = Blueprint('anomaly', __name__)

# Magnitude threshold above which we consider it a real anomaly (struggle/attack)
ANOMALY_THRESHOLD = 5.0

# Cooldown: don't send another SMS alert within this many seconds
COOLDOWN_SECONDS = 120
_last_alert_time: datetime | None = None


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

    # Anomaly detected — check cooldown before sending SMS
    global _last_alert_time
    now = datetime.now(timezone.utc)

    if _last_alert_time is not None:
        elapsed = (now - _last_alert_time).total_seconds()
        if elapsed < COOLDOWN_SECONDS:
            return jsonify({
                'anomaly_detected': True,
                'magnitude': round(magnitude, 4),
                'threshold': ANOMALY_THRESHOLD,
                'alert_triggered': False,
                'cooldown_active': True,
                'retry_in_seconds': round(COOLDOWN_SECONDS - elapsed),
                'log_id': log.id
            }), 200

    _last_alert_time = now

    # Auto-send SOS to all saved contacts
    latitude = data.get('latitude', 0.0)
    longitude = data.get('longitude', 0.0)

    contacts = EmergencyContact.query.all()
    sms_result = None
    sms_error = None
    contact_name = None
    message_sent = None

    print(f'[anomaly] shake detected! magnitude={magnitude:.2f}, contacts_found={len(contacts)}')

    if contacts:
        contact_name = contacts[0].name
        phone_numbers = [c.phone for c in contacts]
        print(f'[anomaly] sending SMS to {len(phone_numbers)} numbers')
        try:
            message_sent = generate_sos_message(latitude, longitude, contact_name)
            print(f'[anomaly] generated message: {message_sent}')
            sms_result = send_sms(phone_numbers, message_sent)
            print(f'[anomaly] SMS sent successfully: {sms_result}')
            # Check if SMS actually succeeded (has sent results)
            sms_success = sms_result and 'sent' in sms_result and len(sms_result['sent']) > 0
        except Exception as e:
            sms_error = str(e)
            sms_success = False
            print(f'[anomaly] SMS ERROR: {sms_error}')
    else:
        sms_error = 'No emergency contacts saved. Add contacts via POST /contacts.'
        sms_success = False
        print(f'[anomaly] ERROR: {sms_error}')

    return jsonify({
        'anomaly_detected': True,
        'magnitude': round(magnitude, 4),
        'threshold': ANOMALY_THRESHOLD,
        'alert_sent': sms_success,
        'alert_triggered': True,
        'contact_name': contact_name,
        'message_sent': message_sent,
        'log_id': log.id,
        'sms_result': sms_result,
        'sms_error': sms_error
    }), 200
