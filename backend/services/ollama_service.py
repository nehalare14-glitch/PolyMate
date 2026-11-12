import os
import requests


def get_ollama_url():
    return os.getenv(
        "OLLAMA_BASE_URL",
        "http://127.0.0.1:11434"
    ).rstrip("/")


def get_ollama_model():
    selected = MODEL_OVERRIDE.get()
    if selected:
        return selected
    return os.getenv(
        "OLLAMA_MODEL",
        "qwen2.5:3b"
    )


def check_ollama():

    response = requests.get(
        f"{get_ollama_url()}/api/tags",
        timeout=5
    )

    response.raise_for_status()

    models = response.json().get("models", [])

    return {
        "status": "online",
        "model": get_ollama_model(),
        "model_available": any(
            item.get("name") == get_ollama_model()
            for item in models
        )
    }


def get_system_prompt(role):

    common = (
        "You are PolyMate AI, an educational assistant "
        "for diploma and polytechnic education in Telangana. "
        "Support CSE, ECE, EEE, Mechanical, Civil, AIML and CCP. "
        "Use clear English and accurate explanations. Answer directly and concisely. Avoid unnecessary introductions and repetition. Give detailed explanations only when requested. "
        "Use Markdown headings, lists, tables and code when helpful. "
        "Admit uncertainty and do not invent facts or references. "
        "Do not claim to know official exam questions or syllabus "
        "details unless the user provides reliable information. "
    )

    if role == "faculty":

        return common + (
            "You are assisting a faculty member. "
            "Help prepare teaching notes, lesson plans, "
            "practice question papers, MCQs, assignments, "
            "lab exercises and classroom explanations. "
            "Include learning objectives and answer keys when requested. "
            "Match the difficulty to diploma students. "
            "Treat generated materials as drafts requiring faculty review. "
            "Never claim that a draft is an official examination paper."
        )

    return common + (
        "You are assisting a diploma student. "
        "Explain concepts in simple language. "
        "Help with doubts, exam preparation and revision notes. "
        "Use practical examples and step-by-step explanations. "
        "Encourage understanding rather than memorization. "
        "When solving problems, explain the method."
    )



def get_instant_response(message, role="student"):
    import re

    text = re.sub(
        r"[.!?]+$",
        "",
        message.strip().lower()
    ).strip()

    greetings = {
        "hi", "hello", "hey", "hii", "hiii",
        "helo", "hi there", "hello there"
    }

    if text in greetings:
        if role == "faculty":
            return "Hello! How can I help you with teaching today?"

        return "Hello! How can I help you with your studies today?"

    if text == "good morning":
        return "Good morning! How can I help you today?"

    if text == "good afternoon":
        return "Good afternoon! How can I help you today?"

    if text == "good evening":
        return "Good evening! How can I help you today?"

    if text in {"thanks", "thank you", "thankyou", "thank you so much"}:
        return "You're welcome! Happy to help."

    if text in {"bye", "goodbye", "see you"}:
        return "Goodbye! Have a great day."

    return None


def normalize_history(history):
    if history is None:
        return []

    if not isinstance(history, list):
        raise ValueError("History must be a list")

    if len(history) > 6:
        raise ValueError("History must not exceed 6 messages")

    if len(history) % 2 != 0:
        raise ValueError("History must contain complete message pairs")

    cleaned = []

    for index, item in enumerate(history):
        if not isinstance(item, dict):
            raise ValueError("Invalid history message")

        expected_role = "user" if index % 2 == 0 else "assistant"

        if item.get("role") != expected_role:
            raise ValueError("Invalid conversation role")

        content = item.get("content")

        if not isinstance(content, str):
            raise ValueError("History content must be text")

        content = content.strip()

        if not content:
            raise ValueError("History content cannot be empty")

        cleaned.append({
            "role": expected_role,
            "content": content[:1000]
        })

    # Keep the newest complete pairs within a small budget.
    while cleaned and sum(
        len(item["content"]) for item in cleaned
    ) > 1800:
        cleaned = cleaned[2:]

    return cleaned


def build_chat_messages(message, role, history=None):
    previous = normalize_history(history)

    # Preserve more context space for longer questions.
    budget = max(0, 1800 - len(message))

    while previous and sum(
        len(item["content"]) for item in previous
    ) > budget:
        previous = previous[2:]

    return [
        {
            "role": "system",
            "content": get_dynamic_system_prompt(role)
        },
        *previous,
        {
            "role": "user",
            "content": message
        }
    ]


