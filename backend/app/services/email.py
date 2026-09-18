import logging
from dataclasses import dataclass
from decimal import Decimal

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)
RESEND_URL = "https://api.resend.com/emails"


@dataclass
class AlertEmail:
    to: str
    subject: str
    text: str


def build_alert_email(
    to: str,
    origin: str,
    destination: str,
    kind: str,
    price: Decimal,
    currency: str,
    previous_price: Decimal | None,
    manage_url: str,
) -> AlertEmail:
    if kind == "target_hit":
        subject = f"FareDelta: {origin} → {destination} hit your target at {price} {currency}"
        headline = f"Good news — fares from {origin} to {destination} are now {price} {currency}."
    else:
        subject = f"FareDelta: {origin} → {destination} dropped to {price} {currency}"
        headline = f"Fares from {origin} to {destination} dropped to {price} {currency}."
    previous_line = (
        f" Previously observed: {previous_price} {currency}." if previous_price is not None else ""
    )
    text = (
        f"{headline}{previous_line}\n\n"
        f"Prices move quickly and observed fares are not booking guarantees. "
        f"Manage your alerts: {manage_url}"
    )
    return AlertEmail(to=to, subject=subject, text=text)


async def send_alert_email(email: AlertEmail) -> bool:
    """Send via Resend. Returns False (no raise) when unconfigured or delivery fails."""
    settings = get_settings()
    if settings.resend_api_key is None or settings.alert_from_email is None:
        logger.info("Alert email skipped: Resend is not configured")
        return False
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                RESEND_URL,
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key.get_secret_value()}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.alert_from_email,
                    "to": [email.to],
                    "subject": email.subject,
                    "text": email.text,
                },
            )
    except httpx.HTTPError:
        logger.warning("Alert email delivery failed", exc_info=True)
        return False
    if response.status_code >= 400:
        logger.warning("Alert email rejected: %s %s", response.status_code, response.text[:200])
        return False
    return True
