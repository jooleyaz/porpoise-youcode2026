# Download the helper library from https://www.twilio.com/docs/python/install
import os
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

twilio_sid = os.getenv("TWILIO_SID")
twilio_authtoken = os.getenv("TWILIO_AUTHTOKEN")
twilio_phonenumber = os.getenv("TWILIO_PHONENUMBER")

client = Client(twilio_sid, twilio_authtoken)

message = client.messages.create(
    body="Join Earth's mightiest heroes. Like Kevin Bacon.",
    from_="+15017122661",
    to="+15558675310",
)

print(message.body)