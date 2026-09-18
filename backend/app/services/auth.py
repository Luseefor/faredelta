import uuid

from app.core import clerk_auth
from app.models.entities import User
from app.repositories.users import UserRepository
from app.schemas.auth import UserResponse


def to_user_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user, from_attributes=True)


class AuthService:
    def __init__(self, users: UserRepository) -> None:
        self.users = users

    async def get_or_provision(self, clerk_user_id: str) -> User | None:
        existing = await self.users.get_by_clerk_id(clerk_user_id)
        if existing is not None:
            return existing
        profile = await clerk_auth.fetch_clerk_profile(clerk_user_id)
        if profile is None:
            return None
        return await self.users.create_from_clerk(profile)

    async def get_user(self, user_id: uuid.UUID) -> User | None:
        return await self.users.get_by_id(user_id)
