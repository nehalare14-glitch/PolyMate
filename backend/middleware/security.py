import os

from flask import request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def api_limit():
    path = request.path
    method = request.method

    if path in (
        "/api/auth/register",
        "/api/auth/register/faculty",
    ):
        return "5 per minute"

    if path.endswith("/preview"):
        return "30 per minute"

    if (
        path == "/api/faculty/materials/upload"
        or path.endswith("/replace")
    ):
        return "10 per minute"

    if path.startswith("/api/admin/"):
        return "60 per minute"

    return "120 per minute"


def skip_rate_limit():
    return (
        request.method == "OPTIONS"
        or request.path == "/api/health"
        or not request.path.startswith("/api/")
    )


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[api_limit],
    storage_uri=os.getenv(
        "RATELIMIT_STORAGE_URI",
        "memory://",
    ),
    headers_enabled=True,
    strategy="fixed-window",
)


def init_security(app):

    limiter.init_app(app)
    limiter.request_filter(skip_rate_limit)

    # Allow 20 MB PDFs plus multipart form overhead.
    app.config["MAX_CONTENT_LENGTH"] = 22 * 1024 * 1024

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            "error": "Too many requests. Please try again later."
        }), 429

    @app.errorhandler(413)
    def request_too_large(error):
        return jsonify({
            "error": "The uploaded file is too large."
        }), 413

    @app.after_request
    def security_headers(response):

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"

        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )

        if request.path.startswith("/api/"):
            response.headers["Cache-Control"] = "private, no-store"

        return response
