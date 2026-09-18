import logging
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.core.exceptions import FlightProviderError
from app.schemas.explore import CheapDestination, CheapDestinationsQuery, CheapDestinationsResponse

logger = logging.getLogger(__name__)


class ExploreService:
    """Cheapest observed destinations from an origin (Travelpayouts v1/prices/cheap).

    Answers "where is cheap?" from the same free token as the search provider.
    """

    def __init__(
        self,
        access_token: str | None,
        base_url: str = "https://api.travelpayouts.com",
        market: str = "us",
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.access_token = access_token
        self.base_url = base_url.rstrip("/")
        self.market = market
        self.client = client or httpx.AsyncClient(timeout=20)

    @property
    def configured(self) -> bool:
        return self.access_token is not None

    async def cheap_destinations(
        self, query: CheapDestinationsQuery
    ) -> CheapDestinationsResponse:
        if self.access_token is None:
            raise FlightProviderError("Cheap fares are not configured")
        params: dict[str, str | int] = {
            "origin": query.origin,
            "currency": query.currency.upper(),
            "market": self.market,
            "limit": query.limit,
            "page": 1,
        }
        if query.depart_date is not None:
            params["depart_date"] = query.depart_date.isoformat()
        if query.return_date is not None:
            params["return_date"] = query.return_date.isoformat()
        try:
            response = await self.client.get(
                f"{self.base_url}/v1/prices/cheap",
                params=params,
                headers={"Accept": "application/json", "X-Access-Token": self.access_token},
            )
        except httpx.HTTPError as exc:
            raise FlightProviderError("Cheap fares are temporarily unavailable") from exc
        if response.status_code >= 400:
            raise FlightProviderError("Cheap fares lookup failed")
        payload: dict[str, Any] = response.json()
        if not payload.get("success", False):
            raise FlightProviderError("Cheap fares lookup failed")
        destinations = sorted(
            (
                item
                for raw in _iter_fares(payload.get("data"))
                for item in [parse_fare(query.origin, query.currency.upper(), raw)]
                if item is not None
            ),
            key=lambda item: item.price,
        )[: query.limit]
        return CheapDestinationsResponse(
            origin=query.origin,
            currency=query.currency.upper(),
            result_count=len(destinations),
            destinations=destinations,
        )


def _iter_fares(data: Any) -> list[dict[str, Any]]:
    if isinstance(data, dict):
        return [item for item in data.values() if isinstance(item, dict)]
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def parse_fare(origin: str, currency: str, raw: dict[str, Any]) -> CheapDestination | None:
    try:
        price = Decimal(str(raw["price"]))
        destination = str(raw.get("destination") or "").strip().upper()
        if price <= 0 or len(destination) != 3 or not destination.isalpha():
            return None
        return CheapDestination(
            origin=str(raw.get("origin") or origin).strip().upper(),
            destination=destination,
            price=price.quantize(Decimal("0.01")),
            currency=str(raw.get("currency") or currency).upper(),
            airline=_clean(raw.get("airline")),
            flight_number=_clean(raw.get("flight_number")),
            departure_at=_parse_dt(raw.get("departure_at")),
            return_at=_parse_dt(raw.get("return_at")),
            transfers=max(int(raw.get("transfers", 0)), 0),
        )
    except (InvalidOperation, KeyError, TypeError, ValueError):
        logger.debug("Skipping unparseable cheap fare", exc_info=True)
        return None


def _clean(value: Any) -> str | None:
    text = str(value).strip() if value is not None else ""
    return text or None


def _parse_dt(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return datetime.fromisoformat(value.strip())
    except ValueError:
        return None
