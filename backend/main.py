from flask import Flask
from dotenv import load_dotenv
load_dotenv()
from routes.users import volunteers_bp
from routes.shifts import shifts_bp
from routes.assignments import assignments_bp
from routes.sms import sms_bp
from routes.auth import auth_bp

app = Flask(__name__)

app.register_blueprint(volunteers_bp, url_prefix="/api/volunteers")
app.register_blueprint(shifts_bp, url_prefix="/api/shifts")
app.register_blueprint(assignments_bp, url_prefix="/api/assignments")
app.register_blueprint(sms_bp, url_prefix="/sms")
app.register_blueprint(auth_bp, url_prefix="/auth")

if __name__ == "__main__":
    app.run(debug=True, port=5000)