import json

import httpx
import pytest
from pydantic import ValidationError

from app.providers.duffel import DuffelFlightProvider
from app.providers.mock import MockFlightProvider
from app.providers.travelpayouts import TravelpayoutsFlightProvider
from app.schemas.flights import FlightSearchRequest, TripType
from tests.test_auth import SEARCH_BODY, make_client, seed_clerk_user, sign_in_as
from tests.test_duffel_provider import make_slice
from tests.test_schemas import valid_request

ONE_WAY_BODY = {
    "origin": "ORD",
    "destination": "LAX",
    "trip_type": "one_way",
    "earliest_departure_date": "2026-10-10",
    "latest_departure_date": "2026-10-12",
    "travelers": 1,
    "cabin_class": "economy",
    "maximum_stops": 1,
}


def test_one_way_validation() -> None:
    request = FlightSearchRequest.model_validate(ONE_WAY_BODY)
    assert request.trip_type is TripType.one_way
    assert request.earliest_return_date is None

    with pytest.raises(ValidationError):
        FlightSearchRequest.model_validate({**ONE_WAY_BODY, "earliest_return_date": "2026-10-16"})
    with pytest.raises(ValidationError):
        FlightSearchRequest.model_validate(
            {k: v for k, v in SEARCH_BODY.items() if "return" not in k}
        )


async def test_mock_provider_one_way() -> None:
    offers = await MockFlightProvider().search_flights(FlightSearchRequest(**ONE_WAY_BODY))
    assert len(offers) == 3
    assert all(offer.return_date is None for offer in offers)
    assert all(len(offer.segments) == 1 for offer in offers)
    assert len({offer.departure_time.date() for offer in offers}) == 3


async def test_duffel_provider_one_way_uses_single_slice() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        assert len(body["data"]["slices"]) == 1
        departure_date = body["data"]["slices"][0]["departure_date"]
        return httpx.Response(
            200,
            json={
                "data": {
                    "offers": [
                        {
                            "id": f"off_{departure_date}",
                            "owner": {"iata_code": "UA", "name": "United Airlines"},
                            "total_amount": "300.00",
                            "total_currency": "USD",
                            "slices": [make_slice("ORD", "LAX", departure_date, "PT4H15M", "101")],
                        }
                    ]
                }
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = DuffelFlightProvider("duffel_test_token", "https://api.duffel.test", client)
    offers = await provider.search_flights(valid_request(trip_type="one_way"))
    await client.aclose()

    assert len(offers) == 3
    assert all(offer.return_date is None for offer in offers)
    assert all(len(offer.segments) == 1 for offer in offers)


async def test_travelpayouts_provider_one_way() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["one_way"] == "true"
        assert "return_at" not in request.url.params
        return httpx.Response(
            200,
            json={
                "success": True,
                "currency": "usd",
                "data": [
                    {
                        "origin": "ORD",
                        "destination": "LAX",
                        "price": 149.0,
                        "airline": "UA",
                        "flight_number": "202",
                        "departure_at": "2026-10-11T08:00:00-05:00",
                        "transfers": 0,
                        "duration_to": 240,
                        "link": "/search/ORDLAX1",
                    }
                ],
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = TravelpayoutsFlightProvider("free-token", "https://travelpayouts.test", "us", client)
    offers = await provider.search_flights(valid_request(trip_type="one_way"))
    await client.aclose()

    assert len(offers) == 1
    assert offers[0].return_date is None
    assert len(offers[0].segments) == 1
    assert offers[0].stops == 0


async def test_one_way_search_track_and_history() -> None:
    async for client, _ in make_client():
        response = await client.post("/api/flights/search", json=ONE_WAY_BODY)
        assert response.status_code == 200
        body = response.json()
        assert body["trip_type"] == "one_way"
        assert body["result_count"] == 3
        assert all(offer["return_date"] is None for offer in body["offers"])

        history = await client.get(
            "/api/flights/history", params={"origin": "ORD", "destination": "LAX"}
        )
        assert history.status_code == 200
        assert history.json()["point_count"] == 1


async def test_one_way_tracked_route_lifecycle(monkeypatch: pytest.MonkeyPatch) -> None:
    async for client, factory in make_client():
        await seed_clerk_user(factory, "user_ada", "ada@example.com")
        sign_in_as(monkeypatch, "user_ada")
        headers = {"Authorization": "Bearer clerk-session-token"}

        created = await client.post("/api/tracked-routes", headers=headers, json=ONE_WAY_BODY)
        assert created.status_code == 201
        assert created.json()["trip_type"] == "one_way"
        route_id = created.json()["id"]

        refreshed = await client.post(f"/api/tracked-routes/{route_id}/refresh", headers=headers)
        assert refreshed.status_code == 200
        assert isinstance(refreshed.json()["last_price"], int | float)

        fetched = await client.get(f"/api/tracked-routes/{route_id}", headers=headers)
        assert fetched.json()["earliest_return_date"] is None
