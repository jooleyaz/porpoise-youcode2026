from flask import Blueprint, request, jsonify

assignments_bp = Blueprint("assignments", __name__)

@assignments_bp.route("/", methods=["POST"])
def accept_shift():
    # POST /api/assignments
    # Volunteer accepts an available shift
    # body: { user_id, shift_position_id }
    # creates shift_assignment row, updates slots_filled
    pass

@assignments_bp.route("/<uuid:assignment_id>/cancel", methods=["POST"])
def cancel_assignment(assignment_id):
    # POST /api/assignments/:id/cancel
    # Volunteer cancels their shift
    # triggers auto-cover engine automatically
    pass

@assignments_bp.route("/<uuid:assignment_id>/confirm", methods=["POST"])
def confirm_assignment(assignment_id):
    # POST /api/assignments/:id/confirm
    # Used when admin manually assigns and requests confirmation via SMS
    # Volunteer clicks link in SMS → lands here
    pass