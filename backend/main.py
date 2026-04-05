import os
from flask import Flask, request
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

ALLOWED_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://porpoise-youcode2026.vercel.app",
    os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/"),
}

@app.after_request
def add_cors(response):
    origin = request.headers.get("Origin", "")
    if origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-Id, ngrok-skip-browser-warning"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
    return response

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        from flask import Response
        r = Response()
        origin = request.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            r.headers["Access-Control-Allow-Origin"] = origin
        r.headers["Access-Control-Allow-Headers"] = "Content-Type, X-User-Id, ngrok-skip-browser-warning"
        r.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        return r

from routes.users import volunteers_bp
from routes.shifts import shifts_bp
from routes.assignments import assignments_bp
from routes.sms import sms_bp
from routes.auth import auth_bp

app.register_blueprint(volunteers_bp, url_prefix="/api/volunteers")
app.register_blueprint(shifts_bp, url_prefix="/api/shifts")
app.register_blueprint(assignments_bp, url_prefix="/api/assignments")
app.register_blueprint(sms_bp, url_prefix="/sms")
app.register_blueprint(auth_bp, url_prefix="/auth")

if __name__ == "__main__":
    app.run(debug=True, port=5000)