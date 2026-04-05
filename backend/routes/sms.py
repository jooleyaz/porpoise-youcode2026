from flask import Blueprint, request

sms_bp = Blueprint("sms", __name__)

@sms_bp.route("/reply", methods=["POST"])
def handle_reply():
    # Twilio webhook — fires when volunteer replies to any SMS
    from_number = request.form.get("From")
    body = request.form.get("Body").strip().upper()

    if body == "YES":
        # look up latest pending cover_outreach for this number
        # accept it, cancel others in same batch
        # send confirmation SMS back
        pass
    elif body == "NO":
        # mark their cover_outreach as declined
        # check if anyone else in batch responded
        pass

    return "OK", 200