from app.providers.mock import MockFlightProvider
from tests.test_schemas import valid_request


async def test_mock_provider_is_deterministic_and_respects_stop_limit() -> None:
    provider = MockFlightProvider()
    request = valid_request(maximum_stops=1)
    first = await provider.search_flights(request)
    second = await provider.search_flights(request)

    assert 6 <= len(first) <= 10
    assert [offer.id for offer in first] == [offer.id for offer in second]
    assert [offer.price for offer in first] == [offer.price for offer in second]
    assert all(offer.stops <= 1 for offer in first)
    assert len({offer.departure_time.date() for offer in first}) == 3


async def test_mock_provider_handles_a_single_departure_date() -> None:
    request = valid_request(latest_departure_date=valid_request().earliest_departure_date)
    offers = await MockFlightProvider().search_flights(request)
    assert len(offers) == 3
