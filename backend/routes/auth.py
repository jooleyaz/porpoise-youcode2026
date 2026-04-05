import os
import jwt
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, redirect
from routes.utils import get_db

auth_bp = Blueprint("auth", __name__)

# NOTE: mainly generated + checked over
# NOTE need to build frontend pages to match the routes!!

# GET /auth/onboard?token=xxx
# volunteer clicks SMS invite link
@auth_bp.route("/onboard", methods=["GET"])
def onboard():
    token = request.args.get("token")
    if not token:
        return jsonify({"error": "Missing token"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT id, name, phone, is_admin, status,
                   magic_link_token, magic_link_expires_at
            FROM users
            WHERE magic_link_token = %s
        """, (token,))
        user = cur.fetchone()

        if not user:
            frontend_url = os.getenv("FRONTEND_URL")
            return redirect(f"{frontend_url}/error?reason=invalid_token")

        if datetime.now(timezone.utc) > user["magic_link_expires_at"]:
            frontend_url = os.getenv("FRONTEND_URL")
            return redirect(f"{frontend_url}/error?reason=expired_token")

        # mark user active, clear magic link token
        cur.execute("""
            UPDATE users
            SET status = 'active',
                magic_link_token = NULL,
                magic_link_expires_at = NULL
            WHERE id = %s
        """, (user["id"],))

        # generate JWT
        jwt_token = jwt.encode({
            "user_id":  str(user["id"]),
            "is_admin": user["is_admin"],
            "exp":      datetime.now(timezone.utc) + timedelta(days=30)
        }, os.getenv("JWT_SECRET"), algorithm="HS256")

        conn.commit()

        # redirect to Next.js onboarding page with JWT
        frontend_url = os.getenv("FRONTEND_URL")
        return redirect(f"{frontend_url}/onboard?jwt={jwt_token}")

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# GET /auth/shift-offer?token=xxx
# volunteer clicks SMS shift offer link
@auth_bp.route("/shift-offer", methods=["GET"])
def shift_offer():
    token = request.args.get("token")
    if not token:
        return jsonify({"error": "Missing token"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                co.id AS outreach_id,
                co.user_id,
                co.status,
                co.token_expires_at
            FROM cover_outreach co
            WHERE co.token = %s
        """, (token,))
        outreach = cur.fetchone()

        frontend_url = os.getenv("FRONTEND_URL")

        if not outreach:
            return redirect(f"{frontend_url}/error?reason=invalid_token")

        if datetime.now(timezone.utc) > outreach["token_expires_at"]:
            return redirect(f"{frontend_url}/shifts/expired")

        if outreach["status"] != "sent":
            return redirect(f"{frontend_url}/shifts/unavailable")

        # redirect to Next.js confirm page — token stays in URL
        # Next.js will call /auth/shift-offer/details to get full info
        return redirect(f"{frontend_url}/shifts/confirm?token={token}")

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /auth/shift-offer/details
# called by Next.js confirm page to get shift info from token
@auth_bp.route("/shift-offer/details", methods=["POST"])
def shift_offer_details():
    data  = request.get_json()
    token = data.get("token")

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT
                co.id AS outreach_id,
                co.user_id,
                co.token_expires_at,
                s.title,
                s.shift_date,
                s.start_time,
                s.end_time,
                r.name AS role_name,
                u.name AS volunteer_name
            FROM cover_outreach co
            JOIN cover_requests cr ON cr.id = co.cover_request_id
            JOIN shift_assignments sa ON sa.id = cr.shift_assignment_id
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            JOIN roles r ON r.id = sp.role_id
            JOIN users u ON u.id = co.user_id
            WHERE co.token = %s
            AND co.status = 'sent'
            AND co.token_expires_at > NOW()
        """, (token,))
        outreach = cur.fetchone()

        if not outreach:
            return jsonify({"error": "Invalid or expired token"}), 404

        return jsonify({
            "outreach_id":    str(outreach["outreach_id"]),
            "volunteer_name": outreach["volunteer_name"],
            "shift_title":    outreach["title"],
            "shift_date":     str(outreach["shift_date"]),
            "start_time":     str(outreach["start_time"]),
            "end_time":       str(outreach["end_time"]),
            "role":           outreach["role_name"],
            "expires_at":     str(outreach["token_expires_at"])
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /auth/validate-token
# called by Next.js after onboard redirect to verify JWT and get user info
@auth_bp.route("/validate-token", methods=["POST"])
def validate_token():
    data  = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=["HS256"])

        conn = get_db()
        cur  = conn.cursor()
        cur.execute("""
            SELECT id, name, phone, is_admin, status
            FROM users WHERE id = %s
        """, (payload["user_id"],))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "user_id":  str(user["id"]),
            "name":     user["name"],
            "phone":    user["phone"],
            "is_admin": user["is_admin"],
            "status":   user["status"]
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401