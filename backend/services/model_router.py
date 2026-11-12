import re

FAST_MODEL = "qwen2.5:0.5b"
BALANCED_MODEL = "qwen2.5:1.5b"
ADVANCED_MODEL = "qwen3:4b-instruct"


def select_model(message, role="student", history=None):

    question = " ".join(
        message.lower().strip().split()
    )

    advanced_patterns = [

        # Detailed answers
        r"\b(in detail|detailed|comprehensive|in depth)\b",
        r"\b(step by step|step-by-step)\b",
        r"\b(with examples|with example|with output)\b",
        r"\b(examples and output|code and output)\b",
        r"\b(complete explanation|full explanation)\b",
        r"\b(advantages and disadvantages)\b",

        # Programming and technical questions
        r"\b(debug|troubleshoot|derive|prove)\b",
        r"\b(write|create|implement|develop)\b.*"
        r"\b(code|program|application|algorithm)\b",
        r"\b(solve|calculate|evaluate)\b",
        r"\b(complex|advanced)\b",
        r"\b(stack trace|exception|syntax error)\b",
        r"\b(integral|differential equation)\b",
        r"\b(design|architecture)\b.*"
        r"\b(system|database|network)\b",

        # Academic long answers
        r"\b(essay|long answer|lesson plan)\b",
        r"\b(question paper|study notes)\b",
        r"\b(10 marks|8 marks|5 marks)\b",

        # Continue previous answers
        r"^(continue|next part|continue the answer)\b"
    ]

    if any(
        re.search(pattern, question)
        for pattern in advanced_patterns
    ):
        return ADVANCED_MODEL

    if len(question) > 250:
        return ADVANCED_MODEL

    # Keep stronger models for contextual questions
    if history:
        return BALANCED_MODEL

    if role == "faculty":
        return BALANCED_MODEL

    simple_patterns = [
        r"^what is [\w\s.+#-]+\??$",
        r"^define [\w\s.+#-]+\??$",
        r"^full form of [\w\s]+\??$",
        r"^meaning of [\w\s]+\??$"
    ]

    if len(question.split()) <= 6:

        if any(
            re.fullmatch(pattern, question)
            for pattern in simple_patterns
        ):
            return FAST_MODEL

    return BALANCED_MODEL
