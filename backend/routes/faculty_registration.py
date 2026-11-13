from flask import Blueprint, jsonify, g, request
from firebase_admin import auth as firebase_auth

from middleware.firebase_auth import require_firebase_auth
from services.profiles import (
    create_faculty_application,
    resolve_institution,
    serialize_profile,
)

faculty_registration_bp = Blueprint(
    "faculty_registration",
    __name__
)


@faculty_registration_bp.post("/api/auth/register/faculty")
@require_firebase_auth
def register_faculty():

    # Registration can save a pending profile before verification.
    # Firebase authentication is still required.
    # Admin approval and dashboard access require verification.

    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({
            "error": "A JSON object is required"
        }), 400

    name = body.get("full_name")

    if not isinstance(name, str):
        return jsonify({
            "error": "Full name is required"
        }), 400

    name = name.strip()

    if not 2 <= len(name) <= 80:
        return jsonify({
            "error": "Name must contain 2 to 80 characters"
        }), 400

    branch = body.get("faculty_branch")

    allowed_branches = {
        "CSE", "ECE", "EEE", "MEC", "CIVIL", "AIML", "CCP"
    }

    if not isinstance(branch, str) or branch not in allowed_branches:
        return jsonify({
            "error": "Please select a valid faculty branch"
        }), 400

    institution_code = body.get("institution_code")

    if not isinstance(institution_code, str) or not institution_code.strip():
        return jsonify({
            "error": "Please select your institution"
        }), 400

    institution_code = institution_code.strip()

    if len(institution_code) > 20:
        return jsonify({
            "error": "Invalid institution code"
        }), 400

    try:
        try:
            institution = resolve_institution(institution_code)
        except ValueError as error:
            return jsonify({"error": str(error)}), 400

        institution_id = institution["id"]

        firebase_user = firebase_auth.get_user(g.firebase_uid)

        profile = create_faculty_application(
            uid=g.firebase_uid,
            email=firebase_user.email,
            name=name,
            faculty_branch=branch,
            institution_id=institution_id,
        )

        return jsonify({
            "message": "Faculty account registered successfully",
            "user": serialize_profile(profile),
        }), 200

    except ValueError as error:
        return jsonify({
            "error": str(error)
        }), 409

    except Exception:
        return jsonify({
            "error": "Unable to register faculty account"
        }), 503
