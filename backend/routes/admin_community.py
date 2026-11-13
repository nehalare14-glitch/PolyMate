from functools import wraps
from uuid import UUID

from flask import Blueprint, jsonify, g, request, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.supabase_client import get_supabase


admin_community_bp = Blueprint(
    "admin_community",
    __name__,
    url_prefix="/api/admin/community",
)

CATEGORIES = {
    "materials", "issue", "feedback", "support"
}

STATUSES = {
    "pending", "in_progress",
    "completed", "cancelled"
}


def admin_only(view):

    @wraps(view)
    @require_firebase_auth
    def wrapped(*args, **kwargs):

        try:
            if not g.firebase_email_verified:
                return jsonify({
                    "error": "Email verification required"
                }), 403

            profile = get_profile(g.firebase_uid)

            if not profile or profile.get("role") != "admin":
                return jsonify({
                    "error": "Admin access required"
                }), 403

            return view(*args, **kwargs)

        except Exception:
            current_app.logger.exception(
                "Admin community request failed"
            )

            return jsonify({
                "error": "Unable to process request"
            }), 503

    return wrapped


@admin_community_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "private, no-store"
    return response


def valid_uuid(value):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


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
# COMMUNITY DASHBOARD SUMMARY
# ==========================================

@admin_community_bp.get("/summary")
@admin_only
def summary():

    db = get_supabase()
    counts = {}

    for status in STATUSES:

        result = (
            db.table("community_requests")
            .select("id", count="exact")
            .eq("status", status)
            .limit(1)
            .execute()
        )

        counts[status] = result.count or 0

    counts["total"] = sum(counts.values())

    return jsonify(counts)


# ==========================================
# LIST ALL STUDENT REQUESTS
# ==========================================

@admin_community_bp.get("/requests")
@admin_only
def list_requests():

    try:
        offset, limit = pagination()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    category = request.args.get("category")
    status = request.args.get("status")

    query = (
        get_supabase()
        .table("community_requests")
        .select("*", count="exact")
    )

    if category:

        if category not in CATEGORIES:
            return jsonify({
                "error": "Invalid category"
            }), 400

        query = query.eq("category", category)

    if status:

        if status not in STATUSES:
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
# VIEW REQUEST DETAILS
# ==========================================

@admin_community_bp.get("/requests/<request_id>")
@admin_only
def get_request(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    db = get_supabase()

    result = (
        db.table("community_requests")
        .select("*")
        .eq("id", request_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Request not found"
        }), 404

    item = result.data[0]

    profile = (
        db.table("profiles")
        .select("firebase_uid,full_name,email,institution_id")
        .eq("firebase_uid", item["student_uid"])
        .limit(1)
        .execute()
    )

    events = (
        db.table("community_request_events")
        .select("id,event_type,message,created_at")
        .eq("request_id", request_id)
        .order("created_at")
        .limit(100)
        .execute()
    )

    return jsonify({
        "request": item,
        "student": (
            profile.data[0]
            if profile.data else None
        ),
        "events": events.data or [],
    })


# ==========================================
# START WORKING ON REQUEST
# ==========================================

@admin_community_bp.post("/requests/<request_id>/start")
@admin_only
def start_request(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    result = get_supabase().rpc(
        "community_admin_start",
        {
            "p_admin_uid": g.firebase_uid,
            "p_request_id": request_id,
        },
    ).execute()

    if not result.data:
        return jsonify({
            "error": "Request cannot be started"
        }), 409

    return jsonify({
        "message": "Request marked in progress",
        "request": result.data,
    })


# ==========================================
# FIND MATCHING PUBLISHED MATERIALS
# ==========================================

@admin_community_bp.get("/requests/<request_id>/materials")
@admin_only
def matching_materials(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    try:
        offset, limit = pagination()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    db = get_supabase()

    result = (
        db.table("community_requests")
        .select(
            "id,branch,semester,"
            "subject_name,material_type"
        )
        .eq("id", request_id)
        .eq("category", "materials")
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Material request not found"
        }), 404

    item = result.data[0]

    materials = (
        db.table("study_materials")
        .select(
            "id,title,branch,semester,"
            "subject_name,material_type,"
            "faculty_uid,created_at",
            count="exact",
        )
        .eq("status", "published")
        .eq("branch", item["branch"])
        .eq("semester", item["semester"])
        .eq("subject_name", item["subject_name"])
        .eq("material_type", item["material_type"])
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return jsonify({
        "materials": materials.data or [],
        "total": materials.count or 0,
    })


# ==========================================
# RESPOND OR COMPLETE REQUEST
# ==========================================

@admin_community_bp.post("/requests/<request_id>/respond")
@admin_only
def respond(request_id):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "JSON object required"
        }), 400

    message = data.get("response")
    complete = data.get("complete", False)

    if (
        not isinstance(message, str)
        or not 3 <= len(message.strip()) <= 2000
    ):
        return jsonify({
            "error": "Response must contain 3 to 2000 characters"
        }), 400

    if not isinstance(complete, bool):
        return jsonify({
            "error": "Invalid completion value"
        }), 400

    material_id = data.get("material_id")

    if material_id is not None:

        material_id = valid_uuid(material_id)

        if not material_id:
            return jsonify({
                "error": "Invalid material ID"
            }), 400

    try:
        result = get_supabase().rpc(
            "community_admin_respond",
            {
                "p_admin_uid": g.firebase_uid,
                "p_request_id": request_id,
                "p_response": message.strip(),
                "p_complete": complete,
                "p_material_id": material_id,
            },
        ).execute()

    except Exception as exc:

        known_errors = (
            "Published material required",
            "Material does not match the request",
            "Material link is not applicable",
            "Invalid response",
        )

        for error in known_errors:

            if error in str(exc):
                return jsonify({"error": error}), 400

        raise

    if not result.data:
        return jsonify({
            "error": "Request cannot be updated"
        }), 409

    return jsonify({
        "message": (
            "Request completed successfully"
            if complete
            else "Response sent successfully"
        ),
        "request": result.data,
    })
