import pytest
from pydantic import ValidationError

from app.schemas.flights import FlightSearchRequest
from tests.test_auth import SEARCH_BODY, make_client, seed_clerk_user, sign_in_as


def nearby_body() -> dict[str, object]:
    return {**SEARCH_BODY, "origin_alternates": ["mdw"]}


async def test_alternate_validation() -> None:
    request = FlightSearchRequest(**nearby_body())
    assert request.origin_alternates == ["MDW"]
    assert [ (pair.origin, pair.destination) for pair in request.expanded_requests()] == [
        ("ORD", "LAX"),
        ("MDW", "LAX"),
    ]

    both = FlightSearchRequest(
        **{**SEARCH_BODY, "origin_alternates": ["MDW"], "destination_alternates": ["BUR"]}
    )
    assert len(both.expanded_requests()) == 4

    with pytest.raises(ValidationError):
        FlightSearchRequest(**{**SEARCH_BODY, "origin_alternates": ["MDW", "BUR"]})
    with pytest.raises(ValidationError):
        FlightSearchRequest(**{**SEARCH_BODY, "origin_alternates": ["ORD"]})
    with pytest.raises(ValidationError):
        FlightSearchRequest(**{**SEARCH_BODY, "origin_alternates": ["LAX"]})


async def test_search_fans_out_across_airport_pairs() -> None:
    async for client, _ in make_client():
        response = await client.post("/api/flights/search", json=nearby_body())
        assert response.status_code == 200
        body = response.json()
        assert body["airport_pairs"] == [
            {"origin": "ORD", "destination": "LAX"},
            {"origin": "MDW", "destination": "LAX"},
        ]
        assert body["result_count"] == 18
        origins = {offer["origin"]["code"] for offer in body["offers"]}
        assert origins == {"ORD", "MDW"}


async def test_tracked_routes_keep_alternates(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        created = await client.post("/api/tracked-routes", headers=headers, json=nearby_body())
        assert created.status_code == 201
        assert created.json()["origin_alternates"] == ["MDW"]
        route_id = created.json()["id"]

        duplicate = await client.post("/api/tracked-routes", headers=headers, json=nearby_body())
        assert duplicate.json()["id"] == route_id

        plain = await client.post("/api/tracked-routes", headers=headers, json=SEARCH_BODY)
        assert plain.json()["id"] != route_id

        refreshed = await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        assert refreshed.status_code == 200
        assert isinstance(refreshed.json()["last_price"], int | float)

        edited = await client.patch(
            f"/api/tracked-routes/{plain.json()['id']}",
            headers=headers,
            json={"destination_alternates": ["BUR"]},
        )
        assert edited.status_code == 200
        assert edited.json()["destination_alternates"] == ["BUR"]
