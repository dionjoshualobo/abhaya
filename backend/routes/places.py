from flask import Blueprint, request, jsonify
from extensions import db
from models import SafePlace
from math import radians, sin, cos, sqrt, atan2

places_bp = Blueprint('places', __name__)


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000  # Earth radius in meters
    phi1, phi2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dlambda = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(dlambda / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


@places_bp.route('/places', methods=['GET'])
def get_places():
    """GET /places — list all saved safe places."""
    places = SafePlace.query.order_by(SafePlace.created_at).all()
    return jsonify({'places': [p.to_dict() for p in places]}), 200


@places_bp.route('/places', methods=['POST'])
def add_place():
    """
    POST /places — save a known safe place.
    Body: {"label": "Home", "latitude": 12.9716, "longitude": 77.5946, "radius_meters": 200}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    label = data.get('label', '').strip()
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    radius_meters = data.get('radius_meters', 200.0)

    if not label:
        return jsonify({'error': 'label is required'}), 400
    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    place = SafePlace(
        label=label,
        latitude=latitude,
        longitude=longitude,
        radius_meters=radius_meters
    )
    db.session.add(place)
    db.session.commit()

    return jsonify({'status': 'place_added', 'place': place.to_dict()}), 201


@places_bp.route('/places/<int:place_id>', methods=['PUT'])
def update_place(place_id):
    """
    PUT /places/<id> — update a safe place's details.
    Body: {"label": "Work", "latitude": 12.99, "longitude": 77.59, "radius_meters": 300}  // all optional
    """
    place = SafePlace.query.get(place_id)
    if not place:
        return jsonify({'error': 'Place not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    if 'label' in data and data['label'].strip():
        place.label = data['label'].strip()
    if 'latitude' in data:
        place.latitude = data['latitude']
    if 'longitude' in data:
        place.longitude = data['longitude']
    if 'radius_meters' in data:
        place.radius_meters = data['radius_meters']

    db.session.commit()
    return jsonify({'status': 'place_updated', 'place': place.to_dict()}), 200


@places_bp.route('/places/<int:place_id>', methods=['DELETE'])
def delete_place(place_id):
    """DELETE /places/<id> — remove a safe place."""
    place = SafePlace.query.get(place_id)
    if not place:
        return jsonify({'error': 'Place not found'}), 404

    db.session.delete(place)
    db.session.commit()
    return jsonify({'status': 'place_deleted', 'id': place_id}), 200


@places_bp.route('/location/check', methods=['POST'])
def check_location():
    """
    POST /location/check — check if user's current location is within any safe place.
    Body: {"latitude": 12.9716, "longitude": 77.5946}
    Returns: safe/suspicious + nearest place info
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    places = SafePlace.query.all()
    if not places:
        return jsonify({'status': 'safe', 'reason': 'No safe places configured'}), 200

    nearest = None
    nearest_distance = float('inf')

    for place in places:
        dist = haversine_distance(latitude, longitude, place.latitude, place.longitude)
        if dist < nearest_distance:
            nearest_distance = dist
            nearest = place

    if nearest_distance <= nearest.radius_meters:
        return jsonify({
            'status': 'safe',
            'place': nearest.to_dict(),
            'distance_meters': round(nearest_distance, 1)
        }), 200
    else:
        return jsonify({
            'status': 'suspicious',
            'nearest_place': nearest.to_dict(),
            'distance_meters': round(nearest_distance, 1),
            'message': 'User is outside all known safe zones. Consider sending a check-in alert.'
        }), 200
