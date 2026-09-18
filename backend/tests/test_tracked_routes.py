import uuid
from types import SimpleNamespace

import pytest

from tests.test_auth import SEARCH_BODY, make_client, seed_clerk_user, sign_in_as


async def test_get_update_pause_and_scheduled_skip(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        created = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        assert created.status_code == 201
        route_id = created.json()["id"]

        refreshed = await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        assert refreshed.status_code == 200
        baseline = refreshed.json()["last_price"]
        assert isinstance(baseline, int | float)

        fetched = await client.get(f"/api/tracked-routes/{route_id}", headers=headers)
        assert fetched.status_code == 200
        assert fetched.json()["paused"] is False
        assert fetched.json()["last_price"] == baseline

        assert (
            await client.get(f"/api/tracked-routes/{uuid.uuid4()}", headers=headers)
        ).status_code == 404
        assert (await client.get(f"/api/tracked-routes/{route_id}")).status_code == 401

        paused = await client.patch(
            f"/api/tracked-routes/{route_id}", headers=headers, json={"paused": True}
        )
        assert paused.status_code == 200
        assert paused.json()["paused"] is True
        assert paused.json()["last_price"] == baseline

        # Manual refresh still works on a paused route; it stays paused.
        manual = await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        assert manual.status_code == 200
        assert manual.json()["paused"] is True

        edited = await client.patch(
            f"/api/tracked-routes/{route_id}", headers=headers, json={"travelers": 2}
        )
        assert edited.status_code == 200
        assert edited.json()["travelers"] == 2
        assert edited.json()["last_price"] is None
        assert edited.json()["previous_price"] is None

        assert (
            await client.patch(
                f"/api/tracked-routes/{route_id}", headers=headers, json={"travelers": 99}
            )
        ).status_code == 422
        assert (
            await client.patch(f"/api/tracked-routes/{route_id}", headers=headers, json={})
        ).status_code == 422
        assert (
            await client.patch(
                f"/api/tracked-routes/{route_id}",
                headers=headers,
                json={
                    "earliest_departure_date": "2026-10-12",
                    "latest_departure_date": "2026-10-10",
                },
            )
        ).status_code == 422

        second = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        assert second.status_code == 201

        monkeypatch.setattr(
            "app.api.routes.jobs.get_settings",
            lambda: SimpleNamespace(tracked_route_job_token="secret"),
        )
        scheduled = await client.post(
            "/api/jobs/refresh-tracked-routes", headers={"X-FareDelta-Job-Token": "secret"}
        )
        assert scheduled.status_code == 200
        # Only the unpaused route is refreshed by the scheduled job.
        assert scheduled.json() == {"refreshed": 1, "failed": 0}


async def test_update_scoped_to_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        await seed_clerk_user(factory, "user_grace", "grace@example.com")
        headers = {"Authorization": "Bearer clerk-session-token"}

        sign_in_as(monkeypatch, "user_ada")
        created = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        route_id = created.json()["id"]

        sign_in_as(monkeypatch, "user_grace")
        assert (
            await client.get(f"/api/tracked-routes/{route_id}", headers=headers)
        ).status_code == 404
        assert (
            await client.patch(
                f"/api/tracked-routes/{route_id}", headers=headers, json={"paused": True}
            )
        ).status_code == 404
