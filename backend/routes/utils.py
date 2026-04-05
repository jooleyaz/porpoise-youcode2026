from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from twilio.rest import Client
from functools import wraps
from flask import request, jsonify
import os

load_dotenv() 

# connect to database
def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)

#getting twilio
def get_twilio():
    return Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))

# check admin or not: put decorator before function if needs to be admin to run
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # replace this with your real session/token check
        user_id = request.headers.get("X-User-Id")
        if not user_id:
            return jsonify({"error": "Unauthorized"}), 401

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        cur.close()
        conn.close()

        if not user or not user["is_admin"]:
            return jsonify({"error": "Forbidden"}), 403
        return f(*args, **kwargs)
    return decorated

#find eligible volunteers + send batch outreach!
def run_cover_engine(cur, assignment_id, shift_id, shift_position_id, role_id, shift_date, start_time, end_time, excluded_user_id):
    from routes.sms import send_shift_offer_sms
    from datetime import datetime, timezone, timedelta

    # determine timer
    shift_dt    = datetime.combine(shift_date, start_time)
    shift_dt    = shift_dt.replace(tzinfo=timezone.utc)
    hours_away  = (shift_dt - datetime.now(timezone.utc)).total_seconds() / 3600
    timer_hours = 0.25 if hours_away < 12 else 1

    # create cover request
    cur.execute("""
        INSERT INTO cover_requests (shift_assignment_id, status, batch_number, timer_expires_at)
        VALUES (%s, 'searching', 1, %s)
        RETURNING id
    """, (assignment_id, datetime.now(timezone.utc) + timedelta(hours=timer_hours)))
    cover_request_id = cur.fetchone()["id"]

    # find top 5 eligible volunteers
    cur.execute("""
        SELECT DISTINCT u.id, u.name, u.phone,
               ROW_NUMBER() OVER (
                   ORDER BY u.total_hours_volunteered ASC,
                            u.last_sms_sent_at ASC NULLS FIRST
               ) AS rank
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id AND ur.role_id = %s
        JOIN availability_recurring ar ON ar.user_id = u.id
            AND ar.day_of_week = EXTRACT(DOW FROM %s::date)
            AND ar.start_time <= %s
            AND ar.end_time   >= %s
        WHERE u.status = 'active'
        AND u.is_admin = FALSE
        AND u.id != %s
        AND u.id NOT IN (
            SELECT sa.user_id FROM shift_assignments sa
            JOIN shift_positions sp ON sp.id = sa.shift_position_id
            WHERE sp.shift_id = %s AND sa.status != 'cancelled'
        )
        AND u.id NOT IN (
            SELECT user_id FROM availability_overrides
            WHERE override_date = %s AND is_available = FALSE
        )
        AND (u.last_sms_sent_at IS NULL OR
             u.last_sms_sent_at < NOW() - INTERVAL '7 days')
        LIMIT 5
    """, (role_id, shift_date, start_time, end_time, excluded_user_id, shift_id, shift_date))
    eligible = cur.fetchall()

    shift_dict = {
        "title":      None,  # caller should pass full shift dict if needed for SMS
        "shift_date": shift_date,
        "start_time": start_time,
        "end_time":   end_time
    }

    for volunteer in eligible:
        cur.execute("""
            INSERT INTO cover_outreach (cover_request_id, user_id, rank_in_batch, status)
            VALUES (%s, %s, %s, 'sent')
            RETURNING id
        """, (cover_request_id, volunteer["id"], volunteer["rank"]))
        outreach_id = cur.fetchone()["id"]

        send_shift_offer_sms(
            cur,
            outreach_id=outreach_id,
            user_id=volunteer["id"],
            name=volunteer["name"],
            phone=volunteer["phone"],
            shift=shift_dict
        )

        cur.execute("UPDATE users SET last_sms_sent_at = NOW() WHERE id = %s", (volunteer["id"],))

    return {
        "cover_request_id": str(cover_request_id),
        "contacted":        [v["name"] for v in eligible],
        "timer_hours":      timer_hours
    }