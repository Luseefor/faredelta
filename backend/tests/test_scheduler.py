from datetime import UTC, datetime
from types import SimpleNamespace

import pytest

from app.providers.base import FlightProviderError
from app.providers.mock import MockFlightProvider
from tests.test_auth import SEARCH_BODY, make_client, seed_clerk_user, sign_in_as


def job_token(monkeypatch: pytest.MonkeyPatch) -> dict[str, str]:
    monkeypatch.setattr(
        "app.api.routes.jobs.get_settings",
        lambda: SimpleNamespace(tracked_route_job_token="secret"),
    )
    return {"X-FareDelta-Job-Token": "secret"}


async def test_scheduled_run_only_refreshes_due_routes(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}
        token_headers = job_token(monkeypatch)

        created = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        assert created.status_code == 201
        assert created.json()["next_refresh_at"] is None
        route_id = created.json()["id"]

        first = await client.post("/api/jobs/refresh-tracked-routes", headers=token_headers)
        assert first.status_code == 200
        assert first.json() == {"refreshed": 1, "failed": 0}

        fetched = await client.get(f"/api/tracked-routes/{route_id}", headers=headers)
        assert fetched.json()["consecutive_failures"] == 0
        assert fetched.json()["next_refresh_at"] is not None

        # Not due yet: the next scheduled run skips it.
        second = await client.post("/api/jobs/refresh-tracked-routes", headers=token_headers)
        assert second.json() == {"refreshed": 0, "failed": 0}


async def test_refresh_failures_back_off(monkeypatch: pytest.MonkeyPatch) -> None:
    async def boom(self: MockFlightProvider, request: object) -> list[object]:
        raise FlightProviderError("provider down")

    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}
        token_headers = job_token(monkeypatch)

        created = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        route_id = created.json()["id"]

        monkeypatch.setattr(MockFlightProvider, "search_flights", boom)
        failed = await client.post("/api/jobs/refresh-tracked-routes", headers=token_headers)
        assert failed.json() == {"refreshed": 0, "failed": 1}

        fetched = await client.get(f"/api/tracked-routes/{route_id}", headers=headers)
        assert fetched.json()["consecutive_failures"] == 1
        next_refresh = datetime.fromisoformat(fetched.json()["next_refresh_at"])
        if next_refresh.tzinfo is None:  # SQLite drops tzinfo; Postgres keeps it.
            next_refresh = next_refresh.replace(tzinfo=UTC)
        assert next_refresh > datetime.now(UTC)

        # Backoff window: an immediate rerun does not retry the route.
        skipped = await client.post("/api/jobs/refresh-tracked-routes", headers=token_headers)
        assert skipped.json() == {"refreshed": 0, "failed": 0}


async def test_refresh_cadence_update(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        created = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        route_id = created.json()["id"]
        assert created.json()["refresh_cadence_hours"] == 24

        updated = await client.patch(
            f"/api/tracked-routes/{route_id}",
            headers=headers,
            json={"refresh_cadence_hours": 48},
        )
        assert updated.status_code == 200
        assert updated.json()["refresh_cadence_hours"] == 48
        # Cadence-only change keeps the price baseline.
        assert updated.json()["last_price"] is None

        assert (
            await client.patch(
                f"/api/tracked-routes/{route_id}",
                headers=headers,
                json={"refresh_cadence_hours": 3},
            )
        ).status_code == 422
