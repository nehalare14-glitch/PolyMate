from functools import wraps

from flask import Blueprint, jsonify, g, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.gmail_service import gmail_configured, send_test_email


admin_email_bp = Blueprint(
    "admin_email",
    __name__,
    url_prefix="/api/admin/email",
)


def admin_only(view):
    @wraps(view)
    @require_firebase_auth
    def wrapped(*args, **kwargs):
        if not g.firebase_email_verified:
            return jsonify({
                "error": "Email verification required"
            }), 403

        try:
            profile = get_profile(g.firebase_uid)
        except Exception:
            current_app.logger.warning(
                "Admin email profile lookup failed"
            )
            return jsonify({
                "error": "Profile service unavailable"
            }), 503

        if not profile or profile.get("role") != "admin":
            return jsonify({
                "error": "Administrator access required"
            }), 403

        return view(*args, **kwargs)

    return wrapped


@admin_email_bp.after_request
def disable_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@admin_email_bp.get("/status")
@admin_only
def email_status():
    return jsonify({
        "provider": "gmail",
        "configured": gmail_configured(),
    })


@admin_email_bp.post("/test")
@admin_only
def test_email():
    if not gmail_configured():
        return jsonify({
            "error": "Gmail configuration is incomplete"
        }), 503

    try:
        result = send_test_email()

        return jsonify({
            "success": True,
            "message": "Test email accepted by Gmail",
            "provider": result["provider"],
            "message_id": result["message_id"],
        })

    except Exception as exc:
        current_app.logger.warning(
            "Gmail test failed: %s",
            type(exc).__name__,
        )

        return jsonify({
            "success": False,
            "error": "Gmail email sending failed"
        }), 502
