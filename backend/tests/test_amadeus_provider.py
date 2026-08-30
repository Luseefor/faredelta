from urllib.parse import parse_qs

import httpx

from app.providers.amadeus import AmadeusFlightProvider, parse_duration_minutes
from tests.test_schemas import valid_request


async def test_amadeus_provider_authenticates_samples_dates_and_normalizes() -> None:
    token_calls = 0
    search_calls = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal token_calls, search_calls
        if request.url.path == "/v1/security/oauth2/token":
            token_calls += 1
            return httpx.Response(200, json={"access_token": "test-token", "expires_in": 1800})

        search_calls += 1
        assert request.headers["Authorization"] == "Bearer test-token"
        params = parse_qs(request.url.query.decode())
        departure_date = params["departureDate"][0]
        return_date = params["returnDate"][0]
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "offer-1",
                        "validatingAirlineCodes": ["UA"],
                        "price": {"grandTotal": "500.00", "currency": "USD"},
                        "itineraries": [
                            {
                                "duration": "PT4H15M",
                                "segments": [
                                    {
                                        "carrierCode": "UA",
                                        "number": "101",
                                        "departure": {
                                            "iataCode": "ORD",
                                            "at": f"{departure_date}T08:00:00",
                                        },
                                        "arrival": {
                                            "iataCode": "LAX",
                                            "at": f"{departure_date}T12:15:00",
                                        },
                                        "duration": "PT4H15M",
                                    }
                                ],
                            },
                            {
                                "duration": "PT3H55M",
                                "segments": [
                                    {
                                        "carrierCode": "UA",
                                        "number": "202",
                                        "departure": {
                                            "iataCode": "LAX",
                                            "at": f"{return_date}T10:00:00",
                                        },
                                        "arrival": {
                                            "iataCode": "ORD",
                                            "at": f"{return_date}T13:55:00",
                                        },
                                        "duration": "PT3H55M",
                                    }
                                ],
                            },
                        ],
                    }
                ],
                "dictionaries": {"carriers": {"UA": "United Airlines"}},
            },
        )

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    provider = AmadeusFlightProvider("client-id", "client-secret", "https://test", client)
    request = valid_request(travelers=2)
    offers = await provider.search_flights(request)
    await provider.search_flights(request)
    await client.aclose()

    assert token_calls == 1
    assert search_calls == 18
    assert len(offers) == 9
    assert offers[0].provider == "Amadeus Self-Service"
    assert offers[0].airline.name == "United Airlines"
    assert offers[0].price == 250
    assert offers[0].duration_minutes == 255
    assert len(offers[0].segments) == 2
    assert len({(offer.departure_time.date(), offer.return_date) for offer in offers}) == 9


def test_amadeus_duration_parser() -> None:
    assert parse_duration_minutes("PT45M") == 45
    assert parse_duration_minutes("PT2H5M") == 125
