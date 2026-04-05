from flask import Blueprint, request, jsonify
from utils import get_db, require_admin, get_twilio
import os
import uuid
from datetime import datetime, timedelta, timezone

# VOLUNTEERS (users) FUNCTIONS

volunteers_bp = Blueprint("volunteers", __name__)

@volunteers_bp.route("/", methods=["GET"])
@require_admin
def list_volunteers():
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT 
                u.id, u.name, u.phone, u.email, u.status,
                u.is_admin, u.total_hours_volunteered, u.created_at,
                COALESCE(
                    json_agg(
                        json_build_object('id', r.id, 'name', r.name)
                    ) FILTER (WHERE r.id IS NOT NULL), '[]'
                ) AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        """)
        volunteers = cur.fetchall()
        return jsonify([dict(v) for v in volunteers]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@volunteers_bp.route("/<uuid:user_id>", methods=["GET"])
@require_admin
def get_volunteer(user_id):
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                u.id, u.name, u.phone, u.email, u.status,
                u.is_admin, u.total_hours_volunteered, u.created_at,
                COALESCE(
                    json_agg(
                        json_build_object('id', r.id, 'name', r.name)
                    ) FILTER (WHERE r.id IS NOT NULL), '[]'
                ) AS roles
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.id = %s
            GROUP BY u.id
        """, (str(user_id),))
        volunteer = cur.fetchone()

        if not volunteer:
            return jsonify({"error": "Volunteer not found"}), 404

        return jsonify(dict(volunteer)), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

@volunteers_bp.route("/invite", methods=["POST"])
@require_admin
def invite_volunteer():
    # POST /api/volunteers/invite
    # body: { name, phone, role_ids[] }
    # 1. creates user row with status='invited'
    # 2. generates magic_link_token
    # 3. sends SMS via Twilio with link: https://yourngrok.io/auth/onboard?token=xxx

    data = request.get_json()

    # 1. validate input
    name      = data.get("name", "").strip()
    phone     = data.get("phone", "").strip()
    role_ids  = data.get("role_ids", [])

    if not name or not phone:
        return jsonify({"error": "name and phone are required"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        # 2. check phone not already registered
        cur.execute("SELECT id FROM users WHERE phone = %s", (phone,))
        if cur.fetchone():
            return jsonify({"error": "A user with this phone number already exists"}), 409

        # 3. generate magic link token (expires in 48 hours)
        token      = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

        # 4. insert user
        cur.execute("""
            INSERT INTO users (name, phone, status, is_admin, magic_link_token, magic_link_expires_at)
            VALUES (%s, %s, 'invited', FALSE, %s, %s)
            RETURNING id
        """, (name, phone, token, expires_at))
        user_id = cur.fetchone()["id"]

        # 5. assign roles
        for role_id in role_ids:
            cur.execute("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
            """, (user_id, role_id))

        # 6. build invite link
        base_url    = os.getenv("BASE_URL")
        invite_link = f"{base_url}/auth/onboard?token={token}"

        get_twilio().messages.create(
            to   = phone,
            from_= os.getenv("TWILIO_PHONENUMBER"),
            body = f"Hi {name}, you've been invited to join the volunteer schedule. Set up your account here: {invite_link}"
        )

        # 8. log the SMS
        cur.execute("""
            INSERT INTO sms_log (user_id, message_type, body, status)
            VALUES (%s, 'invite', %s, 'sent')
        """, (user_id, f"Invite sent to {phone}"))

        conn.commit()

        return jsonify({
            "message": "Volunteer invited successfully",
            "user_id": str(user_id),
            "invite_link": invite_link  # return this so admin can copy it if needed
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

@volunteers_bp.route("/<uuid:user_id>", methods=["PATCH"])
@require_admin
def update_volunteer(user_id):
    data = request.get_json()
    conn = get_db()
    cur  = conn.cursor()

    try:
        # update basic fields if provided
        if any(k in data for k in ["name", "phone", "email", "status"]):
            cur.execute("""
                UPDATE users
                SET
                    name   = COALESCE(%s, name),
                    phone  = COALESCE(%s, phone),
                    email  = COALESCE(%s, email),
                    status = COALESCE(%s, status)
                WHERE id = %s
            """, (
                data.get("name"),
                data.get("phone"),
                data.get("email"),
                data.get("status"),
                str(user_id)
            ))

        # replace roles if provided
        if "role_ids" in data:
            cur.execute("DELETE FROM user_roles WHERE user_id = %s", (str(user_id),))
            for role_id in data["role_ids"]:
                cur.execute("""
                    INSERT INTO user_roles (user_id, role_id)
                    VALUES (%s, %s)
                    ON CONFLICT DO NOTHING
                """, (str(user_id), role_id))

        conn.commit()
        return jsonify({"message": "Volunteer updated"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
    
@volunteers_bp.route("/<uuid:user_id>/availability", methods=["GET"])
def get_availability(user_id):
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT id, day_of_week, start_time, end_time
            FROM availability_recurring
            WHERE user_id = %s
            ORDER BY day_of_week, start_time
        """, (str(user_id),))
        recurring = cur.fetchall()

        cur.execute("""
            SELECT id, override_date, is_available, start_time, end_time, note
            FROM availability_overrides
            WHERE user_id = %s
            ORDER BY override_date
        """, (str(user_id),))
        overrides = cur.fetchall()

        return jsonify({
            "recurring":  [dict(r) for r in recurring],
            "overrides":  [dict(o) for o in overrides]
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()

# TODO: check identity of user updating based on jwt, if want extra security (no need for hackathon though)
@volunteers_bp.route("/<uuid:user_id>/availability", methods=["POST"])
def set_availability(user_id):
    data = request.get_json()
    conn = get_db()
    cur  = conn.cursor()

    try:
        # replace recurring availability
        if "recurring" in data:
            cur.execute("DELETE FROM availability_recurring WHERE user_id = %s", (str(user_id),))
            for slot in data["recurring"]:
                cur.execute("""
                    INSERT INTO availability_recurring (user_id, day_of_week, start_time, end_time)
                    VALUES (%s, %s, %s, %s)
                """, (
                    str(user_id),
                    slot["day_of_week"],
                    slot["start_time"],
                    slot["end_time"]
                ))

        # upsert overrides
        if "overrides" in data:
            for override in data["overrides"]:
                cur.execute("""
                    INSERT INTO availability_overrides 
                        (user_id, override_date, is_available, start_time, end_time, note)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, override_date) DO UPDATE SET
                        is_available = EXCLUDED.is_available,
                        start_time   = EXCLUDED.start_time,
                        end_time     = EXCLUDED.end_time,
                        note         = EXCLUDED.note
                """, (
                    str(user_id),
                    override["override_date"],
                    override.get("is_available", True),
                    override.get("start_time"),
                    override.get("end_time"),
                    override.get("note")
                ))

        conn.commit()
        return jsonify({"message": "Availability updated"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()