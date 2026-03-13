from flask import Blueprint, jsonify, request

from models import LiveLocationSession
from services.live_tracking_service import (
    build_tracking_url,
    create_live_tracking_session,
    stop_live_tracking_session,
    update_live_tracking_session,
)

tracking_bp = Blueprint('tracking', __name__)


@tracking_bp.route('/tracking/start', methods=['POST'])
def start_tracking():
    data = request.get_json() or {}

    latitude = data.get('latitude')
    longitude = data.get('longitude')
    person_name = data.get('person_name')

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    session = create_live_tracking_session(person_name, latitude, longitude)

    return jsonify({
        'status': 'tracking_started',
        'token': session.token,
        'tracking_url': build_tracking_url(session.token, request.url_root),
    }), 200


@tracking_bp.route('/tracking/update', methods=['POST'])
def update_tracking():
    data = request.get_json() or {}

    token = data.get('token')
    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if not token:
        return jsonify({'error': 'token is required'}), 400

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    session = update_live_tracking_session(token, latitude, longitude)
    if not session:
        return jsonify({'error': 'tracking session not found'}), 404

    return jsonify({'status': 'tracking_updated'}), 200


@tracking_bp.route('/tracking/stop', methods=['POST'])
def stop_tracking():
    data = request.get_json() or {}
    token = data.get('token')

    if not token:
        return jsonify({'error': 'token is required'}), 400

    session = stop_live_tracking_session(token)
    if not session:
        return jsonify({'error': 'tracking session not found'}), 404

    return jsonify({'status': 'tracking_stopped'}), 200


@tracking_bp.route('/tracking/<token>', methods=['GET'])
def tracking_status(token: str):
    session = LiveLocationSession.query.filter_by(token=token).first()
    if not session:
        return jsonify({'error': 'tracking session not found'}), 404

    return jsonify(session.to_dict()), 200


@tracking_bp.route('/tracking/view/<token>', methods=['GET'])
def tracking_view(token: str):
    session = LiveLocationSession.query.filter_by(token=token).first()
    if not session:
        return '<h2>Tracking session not found</h2>', 404

    maps_link = f"https://maps.google.com/?q={session.latest_latitude},{session.latest_longitude}"
    status = 'Live' if session.is_active else 'Stopped'

    html = f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <meta http-equiv=\"refresh\" content=\"15\" />
    <title>Abhaya Live Location</title>
    <style>
      body {{ font-family: Arial, sans-serif; background: #111; color: #fff; padding: 16px; }}
      .card {{ background: #1e1e1e; border-radius: 12px; padding: 16px; max-width: 520px; margin: 0 auto; }}
      .title {{ font-size: 22px; font-weight: 700; color: #c0392b; margin-bottom: 12px; }}
      .row {{ margin: 8px 0; }}
      a {{ color: #4da3ff; }}
      .meta {{ color: #aaa; font-size: 12px; margin-top: 12px; }}
    </style>
  </head>
  <body>
    <div class=\"card\">
      <div class=\"title\">Abhaya Live Location</div>
      <div class=\"row\"><strong>Name:</strong> {session.person_name or 'Abhaya user'}</div>
      <div class=\"row\"><strong>Status:</strong> {status}</div>
      <div class=\"row\"><strong>Latitude:</strong> {session.latest_latitude}</div>
      <div class=\"row\"><strong>Longitude:</strong> {session.latest_longitude}</div>
      <div class=\"row\"><a href=\"{maps_link}\" target=\"_blank\" rel=\"noreferrer\">Open in Google Maps</a></div>
      <div class=\"meta\">Auto-refreshes every 15 seconds • Last update: {session.updated_at}</div>
    </div>
  </body>
</html>
"""

    return html, 200
