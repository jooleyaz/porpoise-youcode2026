from flask import Blueprint, request
import os
import uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from utils import get_db, get_twilio, require_admin
from send_sms import send_sms, REASON

#POSSIBLY NOT NEEDED, IF MAGIC LINKS ARE USED!!!!!!!!!

sms_bp = Blueprint("sms", __name__)

# HELPERS

# generate link for 
def generate_magic_link(cur, user_id, link_type="onboard", expires_hours=48):
    token      = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

    cur.execute("""
        UPDATE users
        SET magic_link_token = %s,
            magic_link_expires_at = %s
        WHERE id = %s
    """, (token, expires_at, user_id))

    base_url = os.getenv("BASE_URL")

    routes = {
        "onboard":            f"{base_url}/auth/onboard?token={token}",
        "shift_offer":        f"{base_url}/auth/shift-offer?token={token}",
        "confirm_assignment": f"{base_url}/auth/confirm-assignment?token={token}",
    }

    return routes[link_type]

def generate_cover_outreach_link(cur, outreach_id, expires_hours=1):
    token      = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=expires_hours)

    cur.execute("""
        UPDATE cover_outreach
        SET token = %s,
            token_expires_at = %s
        WHERE id = %s
    """, (token, expires_at, outreach_id))

    base_url = os.getenv("BASE_URL")
    return f"{base_url}/auth/shift-offer?token={token}"

def send_invite_sms(cur, user_id, name, phone):
    link = generate_magic_link(cur, user_id, link_type="onboard", expires_hours=48)
    body = send_sms(phone, REASON.INVITE, link, "Sprouts",name=name)

    cur.execute("""
        INSERT INTO sms_log (user_id, message_type, body, status)
        VALUES (%s, 'invite', %s, 'sent')
    """, (user_id, body))


def send_shift_offer_sms(cur, outreach_id, user_id, name, phone, shift):
    link = generate_cover_outreach_link(cur, outreach_id, expires_hours=1)
    body = (f"{name} {shift['title']} {shift['shift_date']} at {shift['start_time']} accept {link}") # TODO: ADD SPIEL!

    get_twilio().messages.create(
        to=phone,
        from_=os.getenv("TWILIO_PHONENUMBER"),
        body=body
    )

    cur.execute("""
        INSERT INTO sms_log (user_id, message_type, body, status)
        VALUES (%s, 'shift_offer', %s, 'sent')
    """, (user_id, body))


def send_reminder_sms(phone, name, shift):
    body = (
        f"{name},{shift['title']} {shift['start_time']}" #TODO: ADD SPIEL!!
    )

    get_twilio().messages.create(
        to=phone,
        from_=os.getenv("TWILIO_PHONENUMBER"),
        body=body
    )

# FUNCTIONS

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

# inviting a new volunteer
@sms_bp.route("/send-invite", methods=["POST"])
@require_admin
def send_invite():
    data    = request.get_json()
    user_id = data.get("user_id")

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("SELECT id, name, phone, status FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404
        if user["status"] != "invited":
            return jsonify({"error": "User is already active"}), 409

        send_invite_sms(cur, user["id"], user["name"], user["phone"])

        conn.commit()
        return jsonify({"message": f"Invite sent to {user['phone']}"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# send text confirmation that signed up for shift
@sms_bp.route("/send-confirmation", methods=["POST"])
@require_admin
def send_confirmation():
    data           = request.get_json()
    user_id        = data.get("user_id")
    assignment_id  = data.get("assignment_id")

    conn = get_db()
    cur  = conn.cursor()

    try:
        # get user
        cur.execute("SELECT id, name, phone FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # get shift details via assignment
        cur.execute("""
            SELECT s.title, s.shift_date, s.start_time, s.end_time, r.name AS role_name
            FROM shift_assignments sa
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            JOIN roles r ON r.id = sp.role_id
            WHERE sa.id = %s
        """, (assignment_id,))
        shift = cur.fetchone()
        if not shift:
            return jsonify({"error": "Assignment not found"}), 404

        # generate confirmation magic link
        link = generate_magic_link(cur, user_id, link_type="confirm_assignment", expires_hours=24)

        body = (f"insert text notification here with {user['name']}, title, shiftdate, starttime, rolename, tap to confirm on link")

        get_twilio().messages.create(
            to=user["phone"],
            from_=os.getenv("TWILIO_PHONENUMBER"),
            body=body
        )

        cur.execute("""
            INSERT INTO sms_log (user_id, message_type, body, status)
            VALUES (%s, 'confirmation', %s, 'sent')
        """, (user_id, body))

        conn.commit()
        return jsonify({"message": "Confirmation SMS sent"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# send offer of open shift
@sms_bp.route("/send-shift-offer", methods=["POST"])
@require_admin
def send_shift_offer():
    data             = request.get_json()
    cover_request_id = data.get("cover_request_id")

    conn = get_db()
    cur  = conn.cursor()

    try:
        # get shift details from cover request
        cur.execute("""
            SELECT
                s.title, s.shift_date, s.start_time, s.end_time,
                r.name AS role_name,
                cr.batch_number,
                sp.shift_id
            FROM cover_requests cr
            JOIN shift_assignments sa ON sa.id = cr.shift_assignment_id
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            JOIN roles r ON r.id = sp.role_id
            WHERE cr.id = %s
        """, (cover_request_id,))
        cover = cur.fetchone()
        if not cover:
            return jsonify({"error": "Cover request not found"}), 404

        # get this batch's outreach recipients - TODO MODIFY THIS SO THAT IT GETS BY PRIORITY!!
        cur.execute("""
            SELECT co.id AS outreach_id, co.user_id, u.name, u.phone
            FROM cover_outreach co
            JOIN users u ON u.id = co.user_id
            WHERE co.cover_request_id = %s
            AND co.status = 'sent'
            ORDER BY co.rank_in_batch ASC
        """, (cover_request_id,))
        recipients = cur.fetchall()

        if not recipients:
            return jsonify({"error": "No recipients found for this batch"}), 404

        sent_to = []
        for recipient in recipients:
            send_shift_offer_sms(
                cur,
                outreach_id=recipient["outreach_id"],
                user_id=recipient["user_id"],
                name=recipient["name"],
                phone=recipient["phone"],
                shift=cover
            )
            sent_to.append(recipient["name"])

        conn.commit()
        return jsonify({
            "message": "Shift offer SMS sent",
            "batch":   cover["batch_number"],
            "sent_to": sent_to
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# send reminder; TODO need cron or APscheduler, but might not be able to demo this properly so maynbe dont need to implement
@sms_bp.route("/send-reminder", methods=["POST"])
def send_reminder():
    data          = request.get_json()
    assignment_id = data.get("assignment_id")

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                u.id AS user_id, u.name, u.phone,
                s.title, s.shift_date, s.start_time
            FROM shift_assignments sa
            JOIN users u ON u.id = sa.user_id
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            WHERE sa.id = %s
            AND sa.status = 'confirmed'
        """, (assignment_id,))
        assignment = cur.fetchone()

        if not assignment:
            return jsonify({"error": "Assignment not found"}), 404

        send_reminder_sms(
            phone=assignment["phone"],
            name=assignment["name"],
            shift=assignment
        )

        cur.execute("""
            INSERT INTO sms_log (user_id, message_type, body, status)
            VALUES (%s, 'reminder', %s, 'sent')
        """, (assignment["user_id"], f"Reminder sent for shift on {assignment['shift_date']}"))

        conn.commit()
        return jsonify({"message": "Reminder sent"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()