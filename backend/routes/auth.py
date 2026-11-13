from flask import Blueprint, jsonify, g
from firebase_admin import auth as firebase_auth

from middleware.firebase_auth import require_firebase_auth
from services.profiles import (
    create_or_get_profile,
    get_profile,
    get_complete_profile,
    resolve_institution,
    serialize_profile,
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/register")
@require_firebase_auth
def register_user():
    from flask import request
    from services.supabase_client import get_supabase

    # A valid Firebase token is required.
    # Save registration details before email verification.
    # Dashboard and profile access still require verification.
    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({
            "error": "Registration details are required"
        }), 400

    name = body.get("full_name")
    code = body.get("institution_code")

    if not isinstance(name, str) or not 2 <= len(name.strip()) <= 80:
        return jsonify({
            "error": "Full name must contain 2 to 80 characters"
        }), 400

    if not isinstance(code, str) or not code.strip():
        return jsonify({
            "error": "Please select your institution"
        }), 400

    name = name.strip()
    code = code.strip()

    try:
        db = get_supabase()

        existing = get_profile(g.firebase_uid)

        if existing and existing.get("role") != "student":
            return jsonify({
                "error": "This account has a different role"
            }), 409

        try:
            college = resolve_institution(code)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

        profile = create_or_get_profile(
            uid=g.firebase_uid,
            email=g.firebase_email,
            name=name,
            institution_id=college["id"]
        )

        if profile.get("role") != "student":
            return jsonify({
                "error": "This account has a different role"
            }), 409

        # Repair missing fields only.
        # Do not overwrite previously saved profile details.
        if not profile.get("full_name"):
            db.table("profiles").update({
                "full_name": name
            }).eq(
                "firebase_uid", g.firebase_uid
            ).eq(
                "role", "student"
            ).is_(
                "full_name", "null"
            ).execute()

            db.table("profiles").update({
                "full_name": name
            }).eq(
                "firebase_uid", g.firebase_uid
            ).eq(
                "role", "student"
            ).eq(
                "full_name", ""
            ).execute()

        if profile.get("institution_id") is None:
            db.table("profiles").update({
                "institution_id": college["id"]
            }).eq(
                "firebase_uid", g.firebase_uid
            ).eq(
                "role", "student"
            ).is_(
                "institution_id", "null"
            ).execute()

        profile = get_profile(g.firebase_uid)

        if (
            not profile
            or not profile.get("full_name")
            or profile.get("institution_id") is None
        ):
            return jsonify({
                "error": "Registration details were not saved. Please try again."
            }), 503

        profile = serialize_profile(profile)

        return jsonify({
            "message": "Student registration completed",
            "user": profile
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to register student profile"
        }), 503

@auth_bp.get("/api/me")
@require_firebase_auth
def current_user():
    if not g.firebase_email_verified:
        return jsonify({
            "error": "Email verification required"
        }), 403

    try:
        profile = get_complete_profile(g.firebase_uid)

        if not profile:
            return jsonify({
                "error": "Profile not found"
            }), 404

        return jsonify({
            "user": profile
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to retrieve user profile"
        }), 503


@auth_bp.patch("/api/me")
@require_firebase_auth
def update_current_user():
    from flask import request
    from services.supabase_client import get_supabase

    if not g.firebase_email_verified:
        return jsonify({"error": "Email verification required"}), 403

    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({"error": "A JSON object is required"}), 400

    # Only these profile fields may be edited by the user.
    if set(body.keys()) != {"full_name"}:
        return jsonify({
            "error": "Only full_name can be updated"
        }), 400

    name = body["full_name"]

    if not isinstance(name, str):
        return jsonify({"error": "Name must be text"}), 400

    name = name.strip()

    if not 2 <= len(name) <= 80:
        return jsonify({
            "error": "Name must contain 2 to 80 characters"
        }), 400

    try:
        existing = get_profile(g.firebase_uid)

        if not existing:
            return jsonify({"error": "Profile not found"}), 404

        result = (
            get_supabase()
            .table("profiles")
            .update({"full_name": name})
            .eq("firebase_uid", g.firebase_uid)
            .execute()
        )

        if not result.data:
            return jsonify({"error": "Profile update failed"}), 503

        return jsonify({
            "message": "Profile updated successfully",
            "user": serialize_profile(result.data[0])
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to update profile"
        }), 503


@auth_bp.post("/api/admin/sync-email")
@require_firebase_auth
def sync_admin_email():
    from services.supabase_client import get_supabase
    import time

    # Reuse claims verified by require_firebase_auth.
    claims = g.firebase_claims

    if claims.get("uid") != g.firebase_uid:
        return jsonify({"error": "Identity mismatch"}), 403

    auth_time = claims.get("auth_time", 0)

    if not isinstance(auth_time, (int, float)):
        return jsonify({"error": "Recent authentication required"}), 403

    age = time.time() - auth_time

    if age < -60 or age > 300:
        return jsonify({
            "error": "Please reauthenticate before changing your email"
        }), 403

    if not g.firebase_email_verified:
        return jsonify({"error": "Email verification required"}), 403

    try:
        profile = get_profile(g.firebase_uid)

        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        if profile.get("role") != "admin":
            return jsonify({"error": "Access denied"}), 403

        firebase_user = firebase_auth.get_user(g.firebase_uid)

        if not firebase_user.email or not firebase_user.email_verified:
            return jsonify({
                "error": "Firebase email must be verified"
            }), 403

        new_email = firebase_user.email.strip().lower()

        # Reject an email already assigned to another PolyMate profile.
        duplicate = (
            get_supabase()
            .table("profiles")
            .select("firebase_uid")
            .eq("email", new_email)
            .neq("firebase_uid", g.firebase_uid)
            .limit(1)
            .execute()
        )

        if duplicate.data:
            return jsonify({
                "error": "Email is already associated with another account"
            }), 409

        # Never change UID, role or approval status.
        result = (
            get_supabase()
            .table("profiles")
            .update({"email": new_email})
            .eq("firebase_uid", g.firebase_uid)
            .eq("role", profile["role"])
            .execute()
        )

        if not result.data:
            return jsonify({
                "error": "Unable to synchronize email"
            }), 503

        return jsonify({
            "message": "Official email synchronized successfully",
            "user": serialize_profile(result.data[0])
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to synchronize official email"
        }), 503




@auth_bp.post("/api/faculty/sync-email")
@require_firebase_auth
def sync_faculty_email():
    import time
    from services.supabase_client import get_supabase

    # Reuse claims verified by require_firebase_auth.
    claims = g.firebase_claims

    if claims.get("uid") != g.firebase_uid:
        return jsonify({"error": "Identity mismatch"}), 403

    if not claims.get("email_verified", False):
        return jsonify({"error": "Verified email required"}), 403

    auth_time = claims.get("auth_time", 0)

    if not isinstance(auth_time, (int, float)):
        return jsonify({"error": "Recent sign-in required"}), 403

    age = time.time() - auth_time

    if age < -60 or age > 300:
        return jsonify({
            "error": "Please sign in again before synchronizing your email"
        }), 403

    try:
        profile = get_profile(g.firebase_uid)

        if not profile:
            return jsonify({"error": "Profile not found"}), 404

        if profile.get("role") != "faculty":
            return jsonify({"error": "Faculty access required"}), 403

        firebase_user = firebase_auth.get_user(g.firebase_uid)

        if not firebase_user.email or not firebase_user.email_verified:
            return jsonify({"error": "Verified Firebase email required"}), 403

        new_email = firebase_user.email.strip().lower()

        client = get_supabase()

        duplicate = (
            client.table("profiles")
            .select("firebase_uid")
            .eq("email", new_email)
            .neq("firebase_uid", g.firebase_uid)
            .limit(1)
            .execute()
        )

        if duplicate.data:
            return jsonify({
                "error": "Email is already linked to another PolyMate account"
            }), 409

        result = (
            client.table("profiles")
            .update({"email": new_email})
            .eq("firebase_uid", g.firebase_uid)
            .eq("role", "faculty")
            .execute()
        )

        if not result.data:
            return jsonify({"error": "Email synchronization failed"}), 503

        return jsonify({
            "message": "Faculty email synchronized successfully",
            "user": serialize_profile(result.data[0])
        }), 200

    except Exception:
        return jsonify({"error": "Unable to synchronize faculty email"}), 503
