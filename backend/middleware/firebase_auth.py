from functools import wraps
from flask import request, jsonify, g
from firebase_admin import auth

def require_firebase_auth(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")

        if not authorization.startswith("Bearer "):
            return jsonify({"error": "Authentication required"}), 401

        token = authorization[7:].strip()

        if not token:
            return jsonify({"error": "Authentication required"}), 401

        try:
            decoded = auth.verify_id_token(token, check_revoked=True)
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        g.firebase_uid = decoded["uid"]
        g.firebase_email = decoded.get("email")
        g.firebase_email_verified = decoded.get(
            "email_verified", False
        )

        # Only student registration may run before verification.
        # All other protected routes require a verified email.
        if (
            not g.firebase_email_verified
            and request.endpoint != "auth.register_user"
        ):
            return jsonify({
                "error": "Email verification required"
            }), 403

        return view(*args, **kwargs)

    return wrapper
