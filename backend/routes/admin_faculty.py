from collections import Counter
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, g, current_app
from firebase_admin import auth
from firebase_admin.auth import UidIdentifier

from routes.admin_materials import admin_only
from services.supabase_client import get_supabase
from services.profiles import (
    get_profile,
    serialize_profile,
    profile_integrity_issues,
)


admin_faculty_bp = Blueprint("admin_faculty", __name__)

BRANCHES = ["CSE", "ECE", "EEE", "MEC", "CIVIL", "AIML", "CCP"]


@admin_faculty_bp.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


def fetch_all(table, fields, order, filters=None):
    rows = []
    offset = 0

    while True:
        query = get_supabase().table(table).select(fields)

        for key, value in (filters or {}).items():
            query = query.eq(key, value)

        result = (
            query.order(order)
            .range(offset, offset + 499)
            .execute()
        )

        batch = result.data or []
        rows.extend(batch)

        if len(batch) < 500:
            break

        offset += 500

    return rows


def faculty_profile(uid):
    profile = get_profile(uid)

    if not profile or profile.get("role") != "faculty":
        return None

    return profile


def firebase_user(uid):
    try:
        return auth.get_user(uid)
    except auth.UserNotFoundError:
        return None


def account_status(profile, user):
    if user is None:
        return "missing"

    approval = profile.get("approval_status")

    if approval == "rejected":
        return "rejected"

    if approval != "approved":
        return "pending"

    if user.disabled:
        return "suspended"

    if not user.email_verified:
        return "unverified"

    return "active"


@admin_faculty_bp.get("/api/admin/faculty")
@admin_only
def list_faculty():

    profiles = fetch_all(
        "profiles", "*", "firebase_uid",
        {"role": "faculty"}
    )

    institutions = fetch_all(
        "institutions",
        "id,name,college_code,district",
        "id"
    )

    details = fetch_all(
        "faculty_details",
        "firebase_uid,faculty_id",
        "firebase_uid"
    )

    materials = fetch_all(
        "study_materials",
        "id,faculty_uid,status,branch",
        "id"
    )

    institution_map = {
        row["id"]: row for row in institutions
    }

    details_map = {
        row["firebase_uid"]: row for row in details
    }

    material_counts = Counter()
    published_counts = Counter()
    material_branches = {}

    for row in materials:

        uid = row.get("faculty_uid")

        if not uid or row.get("status") == "deleted":
            continue

        material_counts[uid] += 1

        if row.get("status") == "published":
            published_counts[uid] += 1

        if row.get("branch"):
            material_branches.setdefault(uid, set()).add(
                row["branch"]
            )

    users = {}

    for offset in range(0, len(profiles), 100):

        batch = profiles[offset:offset + 100]

        result = auth.get_users([
            UidIdentifier(row["firebase_uid"])
            for row in batch
        ])

        users.update({
            user.uid: user for user in result.users
        })

    rows = []

    for profile in profiles:

        uid = profile["firebase_uid"]
        user = users.get(uid)

        institution = institution_map.get(
            profile.get("institution_id"), {}
        )

        detail = details_map.get(uid, {})

        rows.append({
            "uid": uid,
            "faculty_id": detail.get("faculty_id"),
            "full_name": profile.get("full_name"),
            "email": user.email if user else profile.get("email"),
            "institution_id": profile.get("institution_id"),
            "institution_name": institution.get("name"),
            "college_code": institution.get("college_code"),
            "institution": institution or None,
            "district": institution.get("district"),
            "branch": profile.get("faculty_branch"),
            "material_branches": sorted(
                material_branches.get(uid, set())
            ),
            "approval_status": profile.get("approval_status"),
            "status": account_status(profile, user),
            "email_verified": (
                user.email_verified if user else None
            ),
            "materials": material_counts[uid],
            "published_materials": published_counts[uid],
            "created_at": profile.get("created_at"),
            "rejection_reason": profile.get("rejection_reason")
        })

    rows.sort(
        key=lambda row: row.get("created_at") or "",
        reverse=True
    )

    stats = {
        "total": len(rows),
        "active": sum(r["status"] == "active" for r in rows),
        "pending": sum(
            r["approval_status"] == "pending" for r in rows
        ),
        "suspended": sum(
            r["status"] == "suspended" for r in rows
        )
    }

    return jsonify({
        "faculty": rows,
        "stats": stats,
        "institutions": institutions,
        "branches": BRANCHES
    })


@admin_faculty_bp.get("/api/admin/faculty/<uid>")
@admin_only
def view_faculty(uid):

    profile = faculty_profile(uid)

    if not profile:
        return jsonify({"error": "Faculty not found"}), 404

    user = firebase_user(uid)

    materials = fetch_all(
        "study_materials",
        "id,title,branch,semester,material_type,status,created_at",
        "id",
        {"faculty_uid": uid}
    )

    return jsonify({
        "profile": serialize_profile(profile),
        "status": account_status(profile, user),
        "email_verified": user.email_verified if user else None,
        "materials": [
            row for row in materials
            if row.get("status") != "deleted"
        ]
    })


