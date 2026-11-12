import os
import requests

from services import ollama_service

from services.model_router import (
    select_model,
    FAST_MODEL,
    BALANCED_MODEL,
    ADVANCED_MODEL
)


def get_active_provider():

    provider = os.getenv(
        "AI_PROVIDER", "ollama"
    ).strip().lower()

    if provider != "ollama":
        raise RuntimeError("Only Ollama is configured")

    return provider


def get_ai_model():
    return BALANCED_MODEL


def check_ai():

    result = ollama_service.check_ollama()

    return {
        **result,
        "provider": "ollama",
        "mode": "automatic",
        "cloud_enabled": False,
        "models": [
            FAST_MODEL,
            BALANCED_MODEL,
            ADVANCED_MODEL
        ]
    }


def normalize_history(history):
    return ollama_service.normalize_history(history)


def get_fallback_model(model):

    if model == BALANCED_MODEL:
        return ADVANCED_MODEL

    return BALANCED_MODEL


def generate_ai_response(
    message, role="student", history=None
):

    get_active_provider()

    model = select_model(
        message, role, history
    )

    token = ollama_service.MODEL_OVERRIDE.set(model)

    try:

        return ollama_service.generate_ai_response(
            message,
            role=role,
            history=history
        )

    except requests.RequestException:

        fallback = get_fallback_model(model)

        ollama_service.MODEL_OVERRIDE.set(fallback)

        return ollama_service.generate_ai_response(
            message,
            role=role,
            history=history
        )

    finally:
        ollama_service.MODEL_OVERRIDE.reset(token)


def stream_ai_response(
    message, role="student", history=None
):

    get_active_provider()

    model = select_model(
        message, role, history
    )

    token = ollama_service.MODEL_OVERRIDE.set(model)

    started = False

    try:

        for event in ollama_service.stream_ai_response(
            message,
            role=role,
            history=history
        ):

            if event.get("type") == "token":
                started = True

            yield event

    except requests.RequestException:

        # Never restart an answer after displaying text.
        if started:
            raise

        fallback = get_fallback_model(model)

        ollama_service.MODEL_OVERRIDE.set(fallback)

        yield from ollama_service.stream_ai_response(
            message,
            role=role,
            history=history
        )

    finally:
        ollama_service.MODEL_OVERRIDE.reset(token)
