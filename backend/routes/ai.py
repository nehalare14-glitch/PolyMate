
from threading import BoundedSemaphore

import requests

from flask import Blueprint, jsonify, request, current_app, g


from middleware.role_auth import require_role


from services.ai_provider import (
    check_ai,
    get_ai_model,
    normalize_history,
)

from services.ai_provider import (
    generate_ai_response,
    stream_ai_response
)


ai_bp = Blueprint("ai", __name__)

ai_slots = BoundedSemaphore(1)


@ai_bp.get("/api/ai/health")
@require_role("student", "faculty")
def ai_health():

    try:
        return jsonify(check_ai())

    except requests.RequestException:
        return jsonify({
            "status": "offline",
            "model": get_ai_model(),
            "error": "AI provider is unavailable"
        }), 503


@ai_bp.post("/api/ai/chat")
@require_role("student", "faculty")
def ai_chat():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid JSON request"
        }), 400

    message = data.get("message")

    if not isinstance(message, str):
        return jsonify({
            "error": "Message must be text"
        }), 400

    message = message.strip()

    if not message:
        return jsonify({
            "error": "Please enter a question"
        }), 400

    if len(message) > 2000:
        return jsonify({
            "error": "Question must not exceed 2000 characters"
        }), 400

    try:
        history = normalize_history(data.get("history"))
    except ValueError as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    if not ai_slots.acquire(blocking=False):
        return jsonify({
            "error": "AI is busy. Please try again shortly."
        }), 429

    try:

        role = g.current_profile["role"]

        result = generate_ai_response(
            message,
            role=role,
            history=history
        )

        return jsonify({
            "success": True,
            "answer": result["answer"],
            "model": result["model"]
        })

    except requests.Timeout:
        return jsonify({
            "error": "AI response timed out. Please try again."
        }), 504

    except requests.RequestException:

        current_app.logger.exception(
            "AI provider request failed"
        )

        return jsonify({
            "error": "AI server is temporarily unavailable"
        }), 503

    except Exception:

        current_app.logger.exception(
            "AI generation failed"
        )

        return jsonify({
            "error": "Unable to generate an AI response"
        }), 500

    finally:
        ai_slots.release()


import json

from flask import Response, stream_with_context



@ai_bp.post("/api/ai/chat/stream")
@require_role("student", "faculty")
def ai_chat_stream():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "error": "Invalid JSON request"
        }), 400

    message = data.get("message")

    if not isinstance(message, str):
        return jsonify({
            "error": "Message must be text"
        }), 400

    message = message.strip()

    if not message:
        return jsonify({
            "error": "Please enter a question"
        }), 400

    if len(message) > 2000:
        return jsonify({
            "error": "Question must not exceed 2000 characters"
        }), 400

    try:
        history = normalize_history(data.get("history"))
    except ValueError as exc:
        return jsonify({
            "error": str(exc)
        }), 400

    role = g.current_profile["role"]
    uid = g.firebase_uid
    logger = current_app.logger

    def encode(event):
        return json.dumps(
            event,
            ensure_ascii=False
        ) + "\n"

    def generate():

        if not ai_slots.acquire(blocking=False):
            yield encode({
                "type": "error",
                "error": "AI is busy. Please try again shortly."
            })
            return

        try:
            yield encode({
                "type": "start",
                "model": get_ai_model()
            })

            for event in stream_ai_response(
                message,
                role=role,
                history=history
            ):
                yield encode(event)

        except GeneratorExit:
            raise

        except requests.Timeout:
            yield encode({
                "type": "error",
                "error": "AI response timed out. Please try again."
            })

        except requests.RequestException:
            logger.exception("AI provider streaming request failed")

            yield encode({
                "type": "error",
                "error": "AI server is temporarily unavailable."
            })

        except Exception:
            logger.exception("AI streaming generation failed")

            yield encode({
                "type": "error",
                "error": "Unable to complete the AI response."
            })

        finally:
            ai_slots.release()

    return Response(
        stream_with_context(generate()),
        mimetype="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no"
        }
    )
