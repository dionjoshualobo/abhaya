from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Register blueprints
from routes.health import health_bp
app.register_blueprint(health_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
