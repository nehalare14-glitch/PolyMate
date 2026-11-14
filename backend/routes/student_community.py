from functools import wraps
from uuid import UUID

from flask import Blueprint, jsonify, g, request, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.supabase_client import get_supabase


student_community_bp = Blueprint(
    "student_community",
    __name__,
    url_prefix="/api/student/community",
)

BRANCHES = {
    "CSE", "ECE", "EEE", "MEC",
    "CIVIL", "AIML", "CCP",
}

CATEGORIES = {
    "materials", "issue", "feedback", "support",
}

MATERIAL_TYPES = {
    "notes", "question-paper",
}

REQUEST_FIELDS = (
    "id,ticket_number,category,title,description,"
    "branch,semester,subject_name,material_type,"
    "status,material_id,admin_response,"
    "created_at,updated_at,accepted_at,"
    "completed_at,cancelled_at,escalated_at"
)


def student_only(view):

    @wraps(view)
    @require_firebase_auth
    def wrapped(*args, **kwargs):

        try:
            profile = get_profile(g.firebase_uid)

            if not profile:
                return jsonify({
                    "error": "Profile not found"
                }), 404

            if profile.get("role") != "student":
                return jsonify({
                    "error": "Student access required"
                }), 403

            return view(*args, **kwargs)

        except Exception:
            current_app.logger.exception(
                "Student community request failed"
            )

            return jsonify({
                "error": "Unable to process request. Try again."
            }), 503

    return wrapped


@student_community_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "private, no-store"
    return response


def clean_text(value, minimum, maximum, field):

    if not isinstance(value, str):
        raise ValueError(f"{field} is required")

    value = value.strip()

    if not minimum <= len(value) <= maximum:
        raise ValueError(
            f"{field} must contain {minimum} to {maximum} characters"
        )

    return value


def valid_uuid(value):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def public_request(row):
    return {
        field: row.get(field)
        for field in REQUEST_FIELDS.split(",")
    }


def pagination():

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "20"))
    except (ValueError, TypeError):
        raise ValueError("Invalid pagination")

    if not 1 <= page <= 10000:
        raise ValueError("Invalid page")

    if not 1 <= limit <= 100:
        raise ValueError("Invalid limit")

    return (page - 1) * limit, limit


# ==========================================
# CREATE STUDENT REQUEST
# ==========================================

@student_community_bp.post("/requests")
@student_only
def create_request():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "A JSON object is required"
        }), 400

    try:
        category = clean_text(
            data.get("category"), 1, 30, "Category"
        ).lower()

        if category not in CATEGORIES:
            raise ValueError("Invalid request category")

        title = clean_text(
            data.get("title"), 3, 150, "Title"
        )

        description = clean_text(
            data.get("description"), 10, 2000,
            "Description"
        )

        branch = None
        semester = None
        subject_name = None
        material_type = None

        if category == "materials":

            branch = clean_text(
                data.get("branch"), 1, 20, "Branch"
            ).upper()

            if branch not in BRANCHES:
                raise ValueError("Invalid branch")

            semester = data.get("semester")

            if (
                isinstance(semester, bool)
                or not isinstance(semester, int)
                or not 1 <= semester <= 6
            ):
                raise ValueError("Invalid semester")

            subject_name = clean_text(
                data.get("subject_name"),
                2, 150, "Subject"
            )

            material_type = clean_text(
                data.get("material_type"),
                1, 30, "Material type"
            ).lower()

            if material_type not in MATERIAL_TYPES:
                raise ValueError("Invalid material type")

    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        result = get_supabase().rpc(
            "community_create_request",
            {
                "p_student_uid": g.firebase_uid,
                "p_category": category,
                "p_title": title,
                "p_description": description,
                "p_branch": branch,
                "p_semester": semester,
                "p_subject_name": subject_name,
                "p_material_type": material_type,
            },
        ).execute()

    except Exception as exc:

        if "Daily request limit reached" in str(exc):
            return jsonify({
                "error": "Daily request limit reached"
            }), 429

        raise

    return jsonify({
        "message": "Request submitted successfully",
        "request": public_request(result.data),
    }), 201


