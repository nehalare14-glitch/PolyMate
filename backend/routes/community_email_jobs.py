import os
import hmac

from flask import Blueprint, jsonify, request, current_app

from services.community_email_processor import (
    process_community_emails,
)

community_email_jobs_bp = Blueprint(
    "community_email_jobs",
    __name__,
    url_prefix="/api/internal/community-email",
)


@community_email_jobs_bp.after_request
def prevent_cache(response):
    response.headers["Cache-Control"] = "no-store"
    return response


@community_email_jobs_bp.post("/process")
def process_email_queue():

    expected_secret = os.getenv(
        "COMMUNITY_EMAIL_JOB_SECRET",
        "",
    ).strip()

    provided_secret = request.headers.get(
        "X-PolyMate-Job-Secret",
        "",
    )

    if len(expected_secret) < 32:
        return jsonify({
            "error": "Email processor unavailable"
        }), 503

    if not hmac.compare_digest(
        provided_secret.encode("utf-8"),
        expected_secret.encode("utf-8"),
    ):
        return jsonify({
            "error": "Unauthorized"
        }), 401

    enabled = os.getenv(
        "COMMUNITY_EMAIL_AUTO_ENABLED",
        "false",
    ).strip().lower() == "true"

    if not enabled:
        return jsonify({
            "success": False,
            "enabled": False,
            "error": "Automatic email processing is disabled",
        }), 503

    try:

        result = process_community_emails(
            batch_size=1,
        )

        status_code = (
            200 if result.get("success") else 503
        )

        return jsonify(result), status_code

    except Exception as exc:

        current_app.logger.error(
            "Community email processor failed: %s",
            type(exc).__name__,
        )

        return jsonify({
            "success": False,
            "error": "Email processing failed",
        }), 503