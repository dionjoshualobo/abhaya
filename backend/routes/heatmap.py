from flask import Blueprint, request, jsonify
from extensions import db
from models import HeatmapReport

heatmap_bp = Blueprint('heatmap', __name__)


@heatmap_bp.route('/heatmap', methods=['GET'])
def get_heatmap():
    """
    GET /heatmap — get all danger zone reports as heatmap points.
    Returns list of {latitude, longitude, weight} for react-native-maps heatmap overlay.
    Optional query param: ?limit=100
    """
    limit = request.args.get('limit', 200, type=int)
    reports = HeatmapReport.query.order_by(HeatmapReport.created_at.desc()).limit(limit).all()

    # Return slim format optimised for map rendering
    points = [
        {
            'latitude': r.latitude,
            'longitude': r.longitude,
            'weight': r.weight,
        }
        for r in reports
    ]

    return jsonify({
        'count': len(points),
        'points': points,
        'reports': [r.to_dict() for r in reports]
    }), 200


@heatmap_bp.route('/heatmap', methods=['POST'])
def report_danger_zone():
    """
    POST /heatmap — submit a danger zone report.
    Body: {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "description": "Felt unsafe near this area",  // optional
        "weight": 1.5  // optional, default 1.0
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    latitude = data.get('latitude')
    longitude = data.get('longitude')

    if latitude is None or longitude is None:
        return jsonify({'error': 'latitude and longitude are required'}), 400

    weight = float(data.get('weight', 1.0))
    weight = max(0.1, min(weight, 5.0))  # clamp between 0.1 and 5.0

    report = HeatmapReport(
        latitude=latitude,
        longitude=longitude,
        description=data.get('description', '').strip() or None,
        weight=weight
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({'status': 'report_submitted', 'report': report.to_dict()}), 201


@heatmap_bp.route('/heatmap/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """DELETE /heatmap/<id> — remove a danger zone report (admin/moderation use)."""
    report = HeatmapReport.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    db.session.delete(report)
    db.session.commit()
    return jsonify({'status': 'report_deleted', 'id': report_id}), 200
