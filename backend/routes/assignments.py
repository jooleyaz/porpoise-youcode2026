import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from routes.utils import get_db, run_cover_engine
from routes.sms import generate_magic_link, send_shift_offer_sms

assignments_bp = Blueprint("assignments", __name__)


# POST /api/assignments
# volunteer accepts an available shift
@assignments_bp.route("/", methods=["POST"])
def accept_shift():
    data              = request.get_json()
    user_id           = data.get("user_id")
    shift_position_id = data.get("shift_position_id")

    if not user_id or not shift_position_id:
        return jsonify({"error": "user_id and shift_position_id are required"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        # check position has room
        cur.execute("""
            SELECT sp.slots_total, sp.slots_filled, sp.shift_id,
                   s.title, s.shift_date, s.start_time
            FROM shift_positions sp
            JOIN shifts s ON s.id = sp.shift_id
            WHERE sp.id = %s AND s.status = 'open'
        """, (shift_position_id,))
        position = cur.fetchone()

        if not position:
            return jsonify({"error": "Position not found or shift is not open"}), 404
        if position["slots_filled"] >= position["slots_total"]:
            return jsonify({"error": "Position is already full"}), 409

        # check not already assigned
        cur.execute("""
            SELECT id FROM shift_assignments
            WHERE shift_position_id = %s AND user_id = %s AND status != 'cancelled'
        """, (shift_position_id, user_id))
        if cur.fetchone():
            return jsonify({"error": "Already assigned to this position"}), 409

        # create assignment
        cur.execute("""
            INSERT INTO shift_assignments (shift_position_id, user_id, status, confirmed_at)
            VALUES (%s, %s, 'confirmed', NOW())
            RETURNING id
        """, (shift_position_id, user_id))
        assignment_id = cur.fetchone()["id"]

        # increment slots_filled
        cur.execute("""
            UPDATE shift_positions SET slots_filled = slots_filled + 1
            WHERE id = %s
        """, (shift_position_id,))

        # mark shift filled if all positions full
        cur.execute("""
            UPDATE shifts SET status = 'filled'
            WHERE id = %s AND NOT EXISTS (
                SELECT 1 FROM shift_positions
                WHERE shift_id = %s AND slots_filled < slots_total
            )
        """, (position["shift_id"], position["shift_id"]))

        # update volunteer hours
        cur.execute("""
            UPDATE users SET total_hours_volunteered = total_hours_volunteered +
                EXTRACT(EPOCH FROM (%s::time - %s::time)) / 3600
            WHERE id = %s
        """, (position["end_time"], position["start_time"], user_id))

        conn.commit()
        return jsonify({
            "message":       "Shift accepted successfully",
            "assignment_id": str(assignment_id)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/assignments/:id/cancel
# volunteer cancels their shift — triggers auto-cover engine
@assignments_bp.route("/<uuid:assignment_id>/cancel", methods=["POST"])
def cancel_assignment(assignment_id):
    data   = request.get_json()
    reason = data.get("reason")

    conn = get_db()
    cur  = conn.cursor()

    try:
        # get assignment + shift details
        cur.execute("""
            SELECT
                sa.id, sa.user_id, sa.shift_position_id,
                sp.shift_id, sp.role_id,
                s.title, s.shift_date, s.start_time, s.end_time
            FROM shift_assignments sa
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            JOIN shifts s ON s.id = sp.shift_id
            WHERE sa.id = %s AND sa.status = 'confirmed'
        """, (str(assignment_id),))
        assignment = cur.fetchone()

        if not assignment:
            return jsonify({"error": "Assignment not found or already cancelled"}), 404

        # cancel assignment
        cur.execute("""
            UPDATE shift_assignments
            SET status = 'cancelled',
                cancelled_at = NOW(),
                cancellation_reason = %s
            WHERE id = %s
        """, (reason, str(assignment_id)))

        # decrement slots_filled
        cur.execute("""
            UPDATE shift_positions SET slots_filled = slots_filled - 1
            WHERE id = %s
        """, (assignment["shift_position_id"],))

        # reopen shift if it was marked filled
        cur.execute("""
            UPDATE shifts SET status = 'open'
            WHERE id = %s AND status = 'filled'
        """, (assignment["shift_id"],))

        # deduct hours from volunteer
        cur.execute("""
            UPDATE users SET total_hours_volunteered = GREATEST(0, total_hours_volunteered -
                EXTRACT(EPOCH FROM (%s::time - %s::time)) / 3600)
            WHERE id = %s
        """, (assignment["end_time"], assignment["start_time"], assignment["user_id"]))

        result = run_cover_engine(
            cur,
            assignment_id=str(assignment_id),
            shift_id=assignment["shift_id"],
            shift_position_id=assignment["shift_position_id"],
            role_id=assignment["role_id"],
            shift_date=assignment["shift_date"],
            start_time=assignment["start_time"],
            end_time=assignment["end_time"],
            excluded_user_id=assignment["user_id"]
        )

        conn.commit()
        return jsonify({
            "message":          "Assignment cancelled, cover outreach started",
            "cover_request_id": result["cover_request_id"],
            "contacted":        result["contacted"]
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/assignments/:id/confirm
# volunteer clicks confirmation link from SMS after admin manually assigns them
@assignments_bp.route("/<uuid:assignment_id>/confirm", methods=["POST"])
def confirm_assignment(assignment_id):
    data  = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        # validate magic link token belongs to the user assigned here
        cur.execute("""
            SELECT u.id, u.name, u.magic_link_token, u.magic_link_expires_at
            FROM users u
            JOIN shift_assignments sa ON sa.user_id = u.id
            WHERE sa.id = %s AND u.magic_link_token = %s
        """, (str(assignment_id), token))
        user = cur.fetchone()

        if not user:
            return jsonify({"error": "Invalid token"}), 404

        if datetime.now(timezone.utc) > user["magic_link_expires_at"]:
            return jsonify({"error": "Token expired"}), 410

        # confirm assignment
        cur.execute("""
            UPDATE shift_assignments
            SET status = 'confirmed', confirmed_at = NOW()
            WHERE id = %s
        """, (str(assignment_id),))

        # clear magic link token
        cur.execute("""
            UPDATE users
            SET magic_link_token = NULL, magic_link_expires_at = NULL
            WHERE id = %s
        """, (user["id"],))

        conn.commit()
        return jsonify({"message": "Shift confirmed successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/assignments/cover
# volunteer accepts a shift offer from the confirm page (via SMS link)
@assignments_bp.route("/cover", methods=["POST"])
def accept_cover():
    data  = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        # find outreach by token
        cur.execute("""
            SELECT
                co.id AS outreach_id,
                co.user_id,
                co.cover_request_id,
                co.status,
                cr.shift_assignment_id,
                sa.shift_position_id
            FROM cover_outreach co
            JOIN cover_requests cr ON cr.id = co.cover_request_id
            JOIN shift_assignments sa ON sa.id = cr.shift_assignment_id
            WHERE co.token = %s
            AND co.status = 'sent'
            AND co.token_expires_at > NOW()
        """, (token,))
        outreach = cur.fetchone()

        if not outreach:
            return jsonify({"error": "Invalid or expired token"}), 404

        # create new assignment for this volunteer
        cur.execute("""
            INSERT INTO shift_assignments (shift_position_id, user_id, status, confirmed_at)
            VALUES (%s, %s, 'confirmed', NOW())
            RETURNING id
        """, (outreach["shift_position_id"], outreach["user_id"]))
        new_assignment_id = cur.fetchone()["id"]

        # increment slots_filled
        cur.execute("""
            UPDATE shift_positions SET slots_filled = slots_filled + 1
            WHERE id = %s
        """, (outreach["shift_position_id"],))

        # mark this outreach as accepted
        cur.execute("""
            UPDATE cover_outreach SET status = 'accepted', responded_at = NOW()
            WHERE id = %s
        """, (outreach["outreach_id"],))

        # expire all others in the same batch
        cur.execute("""
            UPDATE cover_outreach SET status = 'expired'
            WHERE cover_request_id = %s AND id != %s AND status = 'sent'
        """, (outreach["cover_request_id"], outreach["outreach_id"]))

        # mark cover request as filled
        cur.execute("""
            UPDATE cover_requests SET status = 'filled', resolved_at = NOW()
            WHERE id = %s
        """, (outreach["cover_request_id"],))

        conn.commit()
        return jsonify({
            "message":       "Shift accepted successfully",
            "assignment_id": str(new_assignment_id)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/assignments/cover/decline
# volunteer declines a shift offer from the confirm page
@assignments_bp.route("/cover/decline", methods=["POST"])
def decline_cover():
    data  = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT co.id, co.cover_request_id
            FROM cover_outreach co
            WHERE co.token = %s
            AND co.status = 'sent'
            AND co.token_expires_at > NOW()
        """, (token,))
        outreach = cur.fetchone()

        if not outreach:
            return jsonify({"error": "Invalid or expired token"}), 404

        # mark as declined
        cur.execute("""
            UPDATE cover_outreach SET status = 'declined', responded_at = NOW()
            WHERE id = %s
        """, (outreach["id"],))

        conn.commit()
        return jsonify({"message": "Shift declined"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()