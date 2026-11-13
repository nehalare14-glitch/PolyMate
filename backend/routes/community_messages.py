from functools import wraps
from uuid import UUID

from flask import Blueprint, jsonify, g, request, current_app

from middleware.firebase_auth import require_firebase_auth
from services.profiles import get_profile
from services.supabase_client import get_supabase


community_messages_bp = Blueprint(
    "community_messages",
    __name__,
)


MESSAGE_FIELDS = (
    "id,request_id,sender_role,"
    "message,created_at"
)


def community_role(required_role):

    def decorator(view):

        @wraps(view)
        @require_firebase_auth
        def wrapped(*args, **kwargs):

            if not g.firebase_email_verified:
                return jsonify({
                    "error": "Email verification required"
                }), 403

            try:

                profile = get_profile(g.firebase_uid)

                if (
                    not profile
                    or profile.get("role") != required_role
                ):
                    return jsonify({
                        "error": "Access denied"
                    }), 403

                return view(*args, **kwargs)

            except Exception:

                current_app.logger.exception(
                    "Community conversation API failed"
                )

                return jsonify({
                    "error": "Community service temporarily unavailable"
                }), 503

        return wrapped

    return decorator


def valid_uuid(value):

    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError):
        return None


def find_request(request_id, role):

    query = (
        get_supabase()
        .table("community_requests")
        .select(
            "id,student_uid,status,"
            "ticket_number,category"
        )
        .eq("id", request_id)
    )

    if role == "student":
        query = query.eq(
            "student_uid",
            g.firebase_uid,
        )

    result = query.limit(1).execute()

    return result.data[0] if result.data else None


def read_messages(request_id, role):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    ticket = find_request(request_id, role)

    if not ticket:
        return jsonify({
            "error": "Request not found"
        }), 404

    try:

        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 50))

    except (ValueError, TypeError):

        return jsonify({
            "error": "Invalid pagination"
        }), 400

    if page < 1 or limit < 1 or limit > 100:
        return jsonify({
            "error": "Invalid pagination"
        }), 400

    offset = (page - 1) * limit

    result = (
        get_supabase()
        .table("community_messages")
        .select(MESSAGE_FIELDS, count="exact")
        .eq("request_id", request_id)
        .order("created_at", desc=True)
        .order("id", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    messages = list(reversed(result.data or []))

    return jsonify({
        "messages": messages,
        "total": result.count or 0,
        "page": page,
        "limit": limit,
        "status": ticket["status"],
        "ticket_number": ticket["ticket_number"],
        "can_reply": ticket["status"] in (
            "pending",
            "in_progress",
        ),
    })


def send_message(request_id, role):

    request_id = valid_uuid(request_id)

    if not request_id:
        return jsonify({
            "error": "Invalid request ID"
        }), 400

    ticket = find_request(request_id, role)

    if not ticket:
        return jsonify({
            "error": "Request not found"
        }), 404

    if ticket["status"] not in (
        "pending",
        "in_progress",
    ):
        return jsonify({
            "error": "This request is closed"
        }), 409

    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return jsonify({
            "error": "Invalid request body"
        }), 400

    message = payload.get("message")

    if not isinstance(message, str):
        return jsonify({
            "error": "Message is required"
        }), 400

    message = message.strip()

    if not 1 <= len(message) <= 2000:
        return jsonify({
            "error": "Message must contain 1 to 2000 characters"
        }), 400

    try:

        result = get_supabase().rpc(
            "community_send_message",
            {
                "p_sender_uid": g.firebase_uid,
                "p_request_id": request_id,
                "p_message": message,
            },
        ).execute()

    except Exception as exc:

        error_text = str(exc).lower()

        if "too many messages" in error_text:
            return jsonify({
                "error": "Too many messages. Try again shortly."
            }), 429

        if "this request is closed" in error_text:
            return jsonify({
                "error": "This request is closed"
            }), 409

        if "request not found" in error_text:
            return jsonify({
                "error": "Request not found"
            }), 404

        if "unauthorized sender" in error_text:
            return jsonify({
                "error": "Access denied"
            }), 403

        raise

    row = result.data

    if not isinstance(row, dict):
        raise RuntimeError(
            "Unexpected conversation RPC response"
        )

    return jsonify({
        "message": {
            "id": row["id"],
            "request_id": row["request_id"],
            "sender_role": row["sender_role"],
            "message": row["message"],
            "created_at": row["created_at"],
        },
    }), 201


@community_messages_bp.get(
    "/api/student/community/requests/<request_id>/messages"
)
@community_role("student")
def student_read_messages(request_id):

    return read_messages(
        request_id,
        "student",
    )


@community_messages_bp.post(
    "/api/student/community/requests/<request_id>/messages"
)
@community_role("student")
def student_send_message(request_id):

    return send_message(
        request_id,
        "student",
    )


@community_messages_bp.get(
    "/api/admin/community/requests/<request_id>/messages"
)
@community_role("admin")
def admin_read_messages(request_id):

    return read_messages(
        request_id,
        "admin",
    )


@community_messages_bp.post(
    "/api/admin/community/requests/<request_id>/messages"
)
@community_role("admin")
def admin_send_message(request_id):

    return send_message(
        request_id,
        "admin",
    )


@community_messages_bp.after_request
def prevent_conversation_cache(response):

    response.headers["Cache-Control"] = (
        "private, no-store"
    )

    return response
