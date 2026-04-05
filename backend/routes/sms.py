from dotenv import load_dotenv
from flask import Blueprint, request
import os
import uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from routes.utils import get_db, get_twilio, require_admin
from routes.send_sms import send_sms, REASON

#POSSIBLY NOT NEEDED, IF MAGIC LINKS ARE USED!!!!!!!!!

sms_bp = Blueprint("sms", __name__)
load_dotenv() 

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
    body = send_sms(
        phone,
        REASON.SHIFTREADY,
        link,
        "Sprouts",
        shift_date=shift['shift_date'],
        shift_time=shift['start_time'],
        shift_role=shift['title'],
        name=name)

    cur.execute("""
        INSERT INTO sms_log (user_id, message_type, body, status)
        VALUES (%s, 'shift_offer', %s, 'sent')
    """, (user_id, body))


def send_confirmation_sms(cur, user_id, assignment_id):
    """Helper called by manually_assign to text a volunteer their confirmation."""
    cur.execute("SELECT id, name, phone FROM users WHERE id = %s", (user_id,))
    user = cur.fetchone()
    if not user:
        return

    cur.execute("""
        SELECT s.shift_date, s.start_time, r.name AS title
        FROM shift_assignments sa
        JOIN shift_positions sp ON sp.id = sa.shift_position_id
        JOIN shifts s ON s.id = sp.shift_id
        JOIN roles r ON r.id = sp.role_id
        WHERE sa.id = %s
    """, (assignment_id,))
    shift = cur.fetchone()
    if not shift:
        return

    link = generate_magic_link(cur, user_id, link_type="confirm_assignment", expires_hours=24)
    body = send_sms(
        user["phone"],
        REASON.REMINDER,
        link,
        "Sprouts",
        shift_date=shift["shift_date"],
        shift_time=shift["start_time"],
        shift_role=shift["title"],
        name=user["name"],
    )
    cur.execute("""
        INSERT INTO sms_log (user_id, message_type, body, status)
        VALUES (%s, 'confirmation', %s, 'sent')
    """, (user_id, body))


def send_reminder_sms(phone, name, shift):
    # Link generation for reminders not yet implemented — skip SMS silently
    # TODO: generate a dashboard link once static URLs are established
    pass

# FUNCTIONS

@sms_bp.route("/reply", methods=["POST"])
def handle_reply():
    # Twilio webhook — fires when a volunteer replies to any SMS
    from_number = request.form.get("From", "").strip()
    body        = request.form.get("Body", "").strip().upper()

    if not from_number:
        return "OK", 200

    conn = get_db()
    cur  = conn.cursor()

    try:
        # look up the user by phone number
        cur.execute("SELECT id, name, phone FROM users WHERE phone = %s", (from_number,))
        user = cur.fetchone()
        if not user:
            return "OK", 200

        # find the most recent pending cover_outreach for this user
        cur.execute("""
            SELECT
                co.id AS outreach_id,
                co.cover_request_id,
                co.token,
                cr.shift_assignment_id,
                sa.shift_position_id,
                s.shift_date, s.start_time, r.name AS role_name
            FROM cover_outreach co
            JOIN cover_requests cr ON cr.id = co.cover_request_id
            JOIN shift_assignments sa ON sa.id = cr.shift_assignment_id
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            JOIN roles r ON r.id = sp.role_id
            WHERE co.user_id = %s
            AND co.status = 'sent'
            AND co.token_expires_at > NOW()
            ORDER BY co.sent_at DESC
            LIMIT 1
        """, (user["id"],))
        outreach = cur.fetchone()

        if not outreach:
            # no active offer — politely ignore
            return "OK", 200

        if body in ("YES", "Y"):
            # accept: create assignment, fill slot, expire other outreach in batch
            cur.execute("""
                INSERT INTO shift_assignments (shift_position_id, user_id, status, confirmed_at)
                VALUES (%s, %s, 'confirmed', NOW())
                ON CONFLICT (shift_position_id, user_id) DO UPDATE SET status = 'confirmed', confirmed_at = NOW()
                RETURNING id
            """, (outreach["shift_position_id"], user["id"]))
            new_assignment_id = cur.fetchone()["id"]

            cur.execute("UPDATE shift_positions SET slots_filled = slots_filled + 1 WHERE id = %s",
                        (outreach["shift_position_id"],))

            cur.execute("UPDATE cover_outreach SET status = 'accepted', responded_at = NOW() WHERE id = %s",
                        (outreach["outreach_id"],))

            cur.execute("""
                UPDATE cover_outreach SET status = 'expired'
                WHERE cover_request_id = %s AND id != %s AND status = 'sent'
            """, (outreach["cover_request_id"], outreach["outreach_id"]))

            cur.execute("""
                UPDATE cover_requests SET status = 'filled', resolved_at = NOW()
                WHERE id = %s
            """, (outreach["cover_request_id"],))

            # send confirmation back
            confirm_body = (
                f"You're confirmed for {outreach['role_name']} at Sprouts on "
                f"{outreach['shift_date']} at {str(outreach['start_time'])[:5]}. "
                f"Thank you!"
            )
            get_twilio().messages.create(
                to=user["phone"],
                from_=os.getenv("TWILIO_PHONENUMBER"),
                body=confirm_body,
            )
            cur.execute("""
                INSERT INTO sms_log (user_id, message_type, body, status)
                VALUES (%s, 'confirmation', %s, 'sent')
            """, (user["id"], confirm_body))

        elif body in ("NO", "N"):
            cur.execute("UPDATE cover_outreach SET status = 'declined', responded_at = NOW() WHERE id = %s",
                        (outreach["outreach_id"],))

        conn.commit()

    except Exception:
        conn.rollback()
    finally:
        cur.close()
        conn.close()

    return "OK", 200

# inviting a new volunteer
@sms_bp.route("/send-invite", methods=["POST"])
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

        body = send_sms(
            user["phone"],
            REASON.REMINDER,
            link,
            "Sprouts",
            shift_date=str(shift["shift_date"]),
            shift_time=str(shift["start_time"]),
            shift_role=shift["role_name"],
            name=user["name"],
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