from flask import Blueprint, request, jsonify
from services.sms_service import send_sms
from services.gemini_service import generate_sos_message
from services.live_tracking_service import create_live_tracking_session, build_tracking_url
from models import EmergencyContact

alert_bp = Blueprint('alert', __name__)

@alert_bp.route('/alert', methods=['POST'])
def send_alert():
    """
    POST /alert
    Body: {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "contacts": [{"name": "Mum", "phone": "+91..."}]  // optional, uses DB contacts if omitted
    }
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    person_name = data.get('person_name')

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    # Use contacts from request body, or fall back to saved DB contacts
    contacts_in_body = data.get('contacts', [])
    if contacts_in_body:
        contacts = contacts_in_body
    else:
        db_contacts = EmergencyContact.query.all()
        contacts = [{'name': c.name, 'phone': c.phone} for c in db_contacts]

    if not contacts:
        return jsonify({'error': 'No contacts found. Add contacts via POST /contacts or include them in the request.'}), 400

    phone_numbers = [c['phone'] for c in contacts if 'phone' in c]
    if not phone_numbers:
        return jsonify({'error': 'No valid phone numbers found in contacts'}), 400

    # Create live tracking session and include its URL in the SOS message
    tracking_session = create_live_tracking_session(person_name, latitude, longitude)
    tracking_url = build_tracking_url(tracking_session.token, request.url_root)

    # Generate SOS message using provided person name + location
    message = generate_sos_message(latitude, longitude, person_name, tracking_url)

    # Send SMS via Twilio
    try:
        result = send_sms(phone_numbers, message)
    except Exception as e:
        return jsonify({
            'error': 'SMS sending failed',
            'detail': str(e),
            'message_generated': message
        }), 502

    return jsonify({
        'status': 'alert_sent',
        'message_sent': message,
        'recipients': len(phone_numbers),
        'tracking_token': tracking_session.token,
        'tracking_url': tracking_url,
        'twilio_response': result
    }), 200
