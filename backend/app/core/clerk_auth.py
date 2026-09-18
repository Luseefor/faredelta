"""Authenticate requests with Clerk session tokens.

All credential handling (passwords, OAuth, MFA, resets) lives in Clerk.
The backend only verifies Clerk-issued session tokens with the official
SDK and maps the Clerk user ID to an internal users row.
"""

import logging
from dataclasses import dataclass
from functools import lru_cache

from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions, AuthStatus
from fastapi import Request

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ClerkProfile:
    clerk_user_id: str
    email: str | None
    display_name: str | None
    email_verified: bool


@lru_cache
def get_clerk_client() -> Clerk | None:
    settings = get_settings()
    if settings.clerk_secret_key is None:
        return None
    return Clerk(bearer_auth=settings.clerk_secret_key.get_secret_value())


async def verify_clerk_request(request: Request) -> str | None:
    """Return the Clerk user ID for a signed-in request, else None.

    Never raises: unconfigured secrets, expired tokens, and network
    failures all resolve to signed-out so public endpoints keep working.
    """
    client = get_clerk_client()
    if client is None:
        return None
    settings = get_settings()
    try:
        state = await client.authenticate_request_async(
            request,
            AuthenticateRequestOptions(authorized_parties=settings.clerk_authorized_parties),
        )
    except Exception:
        logger.warning("Clerk token verification failed", exc_info=True)
        return None
    if state.status != AuthStatus.SIGNED_IN or state.payload is None:
        return None
    subject = state.payload.get("sub")
    return subject if isinstance(subject, str) and subject else None


async def fetch_clerk_profile(clerk_user_id: str) -> ClerkProfile | None:
    """Fetch profile details for first-time provisioning. Returns None on failure."""
    client = get_clerk_client()
    if client is None:
        return None
    try:
        user = await client.users.get_async(user_id=clerk_user_id)
    except Exception:
        logger.warning("Could not fetch Clerk user %s", clerk_user_id, exc_info=True)
        return None
    primary_email: str | None = None
    email_verified = False
    for address in user.email_addresses or []:
        if address.id == user.primary_email_address_id:
            email_value = address.email_address
            primary_email = str(email_value) if email_value is not None else None
            verification = address.verification
            email_verified = (
                verification is not None
                and getattr(verification, "status", None) == "verified"
            )
    name = getattr(user, "full_name", None) or getattr(user, "username", None)
    return ClerkProfile(
        clerk_user_id=clerk_user_id,
        email=primary_email,
        display_name=str(name) if name is not None else None,
        email_verified=email_verified,
    )
