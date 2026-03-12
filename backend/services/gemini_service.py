from google import genai
from config import GEMINI_API_KEY

def generate_sos_message(latitude: float, longitude: float, contact_name: str) -> str:
    """
    Use Gemini to generate a concise, urgent SOS SMS message.
    Falls back to a default message if Gemini fails or key is missing.
    """
    try:
        if not GEMINI_API_KEY:
            raise ValueError('GEMINI_API_KEY not set')

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = (
            f"Generate a short, urgent SOS alert SMS (max 160 characters) for a women's safety app. "
            f"The user may be in danger. Their location is latitude {latitude}, longitude {longitude}. "
            f"The message will be sent to their emergency contact named {contact_name}. "
            f"Include the location coordinates. Be direct and urgent. No hashtags or emojis."
        )
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception:
        return (
            f"URGENT: Your contact may be in danger! "
            f"Last known location: {latitude}, {longitude}. "
            f"Please check on them immediately."
        )
