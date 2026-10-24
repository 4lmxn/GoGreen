from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from app import db
from app.models import Driver, Vehicle, Trip, TripStatus
from app.models.driver import ApprovalStatus
from app.utils.rbac import role_required
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/learning', methods=['GET'])
@role_required('admin')
def learning():
    from app.services.feedback import feedback_report
    return jsonify(feedback_report())

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def get_stats():
    from app.services.analytics import summary
    return jsonify(summary()), 200


@admin_bp.route('/fleet', methods=['GET'])
@role_required('admin')
def get_fleet():
    from app.services.trip_workflow import serialize
    from app.services.dispatch import serialize_round
    from app.models import DispatchedRound, RoundStatus
    return jsonify(trips=[serialize(t) for t in Trip.query.filter_by(status=TripStatus.in_progress).all()],
                   rounds=[serialize_round(r) for r in DispatchedRound.query.filter_by(status=RoundStatus.in_progress).all()])


# Mock DB Settings Table (since we don't have a real one in models for simplicity, we mock it)
_MOCK_SETTINGS = {
    "auto_approve_drivers": False,
    "strict_routing": True,
    "ml_retrain_interval_days": 7
}

@admin_bp.route('/settings', methods=['GET'])
@role_required('admin')
def get_settings():
    return jsonify(_MOCK_SETTINGS), 200

@admin_bp.route('/settings', methods=['PATCH'])
@role_required('admin')
def update_settings():
    data = request.get_json() or {}
    for k, v in data.items():
        if k in _MOCK_SETTINGS:
            _MOCK_SETTINGS[k] = v
    return jsonify({"message": "Settings updated", "settings": _MOCK_SETTINGS}), 200

@admin_bp.route('/backup', methods=['POST'])
@role_required('admin')
def trigger_backup():
    # Mock backup
    return jsonify({"message": "Database backup triggered successfully", "timestamp": "2026-07-04T12:00:00Z"}), 200

@admin_bp.route('/restore', methods=['POST'])
@role_required('admin')
def trigger_restore():
    # Mock restore
    return jsonify({"message": "Database restore initiated", "status": "pending"}), 200
