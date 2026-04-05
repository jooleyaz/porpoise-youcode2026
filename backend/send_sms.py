# Download the helper library from https://www.twilio.com/docs/python/install
import os
import twilio
from twilio.rest import Client
from dotenv import load_dotenv
from enum import Enum

class REASON(Enum):
    INVITE = 'INVITE'
    SCHEDULEREADY = 'SCHEDULEREADY'
    REMINDER = 'REMINDER'
    SHIFTREADY = 'SHIFTREADY'

def send_sms(recipient_number:str, reason:REASON, link:str, orgname:str, shift_date:str=None, shift_time:str=None, shift_role:str=None):
    load_dotenv()

    twilio_sid = os.getenv("TWILIO_SID")
    twilio_authtoken = os.getenv("TWILIO_AUTHTOKEN")
    twilio_phonenumber = os.getenv("TWILIO_PHONENUMBER")

    client = Client(twilio_sid, twilio_authtoken)

    body = ''
    match reason:
        case REASON.INVITE: 
            body = 'You have been invited to join ORG\'s team! Click here to get started. LINK'
        case REASON.SCHEDULEREADY:
            body = 'Your schedule is ready! Click here to confirm that you can make your shifts, or drop them if needed. LINK'
        case REASON.REMINDER:
            body = 'You have a shift tomorrow at ORG at TIME. See you soon! (Click here to drop if you\'re busy: LINK)'.replace('TIME',str(shift_time))
        case REASON.SHIFTREADY:
            body = 'There is a shift available for ROLE at ORG on DATE at TIME. Pick it up here! LINK'.replace('TIME',str(shift_time)).replace('DATE',str(shift_date)).replace('ROLE',str(shift_role))

    body = body.replace('ORG',orgname).replace('LINK', link)
    message = client.messages.create(
        body=body,
        from_=twilio_phonenumber,
        to=recipient_number,
    )

    return message.body

# if __name__ == '__main__':
#     print(send_sms("", REASON.SCHEDULEREADY, "linkylink", "Sprouts"))