def generate_ai_response(message, role="student", history=None):

    instant = get_instant_response(message, role)

    if instant is not None:
        return {
            "answer": instant,
            "model": get_ollama_model()
        }


    payload = {
        "model": get_ollama_model(),

        "messages": build_chat_messages(
            message, role, history
        ),

        "stream": False,

        "options": {
            "temperature": 0.3,
            "num_ctx": get_model_options()["num_ctx"],
            "num_predict": get_model_options()["num_predict"]
        },

        "keep_alive": "120m"
    }

    response = requests.post(
        f"{get_ollama_url()}/api/chat",
        json=payload,
        timeout=(5, 180)
    )

    response.raise_for_status()

    result = response.json()

    answer = result.get(
        "message", {}
    ).get("content", "").strip()

    if not answer:
        raise ValueError("AI returned an empty response")

    return {
        "answer": answer,
        "model": result.get(
            "model",
            get_ollama_model()
        )
    }


def stream_ai_response(message, role="student", history=None):

    instant = get_instant_response(message, role)

    if instant is not None:
        yield {
            "type": "token",
            "content": instant
        }

        yield {
            "type": "done",
            "model": get_ollama_model(),
            "done_reason": "stop"
        }

        return

    import json

    payload = {
        "model": get_ollama_model(),
        "messages": build_chat_messages(
            message, role, history
        ),
        "stream": True,
        "options": {
            "temperature": 0.3,
            "num_ctx": get_model_options()["num_ctx"],
            "num_predict": get_model_options()["num_predict"]
        },
        "keep_alive": "120m"
    }

    with requests.post(
        f"{get_ollama_url()}/api/chat",
        json=payload,
        stream=True,
        timeout=(5, 180)
    ) as response:

        response.raise_for_status()

        received_text = False
        completed = False

        for line in response.iter_lines(chunk_size=1):

            if not line:
                continue

            data = json.loads(line)

            if data.get("error"):
                raise RuntimeError(data["error"])

            text = data.get("message", {}).get("content", "")

            if text:
                received_text = True

                yield {
                    "type": "token",
                    "content": text
                }

            if data.get("done"):
                if not received_text:
                    raise ValueError("AI returned an empty response")

                completed = True

                yield {
                    "type": "done",
                    "model": data.get(
                        "model",
                        get_ollama_model()
                    ),
                    "done_reason": data.get("done_reason")
                }

                break

        if not completed:
            raise RuntimeError("AI stream ended unexpectedly")



from contextvars import ContextVar

MODEL_OVERRIDE = ContextVar(
    "polymate_model_override",
    default=None
)


def get_model_options():
    model = get_ollama_model()

    if model == "qwen2.5:0.5b":
        return {
            "num_ctx": 1024,
            "num_predict": 128
        }

    if model == "qwen2.5:1.5b":
        return {
            "num_ctx": 2048,
            "num_predict": 384
        }

    return {
        "num_ctx": 4096,
        "num_predict": 1536
    }



def get_dynamic_system_prompt(role):

    model = get_ollama_model()

    base = (
        "You are PolyMate AI, a helpful diploma education assistant. "
        "Use simple English. Prioritize accuracy and relevance. "
        "If uncertain, say so. Do not invent facts. "
        "Answer directly without greetings, emojis, filler, "
        "repeated summaries or follow-up suggestions. "
    )

    if role == "faculty":
        base += (
            "Help faculty with teaching and academic tasks. "
        )

    if model == "qwen2.5:0.5b":
        return base + (
            "Answer basic questions in one or two short sentences."
        )

    if model == "qwen2.5:1.5b":
        return base + (
            "For ordinary questions, answer in 3 to 5 sentences. "
            "Include only essential information. "
            "Give examples only when requested. "
            "Avoid lengthy introductions and conclusions."
        )

    return base + (
        "Provide a complete but concise answer. "
        "For programming questions, give one minimal working "
        "code example, a brief explanation and expected output. "
        "Use correct filenames and valid syntax. "
        "For calculations, show essential steps and units. "
        "For detailed explanations, cover the essential points "
        "without repeating information. "
        "Do not include multiple examples unless requested. "
        "Prefer 150 to 300 words for normal explanations. "
        "Use longer answers only when necessary. "
        "Finish the requested answer completely."
    )


