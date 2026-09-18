from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core import clerk_auth
from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models.entities import User

SEARCH_BODY = {
    "origin": "ORD",
    "destination": "LAX",
    "earliest_departure_date": "2026-10-10",
    "latest_departure_date": "2026-10-12",
    "earliest_return_date": "2026-10-16",
    "latest_return_date": "2026-10-19",
    "travelers": 1,
    "cabin_class": "economy",
    "maximum_stops": 1,
}


async def make_client() -> AsyncIterator[tuple[AsyncClient, async_sessionmaker[AsyncSession]]]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            yield client, factory
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()


async def seed_clerk_user(
    factory: async_sessionmaker[AsyncSession],
    clerk_user_id: str,
    email: str = "ada@example.com",
) -> None:
    async with factory() as session:
        session.add(
            User(email=email, clerk_user_id=clerk_user_id, display_name="Ada")
        )
        await session.commit()


def sign_in_as(monkeypatch: pytest.MonkeyPatch, clerk_user_id: str | None) -> None:
    async def fake_verify(request: object) -> str | None:
        headers = getattr(request, "headers", None)
        if headers is None or not headers.get("authorization"):
            return None
        return clerk_user_id

    monkeypatch.setattr(clerk_auth, "verify_clerk_request", fake_verify)


async def test_signed_out_callers_get_401(monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in_as(monkeypatch, None)
    async for client, _ in make_client():
        assert (await client.get("/api/auth/me")).status_code == 401
        assert (await client.get("/api/tracked-routes")).status_code == 401
        claim = await client.post(
            "/api/auth/claim", json={"anonymous_id": "aa8b67fb-7c41-4d08-8fd3-894732223f30"}
        )
        assert claim.status_code == 401


async def test_me_claim_and_owner_isolation(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        await seed_clerk_user(factory, "user_grace", "grace@example.com")
        auth_headers = {"Authorization": "Bearer clerk-session-token"}

        sign_in_as(monkeypatch, "user_ada")
        me = await client.get("/api/auth/me", headers=auth_headers)
        assert me.status_code == 200
        assert me.json()["email"] == "ada@example.com"

        anon_headers = {"X-FareDelta-Anonymous-ID": "aa8b67fb-7c41-4d08-8fd3-894732223f30"}
        created = await client.post(
            "/api/tracked-routes", headers=anon_headers, json=SEARCH_BODY
        )
        assert created.status_code == 201

        claim = await client.post(
            "/api/auth/claim",
            headers=auth_headers,
            json={"anonymous_id": "aa8b67fb-7c41-4d08-8fd3-894732223f30"},
        )
        assert claim.status_code == 200
        assert claim.json() == {"claimed": 1}

        listed = await client.get("/api/tracked-routes", headers=auth_headers)
        assert [route["id"] for route in listed.json()] == [created.json()["id"]]
        assert (await client.get("/api/tracked-routes", headers=anon_headers)).json() == []

        sign_in_as(monkeypatch, "user_grace")
        assert (await client.get("/api/tracked-routes", headers=auth_headers)).json() == []
        forbidden = await client.delete(
            f"/api/tracked-routes/{created.json()['id']}", headers=auth_headers
        )
        assert forbidden.status_code == 404

        sign_in_as(monkeypatch, "user_ada")
        removed = await client.delete(
            f"/api/tracked-routes/{created.json()['id']}", headers=auth_headers
        )
        assert removed.status_code == 204
        assert (await client.get("/api/tracked-routes", headers=auth_headers)).json() == []


async def test_first_seen_clerk_user_is_provisioned(monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in_as(monkeypatch, "user_new")

    async def fake_profile(clerk_user_id: str) -> clerk_auth.ClerkProfile:
        return clerk_auth.ClerkProfile(
            clerk_user_id=clerk_user_id,
            email="new@example.com",
            display_name="New",
            email_verified=True,
        )

    monkeypatch.setattr(clerk_auth, "fetch_clerk_profile", fake_profile)
    async for client, _ in make_client():
        me = await client.get("/api/auth/me", headers={"Authorization": "Bearer token"})
        assert me.status_code == 200
        assert me.json()["email"] == "new@example.com"
        assert me.json()["email_verified"] is True
