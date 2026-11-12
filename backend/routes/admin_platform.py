import os
import time

from datetime import datetime, timezone
from flask import Blueprint, jsonify, g, current_app
from firebase_admin import auth

from middleware.role_auth import require_role
from services.supabase_client import get_supabase


admin_platform_bp = Blueprint(
    "admin_platform",
    __name__
)

BUCKET = "study-materials"


def check_service(name, operation):
    started = time.perf_counter()

    try:
        operation()
        status = "operational"
        message = "Service is responding."

    except Exception:
        status = "unavailable"
        message = "Service check failed."

        current_app.logger.exception(
            "Health check failed: %s", name
        )

    return {
        "name": name,
        "status": status,
        "response_ms": round(
            (time.perf_counter() - started) * 1000
        ),
        "message": message
    }


def check_firebase():
    user = auth.get_user(g.firebase_uid)

    if user.disabled or not user.email_verified:
        raise RuntimeError(
            "Admin account verification failed."
        )


def check_database():
    result = (
        get_supabase()
        .table("profiles")
        .select("firebase_uid")
        .limit(1)
        .execute()
    )

    if result.data is None:
        raise RuntimeError("Database check failed.")


def check_storage():
    storage = get_supabase().storage

    bucket = storage.get_bucket(BUCKET)

    if bucket is None:
        raise RuntimeError("Bucket not found.")

    storage.from_(BUCKET).list(
        "",
        {"limit": 1}
    )


@admin_platform_bp.get("/api/admin/platform/health")
@require_role("admin")
def platform_health():

    admin_uid = os.getenv(
        "POLYMATE_ADMIN_UID", ""
    ).strip()

    if not admin_uid or g.firebase_uid != admin_uid:
        return jsonify({
            "error": "Admin access denied."
        }), 403

    services = [
        {
            "name": "Flask Backend",
            "status": "operational",
            "response_ms": None,
            "message": "Backend API is responding."
        },

        check_service(
            "Firebase Authentication",
            check_firebase
        ),

        check_service(
            "Supabase Database",
            check_database
        ),

        check_service(
            "Supabase PDF Storage",
            check_storage
        )
    ]

    count = sum(
        service["status"] == "operational"
        for service in services
    )

    response = jsonify({
        "overall_status": (
            "operational"
            if count == len(services)
            else "degraded"
        ),
        "operational_count": count,
        "total_services": len(services),
        "checked_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "services": services
    })

    response.headers["Cache-Control"] = "no-store"

    return response, 200
