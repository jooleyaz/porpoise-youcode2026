from flask import Blueprint, request, jsonify

shifts_bp = Blueprint("shifts", __name__)

@shifts_bp.route("/", methods=["GET"])
def list_shifts():
    # GET /api/shifts — list all shifts with fill status
    # query params: ?date=2026-04-01 &status=open
    pass

@shifts_bp.route("/<uuid:shift_id>", methods=["GET"])
def get_shift(shift_id):
    # GET /api/shifts/:id — shift detail + positions + assigned users
    pass

@shifts_bp.route("/", methods=["POST"])
def create_shift():
    # POST /api/shifts
    # body: { title, shift_date, start_time, end_time,
    #         is_recurring, recurrence_rule,
    #         positions: [{ role_id, slots_total }] }
    pass

@shifts_bp.route("/<uuid:shift_id>", methods=["PATCH"])
def update_shift(shift_id):
    # PATCH /api/shifts/:id
    pass

@shifts_bp.route("/<uuid:shift_id>", methods=["DELETE"])
def cancel_shift(shift_id):
    # DELETE /api/shifts/:id — sets status to 'cancelled'
    pass

@shifts_bp.route("/<uuid:shift_id>/assign", methods=["POST"])
def manually_assign(shift_id):
    # POST /api/shifts/:id/assign
    # Admin manually assigns a user to a position
    # body: { user_id, shift_position_id }
    # optionally sends SMS confirmation request to user
    pass

@shifts_bp.route("/<uuid:shift_id>/coverage", methods=["POST"])
def trigger_coverage(shift_id):
    # POST /api/shifts/:id/coverage
    # Admin manually triggers auto-cover engine for a shift
    pass

@shifts_bp.route("/available", methods=["GET"])
def available_shifts():
    # GET /api/shifts/available?user_id=xxx
    # Returns shifts filtered by user's availability + qualifications
    # Used to populate volunteer dashboard
    pass