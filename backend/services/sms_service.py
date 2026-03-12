import requests
from config import FAST2SMS_API_KEY

FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2'

def send_sms(phone_numbers: list[str], message: str) -> dict:
    """
    Send an SMS to a list of phone numbers via Fast2SMS.
    phone_numbers: list of 10-digit Indian mobile numbers (no +91)
    message: the SMS body text
    """
    if not FAST2SMS_API_KEY:
        raise ValueError('FAST2SMS_API_KEY is not set in .env')

    recipients = ','.join(phone_numbers)

    payload = {
        'message': message,
        'language': 'english',
        'route': 'q',
        'numbers': recipients,
    }

    headers = {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
    }

    response = requests.post(FAST2SMS_URL, json=payload, headers=headers, timeout=10)
    response.raise_for_status()
    return response.json()
