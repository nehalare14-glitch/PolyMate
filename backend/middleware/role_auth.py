from functools import wraps

from flask import g, jsonify

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile


def require_role(*allowed_roles):
    """
    Verify Firebase authentication, email verification,
    Supabase role, and faculty approval status.
    """

    def decorator(view):

        @wraps(view)
        @require_firebase_auth
        def wrapper(*args, **kwargs):

            if not g.firebase_email_verified:
                return jsonify({
                    "error": "Email verification required"
                }), 403

            try:
                profile = get_profile(g.firebase_uid)
            except Exception:
                return jsonify({
                    "error": "Unable to verify permissions"
                }), 503

            if not profile:
                return jsonify({
                    "error": "User profile not found"
                }), 403

            role = profile.get("role")

            if role not in allowed_roles:
                return jsonify({
                    "error": "Access denied"
                }), 403

            # Faculty must be explicitly approved.
            if role == "faculty":
                if profile.get("approval_status") != "approved":
                    return jsonify({
                        "error": "Faculty account is not approved",
                        "approval_status": profile.get(
                            "approval_status", "pending"
                        )
                    }), 403

            g.current_profile = profile
            g.current_role = role

            return view(*args, **kwargs)

        return wrapper

    return decorator
