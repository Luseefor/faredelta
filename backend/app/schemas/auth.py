import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str | None
    display_name: str | None
    email_verified: bool
    created_at: datetime


class ClaimRequest(BaseModel):
    anonymous_id: uuid.UUID


class ClaimResponse(BaseModel):
    claimed: int = Field(ge=0)
