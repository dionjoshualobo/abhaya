from flask import Blueprint, request, jsonify
from services.sms_service import send_sms
from services.gemini_service import generate_sos_message
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

    # Generate SOS message using Gemini
    first_contact_name = contacts[0].get('name', 'Emergency Contact')
    message = generate_sos_message(latitude, longitude, first_contact_name)

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
        'twilio_response': result
    }), 200
