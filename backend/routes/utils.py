import psycopg2
from psycopg2.extras import RealDictCursor
from twilio.rest import Client

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