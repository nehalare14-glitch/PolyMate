from datetime import datetime, timezone, timedelta

from flask import Blueprint, jsonify, current_app
from routes.admin_materials import admin_only
from services.supabase_client import get_supabase


admin_analytics_bp = Blueprint(
    "admin_analytics",
    __name__
)


def count_rows(table, filters=None):

    query = (
        get_supabase()
        .table(table)
        .select("*", count="exact", head=True)
    )

    for key, value in (filters or {}).items():
        query = query.eq(key, value)

    result = query.execute()

    return result.count or 0


def fetch_rows(table, fields, filters=None):

    rows = []
    offset = 0
    size = 500

    while True:

        query = get_supabase().table(table).select(fields)

        for key, value in (filters or {}).items():
            query = query.eq(key, value)

        order_field = (
            "firebase_uid"
            if table == "profiles"
            else "id"
        )

        result = (
            query.order(order_field)
            .range(offset, offset + size - 1)
            .execute()
        )

        batch = result.data or []
        rows.extend(batch)

        if len(batch) < size:
            break

        offset += size

    return rows


@admin_analytics_bp.get("/api/admin/analytics")
@admin_only
def dashboard_analytics():

    try:

        db = get_supabase()

        students = count_rows(
            "profiles", {"role": "student"}
        )

        faculty = count_rows(
            "profiles", {"role": "faculty"}
        )

        institutions = count_rows("institutions")

        materials = count_rows("study_materials")

        pending_faculty = count_rows(
            "profiles",
            {
                "role": "faculty",
                "approval_status": "pending"
            }
        )

        published_materials = count_rows(
            "study_materials",
            {"status": "published"}
        )

        now = datetime.now(timezone.utc)

        start = now - timedelta(days=29)

        growth = []

        for i in range(30):

            day = start + timedelta(days=i)

            growth.append({
                "date": day.date().isoformat(),
                "label": day.strftime("%d %b"),
                "count": 0
            })

        growth_map = {
            item["date"]: item
            for item in growth
        }

        student_rows = fetch_rows(
            "profiles",
            "firebase_uid,created_at",
            {"role": "student"}
        )

        for row in student_rows:

            created = row.get("created_at")

            if not created:
                continue

            try:

                date = datetime.fromisoformat(
                    created.replace("Z", "+00:00")
                ).astimezone(timezone.utc)

                key = date.date().isoformat()

                if key in growth_map:
                    growth_map[key]["count"] += 1

            except (ValueError, TypeError):
                continue

        material_rows = fetch_rows(
            "study_materials",
            "id,branch,material_type"
        )

        branches = {}
        resource_types = {}

        for row in material_rows:

            branch = str(
                row.get("branch") or "Other"
            ).strip().upper()

            material_type = str(
                row.get("material_type") or "Other"
            )

            branches[branch] = (
                branches.get(branch, 0) + 1
            )

            resource_types[material_type] = (
                resource_types.get(material_type, 0) + 1
            )

        recent_students = (
            db.table("profiles")
            .select("full_name,created_at")
            .eq("role", "student")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        ).data or []

        recent_materials = (
            db.table("study_materials")
            .select("id,title,branch,created_at")
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        ).data or []

        activity = []

        for row in recent_students:

            activity.append({
                "type": "student",
                "title": row.get("full_name") or "Student",
                "description": "New student registration",
                "created_at": row.get("created_at")
            })

        for row in recent_materials:

            activity.append({
                "type": "material",
                "title": row.get("title") or "Study material",
                "description": (
                    "Material uploaded - " +
                    str(row.get("branch") or "Other")
                ),
                "created_at": row.get("created_at")
            })

        activity.sort(
            key=lambda row: row.get("created_at") or "",
            reverse=True
        )

        response = jsonify({

            "stats": {
                "students": students,
                "faculty": faculty,
                "institutions": institutions,
                "materials": materials,
                "pending_faculty": pending_faculty,
                "published_materials": published_materials
            },

            "growth": growth,

            "branches": sorted(
                [
                    {"name": name, "count": count}
                    for name, count in branches.items()
                ],
                key=lambda item: item["count"],
                reverse=True
            ),

            "resource_types": [
                {"name": name, "count": count}
                for name, count in resource_types.items()
            ],

            "activity": activity[:8],

            "updated_at": now.isoformat()
        })

        response.headers["Cache-Control"] = "no-store"

        return response, 200

    except Exception:

        current_app.logger.exception(
            "Admin analytics failed"
        )

        return jsonify({
            "error": "Unable to load dashboard analytics."
        }), 503

