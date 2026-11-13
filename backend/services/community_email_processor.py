import os
import logging

from services.supabase_client import get_supabase
from services.gmail_service import (
    gmail_configured,
    get_gmail_credentials,
    send_email,
)

logger = logging.getLogger(__name__)

MAX_BATCH_SIZE = 5

ALLOWED_EVENTS = {
    "new_request",
    "request_escalated",
}


def queue_rpc(function_name, params=None):
    result = get_supabase().rpc(
        function_name,
        params or {},
    ).execute()

    return result.data


def official_email_content(email):
    """
    Build a minimal official notification without
    including private student information.
    """

    event = email.get("event_type")
    request_id = email.get("request_id")

    if event == "request_escalated":
        subject = "PolyMate - Priority Request"
        description = (
            "A student request has been escalated "
            "because it remains unresolved."
        )
    else:
        subject = "PolyMate - New Student Request"
        description = (
            "A new student request requires "
            "administrator attention."
        )

    body = (
        "Hello PolyMate Administrator,\n\n"
        f"{description}\n\n"
        f"Request reference: {request_id}\n\n"
        "Open Community Management to review "
        "the request securely:\n"
        "https://polymate-frontend.vercel.app/admin/community\n\n"
        "PolyMate Notification Service"
    )

    return subject, body


def mark_failed(email, error, retryable=False):
    result = queue_rpc(
        "community_email_mark_failed",
        {
            "p_email_id": email["id"],
            "p_processing_token": email["processing_token"],
            "p_error": error,
            "p_retryable": retryable,
        },
    )

    if not isinstance(result, dict) or not result.get("success"):
        raise RuntimeError("Unable to record email failure")

    return result


def process_community_emails(batch_size=1):
    """
    Process a bounded batch of official notifications.

    This function does not run automatically.
    A protected scheduler endpoint will invoke it.
    """

    if not gmail_configured():
        return {
            "success": False,
            "error": "Gmail is not configured",
        }

    recipient = os.getenv(
        "GMAIL_OFFICIAL_RECIPIENT",
        "",
    ).strip()

    if not recipient:
        return {
            "success": False,
            "error": "Official recipient is not configured",
        }

    batch_size = max(
        1,
        min(int(batch_size), MAX_BATCH_SIZE),
    )

    recovery = queue_rpc(
        "community_email_recover_stale"
    )

    if (
        not isinstance(recovery, dict)
        or not recovery.get("success")
        or not isinstance(
            recovery.get("recovered"), int
        )
        or recovery["recovered"] < 0
    ):
        raise RuntimeError(
            "Unable to confirm stale email recovery"
        )

    summary = {
        "success": True,
        "claimed": 0,
        "sent": 0,
        "failed": 0,
        "retry_pending": 0,
        "review_required": recovery["recovered"],
        "recovered": recovery["recovered"],
    }

    try:
        credentials = get_gmail_credentials()

        if not credentials.valid:
            raise RuntimeError(
                "Gmail authorization is invalid"
            )

    except Exception as exc:
        logger.warning(
            "Gmail authorization failed: %s",
            type(exc).__name__,
        )

        summary["success"] = False
        summary["error"] = (
            "Gmail authorization unavailable"
        )

        return summary

    for _ in range(batch_size):

        email = queue_rpc("community_claim_email")

        if email is None:
            break

        if not isinstance(email, dict):
            raise RuntimeError("Invalid email queue response")

        summary["claimed"] += 1

        if (
            email.get("recipient_type") != "official"
            or email.get("event_type") not in ALLOWED_EVENTS
        ):
            mark_failed(
                email,
                "Unsupported notification type",
                retryable=False,
            )

            summary["failed"] += 1
            summary["success"] = False
            break

        subject, body = official_email_content(email)

        try:
            result = send_email(
                recipient,
                subject,
                body,
                credentials=credentials,
            )

            if not isinstance(result, dict):
                raise RuntimeError(
                    "Invalid Gmail response"
                )

            provider_id = result.get("message_id")

            if not result.get("success") or not provider_id:
                raise RuntimeError(
                    "Gmail acceptance could not be confirmed"
                )

        except Exception as exc:

            summary["success"] = False

            # The current Gmail service does not reliably
            # distinguish rejected sends from uncertain
            # delivery outcomes. Do not resend blindly.

            logger.warning(
                "Community email send failed: %s",
                type(exc).__name__,
            )

            try:
                mark_failed(
                    email,
                    "Gmail sending failed or acceptance "
                    "could not be confirmed. Review required.",
                    retryable=False,
                )

                summary["failed"] += 1
                summary["review_required"] += 1

            except Exception:
                summary["review_required"] += 1
                summary["success"] = False

            # Stop the batch to avoid consuming the
            # entire queue during a provider outage.

            break

        try:
            saved = queue_rpc(
                "community_email_mark_sent",
                {
                    "p_email_id": email["id"],
                    "p_processing_token": (
                        email["processing_token"]
                    ),
                    "p_provider_message_id": provider_id,
                },
            )

            if (
                not isinstance(saved, dict)
                or not saved.get("success")
            ):
                raise RuntimeError(
                    "Unable to confirm queue update"
                )

            summary["sent"] += 1

        except Exception as exc:

            # Gmail already accepted the message.
            # Never return it to the pending queue.

            logger.error(
                "Email accepted but queue update failed: %s",
                type(exc).__name__,
            )

            summary["review_required"] += 1
            summary["success"] = False
            break

    return summary
