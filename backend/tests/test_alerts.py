import uuid
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models.entities import User
from app.repositories.alerts import NotificationRepository, PriceAlertRepository
from app.repositories.tracked_routes import TrackedRouteRepository
from app.schemas.tracked_routes import TrackedRouteCreate
from app.services import email as email_module
from app.services.alerts import AlertService, drop_percent_between
from app.services.email import build_alert_email
from tests.test_auth import SEARCH_BODY, make_client, seed_clerk_user, sign_in_as


async def test_alert_endpoints_require_sign_in(monkeypatch: pytest.MonkeyPatch) -> None:
    sign_in_as(monkeypatch, None)
    async for client, _ in make_client():
        assert (await client.get("/api/alerts")).status_code == 401
        assert (
            await client.post(
                "/api/alerts",
                json={"route_id": str(uuid.uuid4()), "target_price": 250},
            )
        ).status_code == 401
        assert (await client.get("/api/notifications")).status_code == 401


async def test_alert_crud_and_validation(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        await seed_clerk_user(factory, "user_grace", "grace@example.com")
        headers = {"Authorization": "Bearer clerk-session-token"}

        sign_in_as(monkeypatch, "user_ada")
        tracked = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        route_id = tracked.json()["id"]

        assert (
            await client.post("/api/alerts", headers=headers, json={"route_id": route_id})
        ).status_code == 422

        created = await client.post(
            "/api/alerts",
            headers=headers,
            json={"route_id": route_id, "target_price": 250, "drop_percent": 10},
        )
        assert created.status_code == 201
        alert_id = created.json()["id"]
        assert created.json()["origin"] == "ORD"

        duplicate = await client.post(
            "/api/alerts",
            headers=headers,
            json={"route_id": route_id, "target_price": 250, "drop_percent": 10},
        )
        assert duplicate.status_code == 201
        assert duplicate.json()["id"] == alert_id

        listed = await client.get("/api/alerts", headers=headers)
        assert [item["id"] for item in listed.json()] == [alert_id]

        paused = await client.patch(
            f"/api/alerts/{alert_id}", headers=headers, json={"active": False}
        )
        assert paused.status_code == 200
        assert paused.json()["active"] is False

        cleared = await client.patch(
            f"/api/alerts/{alert_id}",
            headers=headers,
            json={"target_price": None, "drop_percent": None, "active": True},
        )
        assert cleared.status_code == 422

        sign_in_as(monkeypatch, "user_grace")
        assert (await client.get("/api/alerts", headers=headers)).json() == []
        assert (
            await client.post(
                "/api/alerts", headers=headers, json={"route_id": route_id, "target_price": 100}
            )
        ).status_code == 404
        assert (
            await client.patch(f"/api/alerts/{alert_id}", headers=headers, json={"active": True})
        ).status_code == 404
        assert (
            await client.delete(f"/api/alerts/{alert_id}", headers=headers)
        ).status_code == 404

        sign_in_as(monkeypatch, "user_ada")
        assert (
            await client.delete(f"/api/alerts/{alert_id}", headers=headers)
        ).status_code == 204
        assert (await client.get("/api/alerts", headers=headers)).json() == []


async def test_target_alert_fires_once_on_refresh(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: list[object] = []

    async def fake_send(email: object) -> bool:
        sent.append(email)
        return True

    monkeypatch.setattr(email_module, "send_alert_email", fake_send)
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        tracked = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        route_id = tracked.json()["id"]
        created = await client.post(
            "/api/alerts", headers=headers, json={"route_id": route_id, "target_price": 100000}
        )
        assert created.status_code == 201

        first = await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        assert first.status_code == 200
        assert first.json()["last_price"] is not None

        feed = await client.get("/api/notifications", headers=headers)
        assert feed.status_code == 200
        assert feed.json()["unread_count"] == 1
        assert feed.json()["notifications"][0]["kind"] == "target_hit"
        assert feed.json()["notifications"][0]["route_id"] == route_id
        assert len(sent) == 1

        # Same price again stays quiet: no duplicate notification, no second email.
        await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        again = await client.get("/api/notifications", headers=headers)
        assert again.json()["unread_count"] == 1
        assert len(again.json()["notifications"]) == 1
        assert len(sent) == 1


async def test_drop_alert_evaluation_and_new_low(monkeypatch: pytest.MonkeyPatch) -> None:
    sent: list[object] = []

    async def fake_send(email: object) -> bool:
        sent.append(email)
        return True

    monkeypatch.setattr(email_module, "send_alert_email", fake_send)
    async for _client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        async with factory() as session:
            user = await session.scalar(select(User).where(User.clerk_user_id == "user_ada"))
            assert user is not None
            tracked = TrackedRouteRepository(session)
            alerts = PriceAlertRepository(session)
            notifications = NotificationRepository(session)
            service = AlertService(alerts, notifications, tracked)

            route = await tracked.create_or_get(
                TrackedRouteCreate(**SEARCH_BODY), user_id=user.id
            )
            await tracked.update_price(route, Decimal("400"), "USD", datetime.now(UTC))
            await tracked.update_price(route, Decimal("300"), "USD", datetime.now(UTC))

            strict = await alerts.create(user.id, route.id, None, Decimal("50"))
            await service.evaluate_route(route, user)
            assert await notifications.unread_count(user.id) == 0

            loose = await alerts.create(user.id, route.id, None, Decimal("10"))
            await service.evaluate_route(route, user)
            assert await notifications.unread_count(user.id) == 1
            assert len(sent) == 1

            # Same evaluation again stays quiet.
            await service.evaluate_route(route, user)
            assert await notifications.unread_count(user.id) == 1

            # A further new low notifies again.
            await tracked.update_price(route, Decimal("250"), "USD", datetime.now(UTC))
            await service.evaluate_route(route, user)
            assert await notifications.unread_count(user.id) == 2

            await alerts.delete(strict)
            await alerts.delete(loose)


async def test_notifications_read_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        tracked = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        await client.post(
            "/api/alerts",
            headers=headers,
            json={"route_id": tracked.json()["id"], "target_price": 100000},
        )
        await client.post(
            f"/api/tracked-routes/{tracked.json()['id']}/refresh", headers=headers
        )

        feed = (await client.get("/api/notifications", headers=headers)).json()
        assert feed["unread_count"] == 1
        notification_id = feed["notifications"][0]["id"]

        read = await client.post(
            f"/api/notifications/{notification_id}/read", headers=headers
        )
        assert read.status_code == 200
        assert read.json()["read_at"] is not None
        assert (await client.get("/api/notifications", headers=headers)).json()[
            "unread_count"
        ] == 0

        assert (
            await client.post(
                "/api/notifications/00000000-0000-0000-0000-000000000000/read",
                headers=headers,
            )
        ).status_code == 404

        await client.post(
            f"/api/tracked-routes/{tracked.json()['id']}/refresh", headers=headers
        )
        read_all = await client.post("/api/notifications/read-all", headers=headers)
        assert read_all.json() == {"read": 0}


def test_drop_percent_math_and_email_copy() -> None:
    assert drop_percent_between(Decimal("400"), Decimal("300")) == Decimal("25")
    assert drop_percent_between(Decimal("0"), Decimal("100")) == Decimal("0")
    email = build_alert_email(
        to="ada@example.com",
        origin="ORD",
        destination="LAX",
        kind="price_drop",
        price=Decimal("300"),
        currency="USD",
        previous_price=Decimal("400"),
        manage_url="https://faredelta.rijan.sh/tracked/abc",
    )
    assert email.to == "ada@example.com"
    assert "ORD" in email.subject and "LAX" in email.subject
    assert "https://faredelta.rijan.sh/tracked/abc" in email.text
