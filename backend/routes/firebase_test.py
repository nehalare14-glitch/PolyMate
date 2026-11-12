from flask import Blueprint, jsonify, g
from middleware.firebase_auth import require_firebase_auth

firebase_test_bp = Blueprint("firebase_test", __name__)

@firebase_test_bp.get("/api/auth/firebase-test")
@require_firebase_auth
def firebase_test():
    return jsonify({
        "authenticated": True,
        "uid": g.firebase_uid,
        "email": g.firebase_email,
        "email_verified": g.firebase_email_verified
    })
