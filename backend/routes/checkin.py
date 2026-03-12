from flask import Blueprint, request, jsonify
from extensions import db
from models import EmergencyContact
from services.sms_service import send_sms
from services.gemini_service import generate_sos_message
from datetime import datetime, timezone

checkin_bp = Blueprint('checkin', __name__)

# In-memory store: tracks pending check-ins
# { session_id: { 'expires_at': datetime, 'latitude': float, 'longitude': float, 'responded': bool } }
_pending_checkins: dict = {}


@checkin_bp.route('/checkin/request', methods=['POST'])
def request_checkin():
    """
    POST /checkin/request — backend records that a check-in is pending.
    Called by frontend when /location/check returns 'suspicious'.
    Body: {"latitude": 12.9716, "longitude": 77.5946, "timeout_seconds": 60}
    Returns a session_id the frontend uses to respond or let expire.
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    latitude = data.get('latitude', 0.0)
    longitude = data.get('longitude', 0.0)
    timeout = data.get('timeout_seconds', 60)

    import uuid
    session_id = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc).timestamp() + timeout

    _pending_checkins[session_id] = {
        'expires_at': expires_at,
        'latitude': latitude,
        'longitude': longitude,
        'responded': False,
        'alert_sent': False,
    }

    return jsonify({
        'status': 'checkin_pending',
        'session_id': session_id,
        'message': 'Are you okay? Respond within the timeout or an alert will be sent.',
        'timeout_seconds': timeout
    }), 200


@checkin_bp.route('/checkin/respond', methods=['POST'])
def respond_checkin():
    """
    POST /checkin/respond — user confirms they are safe.
    Body: {"session_id": "...", "safe": true}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    session_id = data.get('session_id')
    safe = data.get('safe', True)

    if not session_id or session_id not in _pending_checkins:
        return jsonify({'error': 'Invalid or expired session_id'}), 404

    checkin = _pending_checkins[session_id]
    checkin['responded'] = True

    if safe:
        del _pending_checkins[session_id]
        return jsonify({'status': 'safe', 'message': 'Glad you are okay!'}), 200

    # User said they are NOT safe — send SOS immediately
    return _trigger_sos(session_id, checkin)


@checkin_bp.route('/checkin/poll', methods=['POST'])
def poll_checkin():
    """
    POST /checkin/poll — frontend polls this to check if timeout has expired.
    If expired and no response, triggers SOS automatically.
    Body: {"session_id": "..."}
    """
    data = request.get_json()
    session_id = data.get('session_id') if data else None

    if not session_id or session_id not in _pending_checkins:
        return jsonify({'error': 'Invalid or expired session_id'}), 404

    checkin = _pending_checkins[session_id]

    if checkin['responded']:
        return jsonify({'status': 'responded'}), 200

    now = datetime.now(timezone.utc).timestamp()
    if now >= checkin['expires_at']:
        # Timeout — trigger auto SOS
        return _trigger_sos(session_id, checkin)

    remaining = round(checkin['expires_at'] - now)
    return jsonify({'status': 'pending', 'remaining_seconds': remaining}), 200


def _trigger_sos(session_id: str, checkin: dict):
    """Internal helper — sends SOS and cleans up the check-in session."""
    if checkin.get('alert_sent'):
        return jsonify({'status': 'alert_already_sent'}), 200

    checkin['alert_sent'] = True
    latitude = checkin['latitude']
    longitude = checkin['longitude']

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
        sms_error = 'No emergency contacts saved.'

    if session_id in _pending_checkins:
        del _pending_checkins[session_id]

    return jsonify({
        'status': 'sos_triggered',
        'message': 'No response received. Alert sent to emergency contacts and police (simulated).',
        'police_notified': True,   # faked
        'sms_result': sms_result,
        'sms_error': sms_error,
    }), 200
