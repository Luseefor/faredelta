import json

import httpx

from app.providers.duffel import DuffelFlightProvider, parse_duration_minutes
from tests.test_schemas import valid_request


async def test_duffel_provider_samples_dates_and_normalizes_offers() -> None:
    search_calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal search_calls
        search_calls += 1
        assert request.url.path == "/air/offer_requests"
        assert request.headers["Authorization"] == "Bearer duffel_test_token"
        assert request.headers["Duffel-Version"] == "v2"
        body = json.loads(request.content)
        assert body["data"]["max_connections"] == 1
        assert len(body["data"]["passengers"]) == 2
        departure_date = body["data"]["slices"][0]["departure_date"]
        return_date = body["data"]["slices"][1]["departure_date"]
        return httpx.Response(
            200,
            json={
                "data": {
                    "offers": [
                        {
                            "id": f"off_{departure_date}_{return_date}",
                            "owner": {"iata_code": "UA", "name": "United Airlines"},
                            "total_amount": "500.00",
                            "total_currency": "USD",
                            "slices": [
                                make_slice("ORD", "LAX", departure_date, "PT4H15M", "101"),
                                make_slice("LAX", "ORD", return_date, "PT3H55M", "202"),
                            ],
                        }
                    ]
                }
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = DuffelFlightProvider("duffel_test_token", "https://api.duffel.test", client)
    offers = await provider.search_flights(valid_request(travelers=2))
    await client.aclose()

    assert search_calls == 9
    assert len(offers) == 9
    assert offers[0].provider == "Duffel"
    assert offers[0].airline.name == "United Airlines"
    assert offers[0].price == 250
    assert offers[0].duration_minutes == 255
    assert len(offers[0].segments) == 2
    assert offers[0].segments[0].origin.name == "Chicago O'Hare International"
    assert len({(offer.departure_time.date(), offer.return_date) for offer in offers}) == 9


def make_slice(
    origin: str, destination: str, departure_date: str, duration: str, flight_number: str
) -> dict[str, object]:
    airport_names = {
        "ORD": "Chicago O'Hare International",
        "LAX": "Los Angeles International",
    }
    return {
        "duration": duration,
        "segments": [
            {
                "departing_at": f"{departure_date}T08:00:00",
                "arriving_at": f"{departure_date}T12:15:00",
                "duration": duration,
                "marketing_carrier_flight_number": flight_number,
                "marketing_carrier": {"iata_code": "UA", "name": "United Airlines"},
                "operating_carrier": {"iata_code": "UA", "name": "United Airlines"},
                "origin": {"iata_code": origin, "name": airport_names[origin]},
                "destination": {
                    "iata_code": destination,
                    "name": airport_names[destination],
                },
            }
        ],
    }


def test_duffel_duration_parser() -> None:
    assert parse_duration_minutes("PT45M") == 45
    assert parse_duration_minutes("PT2H5M") == 125
