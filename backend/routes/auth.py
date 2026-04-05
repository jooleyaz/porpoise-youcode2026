from flask import Blueprint, request, jsonify, redirect

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/onboard", methods=["GET"])
def onboard():
    # GET /auth/onboard?token=xxx
    # Volunteer clicks SMS invite link
    # 1. validates magic_link_token + expiry
    # 2. marks user as active
    # 3. redirects to Next.js onboarding page
    token = request.args.get("token")
    # validate token...
    return redirect(f"http://localhost:3000/onboard?token={token}")

@auth_bp.route("/shift-offer", methods=["GET"])
def shift_offer():
    # GET /auth/shift-offer?token=xxx
    # Volunteer clicks SMS shift offer link
    # 1. validates token
    # 2. redirects to Next.js shift confirmation page
    token = request.args.get("token")
    return redirect(f"http://localhost:3000/shifts/confirm?token={token}")

@auth_bp.route("/validate-token", methods=["POST"])
def validate_token():
    # POST /auth/validate-token
    # Called by Next.js after redirect to verify the token is valid
    # Returns user info so frontend can set session
    # body: { token }
    pass