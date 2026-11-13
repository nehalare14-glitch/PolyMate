import os
import base64

from email.message import EmailMessage
from email.utils import formataddr

import requests

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request


GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send"

TOKEN_URI = "https://oauth2.googleapis.com/token"

SEND_URI = (
    "https://gmail.googleapis.com/gmail/v1/"
    "users/me/messages/send"
)


def gmail_configured():
    required = (
        "GMAIL_CLIENT_ID",
        "GMAIL_CLIENT_SECRET",
        "GMAIL_REFRESH_TOKEN",
        "GMAIL_SENDER_EMAIL",
        "GMAIL_OFFICIAL_RECIPIENT",
    )

    return all(
        os.getenv(key, "").strip()
        for key in required
    )


def get_gmail_credentials():
    if not gmail_configured():
        raise RuntimeError(
            "Gmail configuration is incomplete"
        )

    credentials = Credentials(
        token=None,
        refresh_token=os.environ["GMAIL_REFRESH_TOKEN"],
        token_uri=TOKEN_URI,
        client_id=os.environ["GMAIL_CLIENT_ID"],
        client_secret=os.environ["GMAIL_CLIENT_SECRET"],
        scopes=[GMAIL_SCOPE],
    )

    credentials.refresh(Request())

    return credentials


def send_email(recipient, subject, body):
    if not recipient or not subject or not body:
        raise ValueError(
            "Recipient, subject and body are required"
        )

    credentials = get_gmail_credentials()

    message = EmailMessage()

    message["From"] = formataddr(
        (
            "PolyMate Support",
            os.environ["GMAIL_SENDER_EMAIL"],
        )
    )

    message["To"] = recipient
    message["Subject"] = subject

    message.set_content(body)

    raw = base64.urlsafe_b64encode(
        message.as_bytes()
    ).decode("utf-8")

    response = requests.post(
        SEND_URI,
        headers={
            "Authorization": (
                f"Bearer {credentials.token}"
            ),
            "Content-Type": "application/json",
        },
        json={"raw": raw},
        timeout=30,
    )

    if not response.ok:
        raise RuntimeError(
            f"Gmail API returned HTTP "
            f"{response.status_code}"
        )

    result = response.json()

    return {
        "success": True,
        "provider": "gmail",
        "message_id": result.get("id"),
    }


def send_test_email():
    return send_email(
        recipient=os.environ[
            "GMAIL_OFFICIAL_RECIPIENT"
        ],
        subject="PolyMate - Email Service Test",
        body=(
            "Hello from PolyMate!\n\n"
            "Your official Gmail notification "
            "service is working successfully.\n\n"
            "This email was sent through the "
            "PolyMate Flask backend using Gmail API.\n\n"
            "Regards,\n"
            "PolyMate Support"
        ),
    )