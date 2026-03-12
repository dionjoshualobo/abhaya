from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# SQLite database — stored as abhaya.db in the backend folder
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///abhaya.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Import models so tables are created
import models

# Register blueprints
from routes.health import health_bp
from routes.alert import alert_bp
from routes.heatmap import heatmap_bp
from routes.anomaly import anomaly_bp

app.register_blueprint(health_bp)
app.register_blueprint(alert_bp)
app.register_blueprint(heatmap_bp)
app.register_blueprint(anomaly_bp)

# Create all tables on startup
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
