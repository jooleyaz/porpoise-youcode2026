from dotenv import load_dotenv
import os
from flask import Blueprint, request, jsonify
from routes.utils import get_db, require_admin, run_cover_engine
from routes.sms import send_shift_offer_sms

shifts_bp = Blueprint("shifts", __name__)
load_dotenv() 


# NOTE: mainly generated + check over

# GET /api/shifts?date=2026-04-01&status=open
@shifts_bp.route("/", methods=["GET"])
def list_shifts():
    date   = request.args.get("date")
    status = request.args.get("status")

    conn = get_db()
    cur  = conn.cursor()

    try:
        user_id = request.args.get("user_id")

        query = """
            SELECT
                s.id, s.title,
                s.shift_date::text  AS shift_date,
                s.start_time::text  AS start_time,
                s.end_time::text    AS end_time,
                s.is_recurring, s.status, s.created_at::text,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'position_id',  sp.id,
                            'role_id',      sp.role_id,
                            'role_name',    r.name,
                            'slots_total',  sp.slots_total,
                            'slots_filled', sp.slots_filled,
                            'assignments',  COALESCE((
                                SELECT json_agg(json_build_object(
                                    'assignment_id', sa.id,
                                    'user_id',       sa.user_id,
                                    'status',        sa.status
                                ))
                                FROM shift_assignments sa
                                WHERE sa.shift_position_id = sp.id
                                AND sa.status != 'cancelled'
                            ), '[]'::json)
                        )
                    ) FILTER (WHERE sp.id IS NOT NULL), '[]'
                ) AS positions
            FROM shifts s
            LEFT JOIN shift_positions sp ON sp.shift_id = s.id
            LEFT JOIN roles r ON r.id = sp.role_id
            WHERE 1=1
        """
        params = []

        if date:
            query += " AND s.shift_date = %s"
            params.append(date)
        if status:
            query += " AND s.status = %s"
            params.append(status)
        if user_id:
            query += """
                AND s.id IN (
                    SELECT sp2.shift_id FROM shift_assignments sa2
                    JOIN shift_positions sp2 ON sp2.id = sa2.shift_position_id
                    WHERE sa2.user_id = %s AND sa2.status != 'cancelled'
                )
            """
            params.append(user_id)

        query += " GROUP BY s.id ORDER BY s.shift_date ASC, s.start_time ASC"

        cur.execute(query, params)
        shifts = cur.fetchall()
        return jsonify([dict(s) for s in shifts]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# GET /api/shifts/:id
@shifts_bp.route("/<uuid:shift_id>", methods=["GET"])
def get_shift(shift_id):
    conn = get_db()
    cur  = conn.cursor()

    try:
        # get shift
        cur.execute("""
            SELECT id, title,
                   shift_date::text, start_time::text, end_time::text,
                   is_recurring, recurrence_rule, status, created_at::text
            FROM shifts
            WHERE id = %s
        """, (str(shift_id),))
        shift = cur.fetchone()

        if not shift:
            return jsonify({"error": "Shift not found"}), 404

        # get positions + assigned users per position
        cur.execute("""
            SELECT
                sp.id AS position_id,
                r.name AS role_name,
                sp.slots_total,
                sp.slots_filled,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'assignment_id', sa.id,
                            'user_id',       u.id,
                            'name',          u.name,
                            'phone',         u.phone,
                            'status',        sa.status
                        )
                    ) FILTER (WHERE sa.id IS NOT NULL), '[]'
                ) AS assigned_users
            FROM shift_positions sp
            JOIN roles r ON r.id = sp.role_id
            LEFT JOIN shift_assignments sa ON sa.shift_position_id = sp.id
                AND sa.status != 'cancelled'
            LEFT JOIN users u ON u.id = sa.user_id
            WHERE sp.shift_id = %s
            GROUP BY sp.id, r.name
        """, (str(shift_id),))
        positions = cur.fetchall()

        result = dict(shift)
        result["positions"] = [dict(p) for p in positions]
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/shifts
@shifts_bp.route("/", methods=["POST"])
def create_shift():
    data = request.get_json()
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            INSERT INTO shifts (title, shift_date, start_time, end_time,
                                is_recurring, recurrence_rule, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'open')
            RETURNING id
        """, (
            data["title"],
            data["shift_date"],
            data["start_time"],
            data["end_time"],
            data.get("is_recurring", False),
            data.get("recurrence_rule")
        ))
        shift_id = cur.fetchone()["id"]

        # insert positions
        for position in data.get("positions", []):
            cur.execute("""
                INSERT INTO shift_positions (shift_id, role_id, slots_total)
                VALUES (%s, %s, %s)
            """, (shift_id, position["role_id"], position["slots_total"]))

        conn.commit()
        return jsonify({"message": "Shift created", "shift_id": str(shift_id)}), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# PATCH /api/shifts/:id
@shifts_bp.route("/<uuid:shift_id>", methods=["PATCH"])
def update_shift(shift_id):
    data = request.get_json()
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            UPDATE shifts SET
                title           = COALESCE(%s, title),
                shift_date      = COALESCE(%s, shift_date),
                start_time      = COALESCE(%s, start_time),
                end_time        = COALESCE(%s, end_time),
                is_recurring    = COALESCE(%s, is_recurring),
                recurrence_rule = COALESCE(%s, recurrence_rule),
                status          = COALESCE(%s, status)
            WHERE id = %s
        """, (
            data.get("title"),
            data.get("shift_date"),
            data.get("start_time"),
            data.get("end_time"),
            data.get("is_recurring"),
            data.get("recurrence_rule"),
            data.get("status"),
            str(shift_id)
        ))
        conn.commit()
        return jsonify({"message": "Shift updated"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# DELETE /api/shifts/:id
@shifts_bp.route("/<uuid:shift_id>", methods=["DELETE"])
def cancel_shift(shift_id):
    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            UPDATE shifts SET status = 'cancelled' WHERE id = %s
        """, (str(shift_id),))
        conn.commit()
        return jsonify({"message": "Shift cancelled"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/shifts/:id/assign
@shifts_bp.route("/<uuid:shift_id>/assign", methods=["POST"])
def manually_assign(shift_id):
    data              = request.get_json()
    user_id           = data.get("user_id")
    shift_position_id = data.get("shift_position_id")
    send_sms          = data.get("send_confirmation_sms", False)

    conn = get_db()
    cur  = conn.cursor()

    try:
        # check position exists and has room
        cur.execute("""
            SELECT slots_total, slots_filled FROM shift_positions
            WHERE id = %s AND shift_id = %s
        """, (shift_position_id, str(shift_id)))
        position = cur.fetchone()

        if not position:
            return jsonify({"error": "Position not found"}), 404
        if position["slots_filled"] >= position["slots_total"]:
            return jsonify({"error": "Position is already full"}), 409

        # create assignment
        cur.execute("""
            INSERT INTO shift_assignments (shift_position_id, user_id, status)
            VALUES (%s, %s, 'confirmed')
            RETURNING id
        """, (shift_position_id, user_id))
        assignment_id = cur.fetchone()["id"]

        # update slots_filled
        cur.execute("""
            UPDATE shift_positions SET slots_filled = slots_filled + 1
            WHERE id = %s
        """, (shift_position_id,))

        # check if shift is now fully filled
        cur.execute("""
            UPDATE shifts SET status = 'filled'
            WHERE id = %s AND NOT EXISTS (
                SELECT 1 FROM shift_positions
                WHERE shift_id = %s AND slots_filled < slots_total
            )
        """, (str(shift_id), str(shift_id)))

        conn.commit()

        # optionally send confirmation SMS
        if send_sms:
            from routes.sms import send_confirmation_sms
            send_confirmation_sms(cur, user_id, str(assignment_id))

        return jsonify({
            "message":       "User assigned successfully",
            "assignment_id": str(assignment_id)
        }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# POST /api/shifts/:id/coverage
@shifts_bp.route("/<uuid:shift_id>/coverage", methods=["POST"])
def trigger_coverage(shift_id):
    data              = request.get_json()
    shift_position_id = data.get("shift_position_id")

    conn = get_db()
    cur  = conn.cursor()

    try:
        # get shift details for urgency check
        cur.execute("""
            SELECT shift_date, start_time FROM shifts WHERE id = %s
        """, (str(shift_id),))
        shift = cur.fetchone()
        if not shift:
            return jsonify({"error": "Shift not found"}), 404

        # look up the role for this position
        cur.execute("SELECT role_id, end_time FROM shift_positions WHERE id = %s AND shift_id = %s",
                    (shift_position_id, str(shift_id)))
        position = cur.fetchone()
        if not position:
            return jsonify({"error": "Position not found"}), 404

        result = run_cover_engine(
            cur,
            assignment_id=None,  # admin-triggered, no specific cancelled assignment
            shift_id=str(shift_id),
            shift_position_id=shift_position_id,
            role_id=str(position["role_id"]),
            shift_date=shift["shift_date"],
            start_time=shift["start_time"],
            end_time=position["end_time"],
            excluded_user_id=None
        )

        conn.commit()
        return jsonify({
            "message":          "Coverage outreach started",
            "cover_request_id": result["cover_request_id"],
            "contacted":        result["contacted"],
            "timer_hours":      result["timer_hours"]
        }), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# GET /api/shifts/available?user_id=xxx
@shifts_bp.route("/available", methods=["GET"])
def available_shifts():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    conn = get_db()
    cur  = conn.cursor()

    try:
        cur.execute("""
            SELECT DISTINCT
                s.id, s.title, s.shift_date, s.start_time, s.end_time, s.status,
                sp.id AS position_id,
                r.name AS role_name,
                sp.slots_total, sp.slots_filled
            FROM shifts s
            JOIN shift_positions sp ON sp.shift_id = s.id
            JOIN roles r ON r.id = sp.role_id
            -- volunteer has this qualification
            JOIN user_roles ur ON ur.role_id = sp.role_id AND ur.user_id = %s
            -- volunteer is available on this day/time (recurring)
            JOIN availability_recurring ar ON ar.user_id = %s
                AND ar.day_of_week = EXTRACT(DOW FROM s.shift_date)
                AND ar.start_time <= s.start_time
                AND ar.end_time   >= s.end_time
            WHERE s.status = 'open'
            AND s.shift_date >= CURRENT_DATE
            AND sp.slots_filled < sp.slots_total
            -- not already assigned
            AND s.id NOT IN (
                SELECT sp2.shift_id FROM shift_assignments sa
                JOIN shift_positions sp2 ON sp2.id = sa.shift_position_id
                WHERE sa.user_id = %s AND sa.status != 'cancelled'
            )
            -- no override blocking this date
            AND s.shift_date NOT IN (
                SELECT override_date FROM availability_overrides
                WHERE user_id = %s AND is_available = FALSE
            )
            ORDER BY s.shift_date ASC, s.start_time ASC
        """, (user_id, user_id, user_id, user_id))

        shifts = cur.fetchall()
        return jsonify([dict(s) for s in shifts]), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()