@admin_faculty_bp.post("/api/admin/faculty/<uid>/<action>")
@admin_only
def manage_faculty(uid, action):

    if uid == g.firebase_uid:
        return jsonify({"error": "Cannot modify your own account"}), 403

    profile = faculty_profile(uid)

    if not profile:
        return jsonify({"error": "Faculty not found"}), 404

    user = firebase_user(uid)

    if not user:
        return jsonify({"error": "Firebase account not found"}), 409

    approval = profile.get("approval_status")

    db = get_supabase()

    def update_profile(values, expected_approval):

        result = (
            db.table("profiles")
            .update(values)
            .eq("firebase_uid", uid)
            .eq("role", "faculty")
            .eq("approval_status", expected_approval)
            .execute()
        )

        return bool(result.data)

    if action == "approve":

        complete_profile = serialize_profile(profile)
        issues = profile_integrity_issues(complete_profile)

        if issues:
            return jsonify({
                "error": "Faculty profile is incomplete",
                "missing_fields": issues
            }), 409

        if approval != "pending":
            return jsonify({"error": "Application is not pending"}), 409

        if not user.email_verified:
            return jsonify({
                "error": "Faculty must verify their email first"
            }), 409

        if user.disabled:
            return jsonify({
                "error": "Firebase account is disabled"
            }), 409

        changed = update_profile({
            "approval_status": "approved",
            "approved_by": g.firebase_uid,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "rejection_reason": None
        }, "pending")

        if not changed:
            return jsonify({"error": "Application changed. Refresh."}), 409

    elif action == "reject":

        if approval != "pending":
            return jsonify({"error": "Application is not pending"}), 409

        body = request.get_json(silent=True) or {}
        reason = body.get("reason")

        if not isinstance(reason, str) or not reason.strip():
            return jsonify({"error": "Rejection reason is required"}), 400

        if len(reason) > 500:
            return jsonify({"error": "Reason is too long"}), 400

        changed = update_profile({
            "approval_status": "rejected",
            "rejection_reason": reason.strip()
        }, "pending")

        if not changed:
            return jsonify({"error": "Application changed. Refresh."}), 409

        auth.revoke_refresh_tokens(uid)

    elif action == "suspend":

        if approval != "approved" or user.disabled:
            return jsonify({"error": "Account is not active"}), 409

        auth.update_user(uid, disabled=True)
        auth.revoke_refresh_tokens(uid)

    elif action == "reactivate":

        if approval != "approved" or not user.disabled:
            return jsonify({"error": "Account is not suspended"}), 409

        if not user.email_verified:
            return jsonify({"error": "Email verification required"}), 409

        auth.update_user(uid, disabled=False)

    else:
        return jsonify({"error": "Unknown action"}), 400

    current_app.logger.info(
        "Faculty action=%s admin=%s target=%s",
        action, g.firebase_uid, uid
    )

    return jsonify({
        "message": "Faculty " + action + " completed"
    })


def remove_faculty_account(uid):

    if uid == g.firebase_uid:
        raise ValueError("Cannot remove your own account")

    profile = faculty_profile(uid)

    if not profile:
        raise ValueError("Faculty profile not found")

    user = firebase_user(uid)

    # Disable access before deleting the profile.
    if user:
        auth.update_user(uid, disabled=True)
        auth.revoke_refresh_tokens(uid)

    # Delete only the faculty profile.
    # faculty_details is removed by the existing CASCADE.
    # Do not delete study_materials or storage objects.
    get_supabase().table("profiles").delete().eq(
        "firebase_uid", uid
    ).eq(
        "role", "faculty"
    ).execute()

    if get_profile(uid):
        raise RuntimeError("Faculty profile deletion failed")

    if user:
        try:
            auth.delete_user(uid)
        except auth.UserNotFoundError:
            pass
        except Exception:
            current_app.logger.exception(
                "Firebase cleanup failed for faculty %s", uid
            )
            return {
                "uid": uid,
                "success": False,
                "error": (
                    "Profile removed; disabled Firebase account "
                    "requires manual cleanup."
                )
            }

    current_app.logger.info(
        "Faculty removed admin=%s target=%s",
        g.firebase_uid, uid
    )

    return {"uid": uid, "success": True}


@admin_faculty_bp.delete("/api/admin/faculty/<uid>")
@admin_only
def delete_faculty(uid):

    try:
        result = remove_faculty_account(uid)

        return jsonify(result), (
            200 if result["success"] else 503
        )

    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@admin_faculty_bp.post("/api/admin/faculty/bulk-remove")
@admin_only
def bulk_remove_faculty():

    body = request.get_json(silent=True) or {}
    uids = body.get("uids")

    if (
        not isinstance(uids, list)
        or not 1 <= len(uids) <= 50
        or not all(
            isinstance(uid, str) and 1 <= len(uid) <= 128
            for uid in uids
        )
    ):
        return jsonify({
            "error": "Select between 1 and 50 faculty accounts"
        }), 400

    results = []

    for uid in dict.fromkeys(uids):

        try:
            results.append(remove_faculty_account(uid))

        except ValueError as error:
            results.append({
                "uid": uid,
                "success": False,
                "error": str(error)
            })

        except Exception:
            current_app.logger.exception(
                "Bulk faculty removal failed: %s", uid
            )

            results.append({
                "uid": uid,
                "success": False,
                "error": "Removal failed. Check backend logs."
            })

    return jsonify({
        "removed": sum(r["success"] for r in results),
        "failed": sum(not r["success"] for r in results),
        "results": results
    })
