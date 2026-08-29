from datetime import date

import pytest
from pydantic import ValidationError

from app.schemas.flights import FlightSearchRequest


def valid_request(**overrides: object) -> FlightSearchRequest:
    values: dict[str, object] = {
        "origin": "ord",
        "destination": "LAX",
        "earliest_departure_date": date(2026, 10, 10),
        "latest_departure_date": date(2026, 10, 12),
        "earliest_return_date": date(2026, 10, 16),
        "latest_return_date": date(2026, 10, 19),
        "travelers": 1,
        "cabin_class": "economy",
        "maximum_stops": 1,
    }
    values.update(overrides)
    return FlightSearchRequest.model_validate(values)


def test_normalizes_airport_codes() -> None:
    request = valid_request()
    assert request.origin == "ORD"


@pytest.mark.parametrize(
    "overrides",
    [
        {"origin": "OR"},
        {"destination": "ord"},
        {"travelers": 10},
        {"maximum_stops": 3},
        {"latest_departure_date": date(2026, 10, 9)},
        {"earliest_return_date": date(2026, 10, 10)},
    ],
)
def test_rejects_invalid_searches(overrides: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        valid_request(**overrides)
