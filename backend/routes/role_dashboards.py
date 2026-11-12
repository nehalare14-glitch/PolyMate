from flask import Blueprint, jsonify, g

from middleware.role_auth import require_role


role_dashboards_bp = Blueprint("role_dashboards", __name__)


def dashboard_response():
    profile = g.current_profile

    return jsonify({
        "message": "Dashboard access authorized",
        "user": {
            "firebase_uid": profile["firebase_uid"],
            "full_name": profile.get("full_name"),
            "role": profile["role"],
            "institution_id": profile.get("institution_id"),
        }
    }), 200


@role_dashboards_bp.get("/api/student/dashboard")
@require_role("student")
def student_dashboard():
    return dashboard_response()


@role_dashboards_bp.get("/api/faculty/dashboard")
@require_role("faculty")
def faculty_dashboard():
    return dashboard_response()


@role_dashboards_bp.get("/api/admin/dashboard")
@require_role("admin")
def admin_dashboard():
    return dashboard_response()


@role_dashboards_bp.get("/api/super-admin/dashboard")
@require_role("super_admin")
def super_admin_dashboard():
    return dashboard_response()
