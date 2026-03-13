from flask import Blueprint, jsonify, request

from models import EmergencyContact
from services.live_tracking_service import build_tracking_url, create_live_tracking_session
from services.sms_service import send_sms

transport_bp = Blueprint('transport', __name__)


def _normalize_text(value):
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def _build_transport_message(payload: dict, tracking_url: str, latitude: float, longitude: float) -> str:
    person_name = _normalize_text(payload.get('person_name')) or 'Abhaya user'

    details = []
    vehicle = _normalize_text(payload.get('vehicle'))
    plate_number = _normalize_text(payload.get('plate_number'))
    driver_name = _normalize_text(payload.get('driver_name'))
    notes = _normalize_text(payload.get('details'))
    from_location = _normalize_text(payload.get('from_location'))
    to_location = _normalize_text(payload.get('to_location'))

    if vehicle:
        details.append(f"Vehicle: {vehicle}")
    if plate_number:
        details.append(f"Plate: {plate_number}")
    if driver_name:
        details.append(f"Driver: {driver_name}")
    if from_location or to_location:
        details.append(f"Trip: {from_location or '?'} -> {to_location or '?'}")
    if notes:
        details.append(f"Details: {notes}")

    maps_link = f"https://maps.google.com/?q={latitude},{longitude}"

    message_lines = [
        f"Transport safety alert from {person_name}.",
        *details,
        f"Current location: {latitude}, {longitude}",
        f"Map: {maps_link}",
        f"Live tracking: {tracking_url}",
    ]

    return "\n".join(message_lines)


@transport_bp.route('/transport/notify', methods=['POST'])
def transport_notify():
    data = request.get_json() or {}

    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    contacts_in_body = data.get('contacts', [])
    if contacts_in_body:
        contacts = contacts_in_body
    else:
        db_contacts = EmergencyContact.query.all()
        contacts = [{'name': c.name, 'phone': c.phone} for c in db_contacts]

    if not contacts:
        return jsonify({'error': 'No contacts found. Add contacts first.'}), 400

    phone_numbers = [c['phone'] for c in contacts if c.get('phone')]
    if not phone_numbers:
        return jsonify({'error': 'No valid phone numbers found in contacts'}), 400

    session = create_live_tracking_session(data.get('person_name'), latitude, longitude)
    tracking_url = build_tracking_url(session.token, request.url_root)

    message = _build_transport_message(data, tracking_url, latitude, longitude)

    try:
        result = send_sms(phone_numbers, message)
    except Exception as error:
        return jsonify({
            'error': 'SMS sending failed',
            'detail': str(error),
            'message_generated': message,
            'tracking_token': session.token,
            'tracking_url': tracking_url,
        }), 502

    return jsonify({
        'status': 'transport_alert_sent',
        'message_sent': message,
        'recipients': len(phone_numbers),
        'tracking_token': session.token,
        'tracking_url': tracking_url,
        'twilio_response': result,
    }), 200
