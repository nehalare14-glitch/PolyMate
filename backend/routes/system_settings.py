import os

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, g, current_app

from middleware.role_auth import require_role
from services.supabase_client import get_supabase


system_settings_bp = Blueprint(
    "system_settings",
    __name__
)

THEME_KEY = "authentication_theme"
ALLOWED_THEMES = {"light", "dark"}


# Public API: Read authentication theme.

@system_settings_bp.get("/api/settings/auth-theme")
def get_authentication_theme():

    try:
        result = (
            get_supabase()
            .table("system_settings")
            .select("value,updated_at")
            .eq("key", THEME_KEY)
            .limit(1)
            .execute()
        )

        if not result.data:
            return jsonify({
                "theme": "light"
            }), 200

        setting = result.data[0]

        theme = setting.get("value", "light")

        if theme not in ALLOWED_THEMES:
            theme = "light"

        return jsonify({
            "theme": theme,
            "updated_at": setting.get("updated_at")
        }), 200

    except Exception:
        current_app.logger.exception(
            "Failed to read authentication theme"
        )

        return jsonify({
            "error": "Unable to load authentication theme"
        }), 503


# Protected API: Update authentication theme.

@system_settings_bp.patch(
    "/api/admin/settings/auth-theme"
)
@require_role("admin")
def update_authentication_theme():

    admin_uid = os.getenv(
        "POLYMATE_ADMIN_UID", ""
    ).strip()

    if not admin_uid or g.firebase_uid != admin_uid:
        return jsonify({
            "error": "Admin access denied."
        }), 403

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid request body."
        }), 400

    theme = data.get("theme")

    if (
        not isinstance(theme, str)
        or theme not in ALLOWED_THEMES
    ):
        return jsonify({
            "error": "Theme must be light or dark."
        }), 400

    try:
        updated_at = datetime.now(
            timezone.utc
        ).isoformat()

        (
            get_supabase()
            .table("system_settings")
            .upsert({
                "key": THEME_KEY,
                "value": theme,
                "updated_at": updated_at
            }, on_conflict="key")
            .execute()
        )

        return jsonify({
            "message": "Authentication theme updated.",
            "theme": theme,
            "updated_at": updated_at
        }), 200

    except Exception:
        current_app.logger.exception(
            "Failed to update authentication theme"
        )

        return jsonify({
            "error": "Unable to update authentication theme"
        }), 503
