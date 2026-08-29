from fastapi import APIRouter
from sqlalchemy import text

from app.api.dependencies import SessionDependency

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(session: SessionDependency) -> dict[str, str]:
    database = "ready"
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        database = "unavailable"
    return {"status": "ok", "service": "faredelta-api", "database": database}
