from services.pdf_preview import secure_pdf_response
from flask import Blueprint, request, jsonify
from middleware.role_auth import require_role
from services.supabase_client import get_supabase

student_materials_bp = Blueprint(
    "student_materials", __name__
)

BUCKET = "study-materials"

MATERIAL_FIELDS = (
    "id,title,subject_name,branch,semester,"
    "material_type,created_at"
)

ALLOWED_TYPES = {
    "notes",
    "question-paper",
    "syllabus",
    "lab-manual"
}


@student_materials_bp.get("/api/student/materials")
@require_role("student")
def list_materials():
    branch = request.args.get("branch", "").strip()
    semester = request.args.get("semester", "").strip()
    subject = request.args.get("subject", "").strip()
    search = request.args.get("search", "").strip()

    if len(search) > 120 or len(subject) > 200:
        return jsonify({
            "error": "Search or subject filter is too long"
        }), 400
    material_type = request.args.get(
        "material_type", ""
    ).strip()

    if material_type and material_type not in ALLOWED_TYPES:
        return jsonify({
            "error": "Invalid material type"
        }), 400

    if semester:
        try:
            semester = int(semester)
            if semester not in range(1, 7):
                raise ValueError()
        except ValueError:
            return jsonify({
                "error": "Invalid semester"
            }), 400

    try:
        page = int(request.args.get("page", "1"))
        limit = int(request.args.get("limit", "30"))

        if page < 1 or limit < 1 or limit > 100:
            raise ValueError()

    except ValueError:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    try:
        query = (
            get_supabase()
            .table("study_materials")
            .select(MATERIAL_FIELDS, count="exact")
            .eq("status", "published")
        )

        if branch:
            query = query.eq("branch", branch)

        if semester:
            query = query.eq("semester", semester)

        if material_type:
            query = query.eq(
                "material_type", material_type
            )

        if subject:
            query = query.eq("subject_name", subject)

        if search:
            # Escape LIKE wildcards and PostgREST quoted values.
            escaped = (
                search.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_")
                .replace("*", "\\*")
            )
            pattern = f"%{escaped}%"
            quoted = (
                pattern.replace("\\", "\\\\")
                .replace('"', '\\"')
            )
            query = query.or_(
                f'title.ilike."{quoted}",'
                f'subject_name.ilike."{quoted}"'
            )

        start = (page - 1) * limit

        result = (
            query
            .order("created_at", desc=True)
            .order("id", desc=True)
            .range(start, start + limit - 1)
            .execute()
        )

        response = jsonify({
            "materials": result.data or [],
            "total": result.count or 0,
            "page": page,
            "limit": limit
        })

        response.headers["Cache-Control"] = "no-store"

        return response

    except Exception:
        return jsonify({
            "error": "Unable to load study materials"
        }), 503


@student_materials_bp.get(
    "/api/student/materials/recent"
)
@require_role("student")
def recent_materials():
    try:
        result = (
            get_supabase()
            .table("study_materials")
            .select(MATERIAL_FIELDS)
            .eq("status", "published")
            .order("created_at", desc=True)
            .order("id", desc=True)
            .limit(3)
            .execute()
        )

        response = jsonify({
            "materials": result.data or []
        })

        response.headers["Cache-Control"] = "no-store"

        return response

    except Exception:
        return jsonify({
            "error": "Unable to load recent materials"
        }), 503


@student_materials_bp.get(
    "/api/student/materials/<uuid:material_id>/preview"
)
@require_role("student")
def preview_material(material_id):
    try:
        db = get_supabase()

        result = (
            db.table("study_materials")
            .select("id,title,storage_path")
            .eq("status", "published")
            .eq("id", str(material_id))
            .limit(1)
            .execute()
        )

        if not result.data:
            return jsonify({
                "error": "PDF not found"
            }), 404

        material = result.data[0]

        return secure_pdf_response(db, BUCKET, material)

    except Exception:
        return jsonify({
            "error": "Unable to open PDF preview"
        }), 503


@student_materials_bp.get("/api/student/materials/subjects")
@require_role("student")
def material_subjects():
    branch = request.args.get("branch", "").strip()
    semester = request.args.get("semester", "").strip()
    material_type = request.args.get("material_type", "").strip()

    if material_type and material_type not in ALLOWED_TYPES:
        return jsonify({"error": "Invalid material type"}), 400

    if semester:
        try:
            semester = int(semester)
            if semester not in range(1, 7):
                raise ValueError()
        except ValueError:
            return jsonify({"error": "Invalid semester"}), 400

    try:
        db = get_supabase()
        subjects = set()
        offset = 0
        batch_size = 500

        while True:
            query = (
                db.table("study_materials")
                .select("subject_name")
                .eq("status", "published")
            )

            if branch:
                query = query.eq("branch", branch)

            if semester:
                query = query.eq("semester", semester)

            if material_type:
                query = query.eq("material_type", material_type)

            result = (
                query
                .order("subject_name")
                .order("id")
                .range(offset, offset + batch_size - 1)
                .execute()
            )

            rows = result.data or []

            for row in rows:
                name = row.get("subject_name")
                if name:
                    subjects.add(name)

            if len(rows) < batch_size:
                break

            offset += batch_size

        response = jsonify({
            "subjects": sorted(subjects, key=str.casefold)
        })

        response.headers["Cache-Control"] = "no-store"

        return response

    except Exception:
        return jsonify({
            "error": "Unable to load subject options"
        }), 503
