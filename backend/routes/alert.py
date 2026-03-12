from flask import Blueprint, jsonify

alert_bp = Blueprint('alert', __name__)

# TODO: Implement POST /alert
# Will use Fast2SMS (sms_service) to send SMS
# and Gemini (gemini_service) to generate the message
