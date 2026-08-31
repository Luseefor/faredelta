import asyncio
import logging
import uuid
from calendar import monthrange
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urljoin

import httpx

from app.core.exceptions import FlightProviderError
from app.providers.base import FlightProvider
from app.schemas.flights import (
    Airline,
    Airport,
    CabinClass,
    FlightOffer,
    FlightSearchRequest,
    FlightSegment,
)

_AIRLINE_NAMES = {
    "AA": "American Airlines",
    "AC": "Air Canada",
    "AF": "Air France",
    "AS": "Alaska Airlines",
    "B6": "JetBlue",
    "BA": "British Airways",
    "DL": "Delta Air Lines",
    "EK": "Emirates",
    "IB": "Iberia",
    "KL": "KLM",
    "LH": "Lufthansa",
    "QF": "Qantas",
    "QR": "Qatar Airways",
    "SQ": "Singapore Airlines",
    "TK": "Turkish Airlines",
    "UA": "United Airlines",
    "WN": "Southwest Airlines",
}

logger = logging.getLogger(__name__)


class TravelpayoutsFlightProvider(FlightProvider):
    """Normalize recently observed Aviasales fares from Travelpayouts' free Data API."""

    def __init__(
        self,
        access_token: str,
        base_url: str = "https://api.travelpayouts.com",
        market: str = "us",
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.access_token = access_token
        self.base_url = base_url.rstrip("/")
        self.market = market
        self.client = client or httpx.AsyncClient(timeout=20)

    def get_provider_name(self) -> str:
        return "Travelpayouts · recently observed"

    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        if request.cabin_class is not CabinClass.economy:
            return []
        try:
            month_pairs = _month_pairs(request)
            if not month_pairs:
                return []
            results = await asyncio.gather(
                *(self._search_period(request, departure_month, return_month)
                  for departure_month, return_month in month_pairs),
                return_exceptions=True,
            )
            payloads = [result for result in results if isinstance(result, dict)]
            failures = [result for result in results if isinstance(result, BaseException)]
            if not payloads and failures:
                first_failure = failures[0]
                if isinstance(first_failure, FlightProviderError):
                    raise first_failure
                raise FlightProviderError(
                    "Travelpayouts search could not be completed"
                ) from first_failure
            if failures:
                logger.warning(
                    "Travelpayouts returned partial coverage: %s of %s date periods failed",
                    len(failures),
                    len(results),
                )
            offers = [
                offer
                for payload in payloads
                for offer in self._normalize(payload, request)
                if offer.stops <= request.maximum_stops
            ]
            return sorted(offers, key=lambda offer: (offer.price, offer.duration_minutes))
        except FlightProviderError:
            raise
        except (
            httpx.HTTPError,
            InvalidOperation,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            raise FlightProviderError("Travelpayouts search could not be completed") from exc

    async def _search_period(
        self,
        request: FlightSearchRequest,
        departure_month: str,
        return_month: str,
    ) -> dict[str, Any]:
        response = await self.client.get(
            f"{self.base_url}/aviasales/v3/prices_for_dates",
            params={
                "origin": request.origin,
                "destination": request.destination,
                "departure_at": departure_month,
                "return_at": return_month,
                "one_way": "false",
                "direct": str(request.maximum_stops == 0).lower(),
                "currency": "usd",
                "market": self.market,
                "sorting": "price",
                "unique": "false",
                "limit": 100,
                "page": 1,
            },
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
                "X-Access-Token": self.access_token,
            },
        )
        if response.status_code >= 400:
            raise FlightProviderError("Travelpayouts fare lookup failed")
        payload: dict[str, Any] = response.json()
        if not payload.get("success", False):
            raise FlightProviderError("Travelpayouts fare lookup failed")
        return payload

    def _normalize(
        self, payload: dict[str, Any], request: FlightSearchRequest
    ) -> list[FlightOffer]:
        currency = str(payload.get("currency") or "USD")
        offers: list[FlightOffer] = []
        for raw in payload.get("data", []):
            stops = max(int(raw.get("transfers", 0)), int(raw.get("return_transfers", 0)))
            departure_date = datetime.fromisoformat(str(raw["departure_at"])).date()
            return_date = datetime.fromisoformat(str(raw["return_at"])).date()
            if stops > request.maximum_stops:
                continue
            if (
                not request.earliest_departure_date
                <= departure_date
                <= request.latest_departure_date
            ):
                continue
            if not request.earliest_return_date <= return_date <= request.latest_return_date:
                continue
            offers.append(self._normalize_offer(raw, request, currency))
        return offers

    def _normalize_offer(
        self, raw: dict[str, Any], request: FlightSearchRequest, currency: str
    ) -> FlightOffer:
        departure_time = datetime.fromisoformat(str(raw["departure_at"]))
        outbound_duration = int(raw["duration_to"])
        arrival_time = departure_time + timedelta(minutes=outbound_duration)
        return_time = datetime.fromisoformat(str(raw["return_at"]))
        return_duration = int(raw.get("duration_back") or outbound_duration)
        airline_code = str(raw["airline"]).upper()
        airline = Airline(
            code=airline_code,
            name=_AIRLINE_NAMES.get(airline_code, f"Airline {airline_code}"),
        )
        origin_code = str(raw.get("origin_airport") or request.origin).upper()
        destination_code = str(raw.get("destination_airport") or request.destination).upper()
        origin = Airport(code=origin_code)
        destination = Airport(code=destination_code)
        flight_number = f"{airline_code}{raw['flight_number']}"
        offer_key = ":".join(
            (
                "travelpayouts",
                origin_code,
                destination_code,
                departure_time.isoformat(),
                return_time.isoformat(),
                flight_number,
                str(raw["price"]),
            )
        )
        offer_id = uuid.uuid5(uuid.NAMESPACE_URL, offer_key)
        link = str(raw.get("link") or "")
        booking_url = (
            urljoin("https://www.aviasales.com", link)
            if link
            else ("https://www.aviasales.com/search")
        )
        return FlightOffer(
            id=offer_id,
            provider=self.get_provider_name(),
            airline=airline,
            origin=origin,
            destination=destination,
            departure_time=departure_time,
            arrival_time=arrival_time,
            duration_minutes=outbound_duration,
            stops=max(int(raw.get("transfers", 0)), int(raw.get("return_transfers", 0))),
            price=(Decimal(str(raw["price"])) * request.travelers).quantize(
                Decimal("0.01")
            ),
            currency=currency.upper(),
            cabin_class=request.cabin_class,
            booking_url=booking_url,
            retrieved_at=datetime.now(UTC),
            segments=[
                FlightSegment(
                    airline=airline,
                    flight_number=flight_number,
                    origin=origin,
                    destination=destination,
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    duration_minutes=outbound_duration,
                ),
                FlightSegment(
                    airline=airline,
                    flight_number=f"{airline_code} return",
                    origin=destination,
                    destination=origin,
                    departure_time=return_time,
                    arrival_time=return_time + timedelta(minutes=return_duration),
                    duration_minutes=return_duration,
                ),
            ],
            return_date=return_time.date(),
        )


def _months_between(start: date, end: date) -> list[str]:
    months: list[str] = []
    cursor = start.replace(day=1)
    last = end.replace(day=1)
    while cursor <= last:
        months.append(cursor.strftime("%Y-%m"))
        cursor = (cursor.replace(day=28) + timedelta(days=4)).replace(day=1)
    return months


def _month_pairs(request: FlightSearchRequest) -> list[tuple[str, str]]:
    departure_months = _months_between(
        request.earliest_departure_date, request.latest_departure_date
    )
    return_months = _months_between(
        request.earliest_return_date, request.latest_return_date
    )
    return [
        (departure, returning)
        for departure in departure_months
        for returning in return_months
        if _supports_trip_length(request, departure, returning)
    ]


def _supports_trip_length(
    request: FlightSearchRequest, departure_month: str, return_month: str
) -> bool:
    """Return whether a month pair can contain a 1–30 day Travelpayouts itinerary."""
    departure_first, departure_last = _month_bounds(departure_month)
    return_first, return_last = _month_bounds(return_month)
    departure_start = max(request.earliest_departure_date, departure_first)
    departure_end = min(request.latest_departure_date, departure_last)
    return_start = max(request.earliest_return_date, return_first)
    return_end = min(request.latest_return_date, return_last)
    earliest_eligible_departure = max(departure_start, return_start - timedelta(days=30))
    latest_eligible_departure = min(departure_end, return_end - timedelta(days=1))
    return earliest_eligible_departure <= latest_eligible_departure


def _month_bounds(value: str) -> tuple[date, date]:
    year, month = (int(part) for part in value.split("-"))
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])
