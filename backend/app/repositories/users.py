import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clerk_auth import ClerkProfile
from app.models.entities import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        user: User | None = await self.session.scalar(select(User).where(User.id == user_id))
        return user

    async def get_by_email(self, email: str) -> User | None:
        user: User | None = await self.session.scalar(select(User).where(User.email == email))
        return user

    async def get_by_clerk_id(self, clerk_user_id: str) -> User | None:
        user: User | None = await self.session.scalar(
            select(User).where(User.clerk_user_id == clerk_user_id)
        )
        return user

    async def create_from_clerk(self, profile: ClerkProfile) -> User:
        user = User(
            email=profile.email,
            clerk_user_id=profile.clerk_user_id,
            display_name=profile.display_name,
            email_verified=profile.email_verified,
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user
