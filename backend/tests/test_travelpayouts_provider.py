from decimal import Decimal

import httpx

from app.providers.travelpayouts import TravelpayoutsFlightProvider, _month_pairs
from app.schemas.flights import CabinClass
from tests.test_schemas import valid_request


async def test_travelpayouts_provider_queries_months_and_normalizes_cached_fares() -> None:
    search_calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal search_calls
        search_calls += 1
        assert request.url.path == "/aviasales/v3/prices_for_dates"
        assert request.headers["X-Access-Token"] == "free-token"
        assert request.url.params["market"] == "us"
        assert request.url.params["one_way"] == "false"
        assert request.url.params["departure_at"] == "2026-10"
        assert request.url.params["return_at"] == "2026-10"
        assert request.url.params["limit"] == "100"
        return httpx.Response(
            200,
            json={
                "success": True,
                "currency": "usd",
                "data": [
                    {
                        "origin": "ORD",
                        "destination": "LAX",
                        "origin_airport": "ORD",
                        "destination_airport": "LAX",
                        "price": 219.45,
                        "airline": "UA",
                        "flight_number": "101",
                        "departure_at": "2026-10-10T08:00:00-05:00",
                        "return_at": "2026-10-16T16:00:00-07:00",
                        "transfers": 1,
                        "return_transfers": 0,
                        "duration_to": 255,
                        "duration_back": 235,
                        "link": "/search/ORDLAX",
                    }
                ],
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = TravelpayoutsFlightProvider("free-token", "https://travelpayouts.test", "us", client)
    offers = await provider.search_flights(valid_request(maximum_stops=1, travelers=2))
    await client.aclose()

    assert search_calls == 1
    assert len(offers) == 1
    assert offers[0].provider == "Travelpayouts · recently observed"
    assert offers[0].airline.name == "United Airlines"
    assert offers[0].price == Decimal("438.90")
    assert offers[0].currency == "USD"
    assert offers[0].duration_minutes == 255
    assert offers[0].stops == 1
    assert len(offers[0].segments) == 2
    assert str(offers[0].booking_url) == "https://www.aviasales.com/search/ORDLAX"


async def test_travelpayouts_returns_no_cached_fares_for_unsupported_cabin() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("premium cabin searches must not call the economy-only data API")

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = TravelpayoutsFlightProvider("free-token", client=client)
    offers = await provider.search_flights(valid_request(cabin_class=CabinClass.business))
    await client.aclose()

    assert offers == []


async def test_travelpayouts_keeps_successful_periods_when_another_period_fails() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        if request.url.params["departure_at"] == "2026-10":
            return httpx.Response(400, json={"error": "unsupported period"})
        return httpx.Response(200, json={"success": True, "currency": "usd", "data": []})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = TravelpayoutsFlightProvider("free-token", client=client)
    request = valid_request(
        earliest_departure_date="2026-09-29",
        latest_departure_date="2026-10-02",
        earliest_return_date="2026-10-03",
        latest_return_date="2026-10-05",
    )

    offers = await provider.search_flights(request)
    await client.aclose()

    assert offers == []


def test_travelpayouts_skips_date_periods_without_a_trip_up_to_30_days() -> None:
    request = valid_request(
        earliest_departure_date="2026-08-02",
        latest_departure_date="2026-09-04",
        earliest_return_date="2026-10-19",
        latest_return_date="2026-11-11",
    )

    assert _month_pairs(request) == []
