from functools import wraps

from flask import Blueprint, jsonify, request, g, current_app
from firebase_admin import auth
from firebase_admin.auth import UidIdentifier

from routes.admin_materials import admin_only
from services.supabase_client import get_supabase

admin_students_bp = Blueprint(
    "admin_students", __name__
)


@admin_students_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


def fetch_all(table, fields, student_only=False):
    db = get_supabase()
    rows = []
    offset = 0
    size = 500

    while True:
        query = db.table(table).select(fields)

        if student_only:
            query = query.eq("role", "student")
            query = query.order("firebase_uid")
        else:
            query = query.order("id")

        result = query.range(
            offset, offset + size - 1
        ).execute()

        batch = result.data or []
        rows.extend(batch)

        if len(batch) < size:
            break

        offset += size

    return rows


@admin_students_bp.get("/api/admin/students")
@admin_only
def list_students():

    profiles = fetch_all(
        "profiles",
        "firebase_uid,email,full_name,"
        "institution_id,created_at",
        student_only=True
    )

    institutions = fetch_all(
        "institutions",
        "id,college_code,name,district,management"
    )

    institution_map = {
        str(item["id"]): item
        for item in institutions
    }

    # Retrieve Firebase users in batches of 100.
    firebase_users = {}

    uids = [
        row["firebase_uid"]
        for row in profiles
        if row.get("firebase_uid")
    ]

    for start in range(0, len(uids), 100):
        identifiers = [
            UidIdentifier(uid)
            for uid in uids[start:start + 100]
        ]

        result = auth.get_users(identifiers)

        for user in result.users:
            firebase_users[user.uid] = user

    students = []

    for profile in profiles:
        uid = profile["firebase_uid"]
        user = firebase_users.get(uid)

        college = institution_map.get(
            str(profile.get("institution_id")), {}
        )

        students.append({
            "uid": uid,
            "full_name": profile.get("full_name"),
            "email": user.email if user else profile.get("email"),
            "institution_id": profile.get("institution_id"),
            "institution_name": college.get("name"),
            "college_code": college.get("college_code"),
            "district": college.get("district"),
            "management": college.get("management"),
            "created_at": profile.get("created_at"),
            "email_verified": (
                user.email_verified if user else None
            ),
            "account_status": (
                "missing" if not user
                else "suspended" if user.disabled
                else "active"
            )
        })

    students.sort(
        key=lambda item: item.get("created_at") or "",
        reverse=True
    )

    stats = {
        "total": len(students),
        "verified": sum(
            s["email_verified"] is True
            for s in students
        ),
        "unverified": sum(
            s["email_verified"] is False
            for s in students
        ),
        "suspended": sum(
            s["account_status"] == "suspended"
            for s in students
        ),
        "missing": sum(
            s["account_status"] == "missing"
            for s in students
        )
    }

    search = request.args.get(
        "search", ""
    ).strip().lower()

    institution = request.args.get(
        "institution", ""
    ).strip()

    district = request.args.get(
        "district", ""
    ).strip()

    verification = request.args.get(
        "verification", ""
    ).strip()

    status = request.args.get(
        "status", ""
    ).strip()

    if verification not in {
        "", "verified", "unverified", "unknown"
    }:
        return jsonify({
            "error": "Invalid verification filter"
        }), 400

    if status not in {
        "", "active", "suspended", "missing"
    }:
        return jsonify({
            "error": "Invalid account status"
        }), 400

    filtered = []

    for student in students:

        if search and not any(
            search in str(
                student.get(field) or ""
            ).lower()
            for field in [
                "full_name", "email", "college_code"
            ]
        ):
            continue

        if institution and str(
            student["institution_id"]
        ) != institution:
            continue

        if district and student["district"] != district:
            continue

        if verification == "verified" and (
            student["email_verified"] is not True
        ):
            continue

        if verification == "unverified" and (
            student["email_verified"] is not False
        ):
            continue

        if verification == "unknown" and (
            student["email_verified"] is not None
        ):
            continue

        if status and student["account_status"] != status:
            continue

        filtered.append(student)

    try:
        page = max(
            1, int(request.args.get("page", 1))
        )

        limit = min(
            100,
            max(1, int(request.args.get("limit", 15)))
        )

    except ValueError:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    start = (page - 1) * limit

    return jsonify({
        "students": filtered[start:start + limit],
        "total": len(filtered),
        "page": page,
        "limit": limit,
        "stats": stats,
        "institutions": institutions
    })


# DELETE STUDENT ACCOUNT

@admin_students_bp.delete("/api/admin/students/<uid>")
@admin_only
def remove_student(uid):

    db = get_supabase()

    if uid == g.firebase_uid:
        return jsonify({
            "error": "You cannot remove your own account."
        }), 403

    result = (
        db.table("profiles")
        .select("firebase_uid,role")
        .eq("firebase_uid", uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        return jsonify({
            "error": "Student profile not found."
        }), 404

    profile = result.data[0]

    if profile.get("role") != "student":
        return jsonify({
            "error": "Only student accounts can be removed."
        }), 403

    # Disable Firebase access before deleting the account.
    try:
        auth.update_user(uid, disabled=True)
        auth.revoke_refresh_tokens(uid)
        auth.delete_user(uid)

    except auth.UserNotFoundError:
        # Supports retry if Firebase was already deleted.
        pass

    except Exception:
        current_app.logger.exception(
            "Firebase student removal failed: %s", uid
        )

        return jsonify({
            "error": (
                "Unable to complete Firebase account removal. "
                "Please retry."
            )
        }), 503

    # Delete the student profile.
    # Supabase automatically deletes related details
    # and bookmarks through ON DELETE CASCADE.

    try:
        deleted = (
            db.table("profiles")
            .delete()
            .eq("firebase_uid", uid)
            .eq("role", "student")
            .execute()
        )

        if not deleted.data:
            return jsonify({
                "error": (
                    "Firebase account removed, but profile "
                    "cleanup could not be confirmed. "
                    "Refresh and check the student record."
                )
            }), 409

    except Exception:
        current_app.logger.exception(
            "Student profile cleanup failed: %s", uid
        )

        return jsonify({
            "error": (
                "Firebase account removed, but database "
                "cleanup failed. Retry Remove Student."
            )
        }), 503

    current_app.logger.info(
        "Student removed: uid=%s admin=%s",
        uid,
        g.firebase_uid
    )

    return jsonify({
        "message": "Student removed successfully.",
        "removed": True,
        "uid": uid
    }), 200