# ==========================================
# VIEW OWN REQUESTS
# ==========================================

@student_community_bp.get("/requests")
@student_only
def list_requests():

    try:
        offset, limit = pagination()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    status = request.args.get("status")

    query = (
        get_supabase()
        .table("community_requests")
        .select(REQUEST_FIELDS, count="exact")
        .eq("student_uid", g.firebase_uid)
    )

    if status:

        if status not in {
            "pending", "in_progress",
            "completed", "cancelled"
        }:
            return jsonify({
                "error": "Invalid status"
            }), 400

        query = query.eq("status", status)

    result = (
        query
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return jsonify({
        "requests": result.data or [],
        "total": result.count or 0,
    })


# ==========================================
# VIEW ONE REQUEST
# ==========================================

@student_community_bp.get("/requests/<request_id>")
@student_only
def get_request(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    db = get_supabase()

    result = (
        db.table("community_requests")
        .select(REQUEST_FIELDS)
        .eq("id", request_id)
        .eq("student_uid", g.firebase_uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Request not found"
        }), 404

    events = (
        db.table("community_request_events")
        .select("id,event_type,message,created_at")
        .eq("request_id", request_id)
        .order("created_at")
        .limit(100)
        .execute()
    )

    return jsonify({
        "request": result.data[0],
        "events": events.data or [],
    })


# ==========================================
# CANCEL OWN PENDING REQUEST
# ==========================================

@student_community_bp.post(
    "/requests/<request_id>/cancel"
)
@student_only
def cancel_request(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    result = get_supabase().rpc(
        "community_cancel_request",
        {
            "p_student_uid": g.firebase_uid,
            "p_request_id": request_id,
        },
    ).execute()

    if not result.data:
        return jsonify({
            "error": "Request not found or cannot be cancelled"
        }), 409

    return jsonify({
        "message": "Request cancelled",
        "request": public_request(result.data),
    })


# ==========================================
# VIEW STUDENT NOTIFICATIONS
# ==========================================

@student_community_bp.get("/notifications")
@student_only
def list_notifications():

    try:
        offset, limit = pagination()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db = get_supabase()

    result = (
        db.table("community_notifications")
        .select(
            "id,request_id,title,message,"
            "is_read,created_at,read_at"
        )
        .eq("recipient_uid", g.firebase_uid)
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    unread = (
        db.table("community_notifications")
        .select("id", count="exact")
        .eq("recipient_uid", g.firebase_uid)
        .eq("is_read", False)
        .limit(1)
        .execute()
    )

    return jsonify({
        "notifications": result.data or [],
        "unread_count": unread.count or 0,
    })


# ==========================================
# MARK NOTIFICATION AS READ
# ==========================================

@student_community_bp.patch(
    "/notifications/<notification_id>/read"
)
@student_only
def mark_notification_read(notification_id):

    from datetime import datetime, timezone

    notification_id = valid_uuid(notification_id)

    if not notification_id:
        return jsonify({
            "error": "Invalid notification ID"
        }), 400

    result = (
        get_supabase()
        .table("community_notifications")
        .update({
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("id", notification_id)
        .eq("recipient_uid", g.firebase_uid)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Notification not found"
        }), 404

    return jsonify({
        "message": "Notification marked as read"
    })

# ==========================================
# MARK ALL STUDENT NOTIFICATIONS AS READ
# ==========================================

@student_community_bp.patch("/notifications/read-all")
@student_only
def mark_all_notifications_read():

    from datetime import datetime, timezone

    (
        get_supabase()
        .table("community_notifications")
        .update({
            "is_read": True,
            "read_at": datetime.now(timezone.utc).isoformat(),
        })
        .eq("recipient_uid", g.firebase_uid)
        .eq("is_read", False)
        .execute()
    )

    return jsonify({
        "message": "All notifications marked as read"
    })

