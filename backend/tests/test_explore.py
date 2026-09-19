import httpx

from app.api.dependencies import get_explore_service
from app.main import app
from app.schemas.explore import CheapDestinationsQuery
from app.services.explore import ExploreService, parse_fare
from tests.test_auth import make_client


def make_service(handler: object) -> ExploreService:
    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))  # type: ignore[arg-type]
    return ExploreService("test-token", "https://travelpayouts.test", "us", client)


async def test_cheap_destinations_parses_dict_and_list_shapes() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/prices/cheap"
        assert request.headers["X-Access-Token"] == "test-token"
        assert request.url.params["origin"] == "ORD"
        assert request.url.params["currency"] == "USD"
        assert request.url.params["limit"] == "20"
        return httpx.Response(
            200,
            json={
                "success": True,
                "data": {
                    "LAX": {
                        "origin": "ORD",
                        "destination": "LAX",
                        "price": 189.5,
                        "airline": "UA",
                        "flight_number": "101",
                        "departure_at": "2026-11-05T08:00:00",
                        "return_at": "2026-11-12T18:00:00",
                        "transfers": 0,
                    },
                    "ACC": {
                        "1": {
                            "airline": "TK",
                            "departure_at": "2027-08-10T11:25:00-05:00",
                            "return_at": "2027-08-24T07:00:00Z",
                            "price": 1299,
                            "flight_number": 186,
                        }
                    },
                    "junk": {"destination": "XX", "price": -5},
                },
            },
        )

    service = make_service(handler)
    assert service.configured is True
    response = await service.cheap_destinations(CheapDestinationsQuery(origin="ORD"))
    assert response.origin == "ORD"
    assert response.result_count == 2
    by_destination = {item.destination: item for item in response.destinations}
    assert by_destination["LAX"].price == 189.5
    assert by_destination["LAX"].airline == "UA"
    assert by_destination["LAX"].transfers == 0
    assert by_destination["ACC"].price == 1299
    assert by_destination["ACC"].flight_number == "186"
    assert response.destinations[0].destination == "LAX"


async def test_cheap_destinations_empty_without_token() -> None:
    service = ExploreService(None)
    assert service.configured is False


async def test_cheap_destinations_endpoint_states() -> None:
    # Hermetic: local .env may carry a real token, so pin the service.
    app.dependency_overrides[get_explore_service] = lambda: ExploreService(None)
    try:
        async for client, _ in make_client():
            bad = await client.get("/api/flights/cheap-destinations", params={"origin": "XX"})
            assert bad.status_code == 422
            # Unconfigured token: honest 503, not an empty lie.
            missing = await client.get(
                "/api/flights/cheap-destinations", params={"origin": "ORD"}
            )
            assert missing.status_code == 503
            assert missing.json() == {"detail": "Cheap fares are not configured."}
    finally:
        app.dependency_overrides.clear()


def test_parse_fare_rejects_bad_rows() -> None:
    assert parse_fare("ORD", "USD", {}) is None
    assert parse_fare("ORD", "USD", {"destination": "LAX", "price": 0}) is None
    assert parse_fare("ORD", "USD", {"destination": "LAXX", "price": 100}) is None
    parsed = parse_fare("ORD", "USD", {"destination": "lax", "price": "99.9"})
    assert parsed is not None
    assert parsed.destination == "LAX"
    assert parsed.departure_at is None
