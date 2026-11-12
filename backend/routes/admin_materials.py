import os

from datetime import datetime, timezone
from functools import wraps

from flask import (
    Blueprint, jsonify, request, g, current_app
)

from middleware.role_auth import require_role
from services.supabase_client import get_supabase
from services.profiles import get_profile


admin_materials_bp = Blueprint(
    "admin_materials", __name__
)

BUCKET = "study-materials"

BRANCHES = {
    "CSE", "ECE", "EEE", "MEC",
    "CIVIL", "AIML", "CCP"
}

ALLOWED_TYPES = {
    "notes", "question-paper",
    "syllabus", "lab-manual"
}

STATUSES = {"published", "hidden", "trash"}

FIELDS = (
    "id,title,subject_name,branch,semester,"
    "material_type,faculty_uid,uploaded_by_role,"
    "status,created_at,updated_at,"
    "original_filename,file_size_bytes,deleted_at"
)


def now():
    return datetime.now(timezone.utc).isoformat()


def admin_only(view):
    @wraps(view)
    @require_role("admin")
    def wrapped(*args, **kwargs):
        admin_uid = os.getenv(
            "POLYMATE_ADMIN_UID", ""
        ).strip()

        if not admin_uid or g.firebase_uid != admin_uid:
            return jsonify({
                "error": "Admin access denied"
            }), 403

        try:
            return view(*args, **kwargs)

        except Exception:
            current_app.logger.exception(
                "Admin materials request failed"
            )

            return jsonify({
                "error": "Unable to process request. Try again."
            }), 503

    return wrapped


@admin_materials_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


def find_material(db, material_id):
    result = (
        db.table("study_materials")
        .select("*")
        .eq("id", str(material_id))
        .limit(1)
        .execute()
    )

    return result.data[0] if result.data else None


def record_activity(db, material, action, details=None):
    db.table("material_activity_logs").insert({
        "material_id": material["id"],
        "material_title": material["title"],
        "actor_uid": g.firebase_uid,
        "actor_role": "admin",
        "action": action,
        "details": details or {}
    }).execute()


# LIST ALL MATERIALS

@admin_materials_bp.get("/api/admin/materials")
@admin_only
def list_materials():

    status = request.args.get("status", "all").strip()
    branch = request.args.get("branch", "").strip()
    semester = request.args.get("semester", "").strip()
    material_type = request.args.get(
        "material_type", ""
    ).strip()

    search = request.args.get("search", "").strip()

    if status not in STATUSES | {"all"}:
        return jsonify({"error": "Invalid status"}), 400

    if branch and branch not in BRANCHES:
        return jsonify({"error": "Invalid branch"}), 400

    if material_type and material_type not in ALLOWED_TYPES:
        return jsonify({"error": "Invalid material type"}), 400

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "20"))

        if page < 1 or not 1 <= limit <= 100:
            raise ValueError()

        if semester:
            semester = int(semester)

            if semester not in range(1, 7):
                raise ValueError()

    except ValueError:
        return jsonify({
            "error": "Invalid pagination or semester"
        }), 400

    db = get_supabase()

    query = db.table("study_materials").select(
        FIELDS, count="exact"
    )

    if status == "all":
        query = query.neq("status", "trash")
    else:
        query = query.eq("status", status)

    if branch:
        query = query.eq("branch", branch)

    if semester:
        query = query.eq("semester", semester)

    if material_type:
        query = query.eq("material_type", material_type)

    if search:
        # Keep search input safe for PostgREST filters.
        if len(search) > 100 or any(
            c in search for c in ',()."%*\\'
        ):
            return jsonify({
                "error": "Invalid search text"
            }), 400

        query = query.or_(
            f"title.ilike.%{search}%,"
            f"subject_name.ilike.%{search}%"
        )

    start = (page - 1) * limit

    result = (
        query
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(start, start + limit - 1)
        .execute()
    )

    materials = result.data or []

    # Retrieve uploader names without one query per PDF.
    uids = list({
        item["faculty_uid"]
        for item in materials
        if item.get("faculty_uid")
    })

    names = {}

    if uids:
        profiles = (
            db.table("profiles")
            .select("firebase_uid,full_name")
            .in_("firebase_uid", uids)
            .execute()
        )

        names = {
            item["firebase_uid"]: item["full_name"]
            for item in profiles.data or []
        }

    for item in materials:
        item["uploaded_by_name"] = names.get(
            item["faculty_uid"], "Unknown uploader"
        )

    return jsonify({
        "materials": materials,
        "total": result.count or 0,
        "page": page,
        "limit": limit
    })


# MATERIAL COUNTS

@admin_materials_bp.get("/api/admin/materials/stats")
@admin_only
def material_stats():

    db = get_supabase()

    counts = {}

    for status in ("published", "hidden", "trash"):
        result = (
            db.table("study_materials")
            .select("id", count="exact")
            .eq("status", status)
            .limit(1)
            .execute()
        )

        counts[status] = result.count or 0

    counts["total"] = sum(counts.values())

    return jsonify(counts)


