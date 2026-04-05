from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

# HELPERS

# connect to database
def get_db():
    return psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=RealDictCursor)

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

# VOLUNTEERS (users) FUNCTIONS

volunteers_bp = Blueprint("volunteers", __name__)

@volunteers_bp.route("/", methods=["GET"])
def list_volunteers():
    # GET /api/volunteers — admin: list all volunteers
    pass

@volunteers_bp.route("/<uuid:user_id>", methods=["GET"])
def get_volunteer(user_id):
    # GET /api/volunteers/:id — get single volunteer + their roles
    pass

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

        # 7. send SMS via Twilio
        twilio_client = Client(
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        )
        twilio_client.messages.create(
            to   = phone,
            from_= os.getenv("TWILIO_PHONE_NUMBER"),
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
def update_volunteer(user_id):
    # PATCH /api/volunteers/:id — update name, phone, roles
    pass

@volunteers_bp.route("/<uuid:user_id>/availability", methods=["GET"])
def get_availability(user_id):
    # GET /api/volunteers/:id/availability
    pass

@volunteers_bp.route("/<uuid:user_id>/availability", methods=["POST"])
def set_availability(user_id):
    # POST /api/volunteers/:id/availability
    # body: { recurring: [...], overrides: [...] }
    pass