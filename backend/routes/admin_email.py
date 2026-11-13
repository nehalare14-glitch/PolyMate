import os
from functools import wraps

from flask import Blueprint, jsonify, g, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.supabase_client import get_supabase
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
    configured = gmail_configured()

    auto_enabled = (
        os.getenv(
            "COMMUNITY_EMAIL_AUTO_ENABLED", ""
        ).strip().lower() == "true"
    )

    secret_configured = len(
        os.getenv(
            "COMMUNITY_EMAIL_JOB_SECRET", ""
        ).strip()
    ) >= 32

    scheduler_active = None
    scheduler_configured = None
    scheduler_schedule = None

    try:
        result = get_supabase().rpc(
            "community_email_scheduler_status",
            {},
        ).execute().data

        if (
            not isinstance(result, dict)
            or not isinstance(
                result.get("active"), bool
            )
            or not isinstance(
                result.get("configured"), bool
            )
        ):
            raise RuntimeError(
                "Invalid scheduler status"
            )

        scheduler_active = result["active"]
        scheduler_configured = result["configured"]
        scheduler_schedule = result.get("schedule")

    except Exception as exc:
        current_app.logger.warning(
            "Email scheduler status unavailable: %s",
            type(exc).__name__,
        )

    if not auto_enabled or not configured or not secret_configured:
        automatic_active = False
    elif scheduler_active is None:
        automatic_active = None
    else:
        automatic_active = (
            scheduler_active
            and scheduler_configured is True
        )

    return jsonify({
        "provider": "gmail",
        "configured": configured,
        "auto_enabled": auto_enabled,
        "scheduler_configured": scheduler_configured,
        "scheduler_active": scheduler_active,
        "scheduler_schedule": scheduler_schedule,
        "automatic_active": automatic_active,
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