# PREVIEW ANY PDF

@admin_materials_bp.get(
    "/api/admin/materials/<uuid:material_id>/preview"
)
@admin_only
def preview_material(material_id):

    db = get_supabase()
    material = find_material(db, material_id)

    if not material:
        return jsonify({"error": "Material not found"}), 404

    signed = db.storage.from_(BUCKET).create_signed_url(
        material["storage_path"], 900
    )

    url = signed.get("signedURL") or signed.get("signedUrl")

    if not url:
        raise RuntimeError("Unable to create preview URL")

    return jsonify({
        "title": material["title"],
        "url": url
    })


# EDIT MATERIAL DETAILS

@admin_materials_bp.patch(
    "/api/admin/materials/<uuid:material_id>"
)
@admin_only
def edit_material(material_id):

    body = request.get_json(silent=True) or {}

    title = str(body.get("title", "")).strip()
    subject = str(body.get("subject_name", "")).strip()
    branch = str(body.get("branch", "")).strip()
    material_type = str(body.get("material_type", "")).strip()

    if not title or not subject:
        return jsonify({
            "error": "Complete all material details"
        }), 400

    if len(title) > 120 or len(subject) > 100:
        return jsonify({"error": "Invalid material details"}), 400

    if branch not in BRANCHES:
        return jsonify({"error": "Invalid branch"}), 400

    if material_type not in ALLOWED_TYPES:
        return jsonify({"error": "Invalid material type"}), 400

    try:
        semester = int(body.get("semester", 0))

        if semester not in range(1, 7):
            raise ValueError()

    except (ValueError, TypeError):
        return jsonify({"error": "Invalid semester"}), 400

    db = get_supabase()
    material = find_material(db, material_id)

    if not material:
        return jsonify({"error": "Material not found"}), 404

    if material["status"] == "trash":
        return jsonify({
            "error": "Restore this material before editing"
        }), 409

    changes = {
        "title": title,
        "subject_name": subject,
        "branch": branch,
        "semester": semester,
        "material_type": material_type,
        "assignment_id": None,
        "updated_at": now()
    }

    result = (
        db.table("study_materials")
        .update(changes)
        .eq("id", str(material_id))
        .eq("status", material["status"])
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Material changed. Try again."
        }), 409

    record_activity(
        db, result.data[0], "edit",
        {"changes": changes}
    )

    return jsonify({
        "message": "Material updated successfully",
        "material": result.data[0]
    })


# PUBLISH, HIDE, TRASH AND RESTORE

@admin_materials_bp.patch(
    "/api/admin/materials/<uuid:material_id>/status"
)
@admin_only
def change_status(material_id):

    body = request.get_json(silent=True) or {}
    action = str(body.get("action", "")).strip()

    transitions = {
        "publish": ("hidden", "published"),
        "hide": ("published", "hidden"),
        "trash": (None, "trash"),
        "restore": ("trash", "hidden")
    }

    if action not in transitions:
        return jsonify({"error": "Invalid action"}), 400

    db = get_supabase()
    material = find_material(db, material_id)

    if not material:
        return jsonify({"error": "Material not found"}), 404

    old_status = material["status"]
    required_status, new_status = transitions[action]

    if old_status == new_status:
        return jsonify({
            "message": "Material status unchanged",
            "material": material
        })

    if required_status and old_status != required_status:
        return jsonify({
            "error": "This action is not allowed for the current status"
        }), 409

    changes = {
        "status": new_status,
        "updated_at": now()
    }

    if new_status == "trash":
        changes["deleted_at"] = now()
        changes["deleted_by"] = g.firebase_uid

    elif action == "restore":
        changes["deleted_at"] = None
        changes["deleted_by"] = None

    result = (
        db.table("study_materials")
        .update(changes)
        .eq("id", str(material_id))
        .eq("status", old_status)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Material changed. Try again."
        }), 409

    record_activity(
        db, result.data[0], action,
        {
            "previous_status": old_status,
            "new_status": new_status
        }
    )

    messages = {
        "publish": "Material published",
        "hide": "Material hidden from students",
        "trash": "Material moved to Trash",
        "restore": "Material restored. Publish it when ready."
    }

    return jsonify({
        "message": messages[action],
        "material": result.data[0]
    })


# ACTIVITY HISTORY

@admin_materials_bp.get("/api/admin/materials/activity")
@admin_only
def activity_history():

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "20"))

        if page < 1 or not 1 <= limit <= 100:
            raise ValueError()

    except ValueError:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    start = (page - 1) * limit

    result = (
        get_supabase()
        .table("material_activity_logs")
        .select("*", count="exact")
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(start, start + limit - 1)
        .execute()
    )

    return jsonify({
        "activities": result.data or [],
        "total": result.count or 0,
        "page": page,
        "limit": limit
    })
