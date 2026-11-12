from functools import wraps

from flask import Blueprint, jsonify, g, request, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.supabase_client import get_supabase


student_bookmarks_bp = Blueprint(
    "student_bookmarks",
    __name__,
)

ALLOWED_TYPES = ["notes", "question-paper"]

MATERIAL_FIELDS = (
    "id,title,subject_name,branch,"
    "semester,material_type,created_at"
)


def student_only(view):
    @wraps(view)
    @require_firebase_auth
    def wrapped(*args, **kwargs):
        try:
            if not g.firebase_email_verified:
                return jsonify({
                    "error": "Email verification required"
                }), 403

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
                "Student bookmarks request failed"
            )

            return jsonify({
                "error": "Unable to process bookmarks. Try again."
            }), 503

    return wrapped


@student_bookmarks_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


# GET: Retrieve saved materials
@student_bookmarks_bp.get("/api/student/bookmarks")
@student_only
def get_bookmarks():

    material_type = request.args.get("material_type", "").strip()

    if material_type and material_type not in ALLOWED_TYPES:
        return jsonify({
            "error": "Invalid material type"
        }), 400

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "12"))
    except ValueError:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    if page < 1 or limit < 1 or limit > 100:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    start = (page - 1) * limit

    query = (
        get_supabase()
        .table("student_bookmarks")
        .select(
            "id,material_id,created_at,"
            f"study_materials!inner({MATERIAL_FIELDS})",
            count="exact",
        )
        .eq("student_uid", g.firebase_uid)
        .in_("study_materials.material_type", ALLOWED_TYPES)
        .eq("study_materials.status", "published")
    )

    if material_type:
        query = query.eq(
            "study_materials.material_type",
            material_type,
        )

    result = (
        query
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(start, start + limit - 1)
        .execute()
    )

    bookmarks = []

    for row in result.data or []:
        material = row.get("study_materials")

        if material:
            bookmarks.append({
                **material,
                "bookmark_id": row["id"],
                "bookmarked_at": row["created_at"],
            })

    return jsonify({
        "bookmarks": bookmarks,
        "total": result.count or 0,
        "page": page,
        "limit": limit,
    }), 200


# POST: Save a material
@student_bookmarks_bp.post(
    "/api/student/bookmarks/<uuid:material_id>"
)
@student_only
def save_bookmark(material_id):

    db = get_supabase()
    material_id = str(material_id)

    result = (
        db.table("study_materials")
        .select("id,material_type")
        .eq("status", "published")
        .eq("id", material_id)
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Material not found"
        }), 404

    if result.data[0]["material_type"] not in ALLOWED_TYPES:
        return jsonify({
            "error": "Only notes and question papers can be bookmarked"
        }), 400

    (
        db.table("student_bookmarks")
        .upsert(
            {
                "student_uid": g.firebase_uid,
                "material_id": material_id,
            },
            on_conflict="student_uid,material_id",
            ignore_duplicates=True,
        )
        .execute()
    )

    return jsonify({
        "message": "Material saved to bookmarks",
        "material_id": material_id,
        "bookmarked": True,
    }), 200


# DELETE: Remove a bookmark
@student_bookmarks_bp.delete(
    "/api/student/bookmarks/<uuid:material_id>"
)
@student_only
def remove_bookmark(material_id):

    material_id = str(material_id)

    (
        get_supabase()
        .table("student_bookmarks")
        .delete()
        .eq("student_uid", g.firebase_uid)
        .eq("material_id", material_id)
        .execute()
    )

    return jsonify({
        "message": "Bookmark removed",
        "material_id": material_id,
        "bookmarked": False,
    }), 200
