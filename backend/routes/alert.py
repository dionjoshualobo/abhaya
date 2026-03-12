from flask import Blueprint, jsonify

alert_bp = Blueprint('alert', __name__)

# TODO: Implement POST /alert
# Will use Twilio to send SMS and Gemini to generate the message
