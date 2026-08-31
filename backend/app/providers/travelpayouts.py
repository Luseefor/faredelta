import asyncio
import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urljoin

import httpx

from app.core.exceptions import FlightProviderError
from app.providers.base import FlightProvider
from app.providers.sampling import sample_date_pairs
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
            payloads = await asyncio.gather(
                *(
                    self._search_pair(request, departure_date, return_date)
                    for departure_date, return_date in sample_date_pairs(
                        request.earliest_departure_date,
                        request.latest_departure_date,
                        request.earliest_return_date,
                        request.latest_return_date,
                    )
                )
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

    async def _search_pair(
        self,
        request: FlightSearchRequest,
        departure_date: date,
        return_date: date,
    ) -> dict[str, Any]:
        response = await self.client.get(
            f"{self.base_url}/aviasales/v3/prices_for_dates",
            params={
                "origin": request.origin,
                "destination": request.destination,
                "departure_at": departure_date.isoformat(),
                "return_at": return_date.isoformat(),
                "one_way": "false",
                "direct": str(request.maximum_stops == 0).lower(),
                "currency": "usd",
                "market": self.market,
                "sorting": "price",
                "unique": "false",
                "limit": 5,
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
            price=Decimal(str(raw["price"])).quantize(Decimal("0.01")),
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
