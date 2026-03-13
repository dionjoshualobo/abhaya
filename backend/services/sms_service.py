from twilio.rest import Client
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

def send_sms(phone_numbers: list[str], message: str) -> dict:
    """
    Send an SMS to a list of phone numbers via Twilio.
    phone_numbers: list of numbers in E.164 format e.g. '+918073519575'
    message: the SMS body text
    """
    if not all([TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER]):
        raise ValueError('Twilio credentials are not set in .env')

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    results = []

    for number in phone_numbers:
        msg = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=number
        )
        results.append({'to': number, 'sid': msg.sid, 'status': msg.status})

    return {'sent': results}
