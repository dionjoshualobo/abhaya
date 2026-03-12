from google import genai
from config import GEMINI_API_KEY

def generate_sos_message(latitude: float, longitude: float, contact_name: str) -> str:
    """
    Generate a simple SOS message: '{name} is in trouble'.
    """
    return f"{contact_name} is in trouble"
