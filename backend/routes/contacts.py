from flask import Blueprint, request, jsonify
from extensions import db
from models import EmergencyContact

contacts_bp = Blueprint('contacts', __name__)


@contacts_bp.route('/contacts', methods=['GET'])
def get_contacts():
    """GET /contacts — list all saved emergency contacts."""
    contacts = EmergencyContact.query.order_by(EmergencyContact.created_at).all()
    return jsonify({'contacts': [c.to_dict() for c in contacts]}), 200


@contacts_bp.route('/contacts', methods=['POST'])
def add_contact():
    """
    POST /contacts — add a new emergency contact.
    Body: {"name": "Mum", "phone": "+918073519575", "relation": "Mother"}
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    relation = data.get('relation', '').strip()

    if not name:
        return jsonify({'error': 'name is required'}), 400
    if not phone:
        return jsonify({'error': 'phone is required'}), 400

    contact = EmergencyContact(name=name, phone=phone, relation=relation or None)
    db.session.add(contact)
    db.session.commit()

    return jsonify({'status': 'contact_added', 'contact': contact.to_dict()}), 201


@contacts_bp.route('/contacts/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    """
    PUT /contacts/<id> — update a contact's details.
    Body: {"name": "Mum", "phone": "+91...", "relation": "Mother"}  // all optional
    """
    contact = EmergencyContact.query.get(contact_id)
    if not contact:
        return jsonify({'error': 'Contact not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body is required'}), 400

    if 'name' in data and data['name'].strip():
        contact.name = data['name'].strip()
    if 'phone' in data and data['phone'].strip():
        contact.phone = data['phone'].strip()
    if 'relation' in data:
        contact.relation = data['relation'].strip() or None

    db.session.commit()
    return jsonify({'status': 'contact_updated', 'contact': contact.to_dict()}), 200


@contacts_bp.route('/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    """DELETE /contacts/<id> — remove an emergency contact."""
    contact = EmergencyContact.query.get(contact_id)
    if not contact:
        return jsonify({'error': 'Contact not found'}), 404

    db.session.delete(contact)
    db.session.commit()
    return jsonify({'status': 'contact_deleted', 'id': contact_id}), 200
