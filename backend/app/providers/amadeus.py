import asyncio
import re
import time
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

import httpx

from app.core.exceptions import FlightProviderError
from app.providers.base import FlightProvider
from app.providers.sampling import sample_date_pairs
from app.schemas.flights import (
    Airline,
    Airport,
    FlightOffer,
    FlightSearchRequest,
    FlightSegment,
)

_DURATION_PATTERN = re.compile(r"^PT(?:(\d+)H)?(?:(\d+)M)?$")
_CABIN_MAP = {
    "economy": "ECONOMY",
    "premium_economy": "PREMIUM_ECONOMY",
    "business": "BUSINESS",
    "first": "FIRST",
}


def parse_duration_minutes(value: str) -> int:
    match = _DURATION_PATTERN.fullmatch(value)
    if match is None:
        raise ValueError("Unsupported ISO-8601 duration")
    return int(match.group(1) or 0) * 60 + int(match.group(2) or 0)


class AmadeusFlightProvider(FlightProvider):
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        base_url: str = "https://test.api.amadeus.com",
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.base_url = base_url.rstrip("/")
        self.client = client or httpx.AsyncClient(timeout=20)
        self._access_token: str | None = None
        self._token_expires_at = 0.0
        self._token_lock = asyncio.Lock()

    def get_provider_name(self) -> str:
        return "Amadeus Self-Service"

    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        try:
            token = await self._get_access_token()
            date_pairs = sample_date_pairs(
                request.earliest_departure_date,
                request.latest_departure_date,
                request.earliest_return_date,
                request.latest_return_date,
            )
            payloads = await asyncio.gather(
                *(
                    self._search_pair(request, departure, return_date, token)
                    for departure, return_date in date_pairs
                )
            )
            offers = [offer for payload in payloads for offer in self._normalize(payload, request)]
            return [offer for offer in offers if offer.stops <= request.maximum_stops]
        except FlightProviderError:
            raise
        except (
            httpx.HTTPError,
            IndexError,
            InvalidOperation,
            KeyError,
            TypeError,
            ValueError,
        ) as exc:
            raise FlightProviderError("Amadeus search could not be completed") from exc

    async def _get_access_token(self) -> str:
        if self._access_token and time.monotonic() < self._token_expires_at:
            return self._access_token
        async with self._token_lock:
            if self._access_token and time.monotonic() < self._token_expires_at:
                return self._access_token
            response = await self.client.post(
                f"{self.base_url}/v1/security/oauth2/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            if response.status_code >= 400:
                raise FlightProviderError("Amadeus authentication failed")
            body = response.json()
            self._access_token = str(body["access_token"])
            expires_in = max(int(body.get("expires_in", 1800)) - 60, 60)
            self._token_expires_at = time.monotonic() + expires_in
            return self._access_token

    async def _search_pair(
        self,
        request: FlightSearchRequest,
        departure_date: date,
        return_date: date,
        token: str,
    ) -> dict[str, Any]:
        params: dict[str, str | int] = {
            "originLocationCode": request.origin,
            "destinationLocationCode": request.destination,
            "departureDate": departure_date.isoformat(),
            "returnDate": return_date.isoformat(),
            "adults": request.travelers,
            "travelClass": _CABIN_MAP[request.cabin_class.value],
            "currencyCode": "USD",
            "max": 2,
        }
        if request.maximum_stops == 0:
            params["nonStop"] = "true"
        response = await self.client.get(
            f"{self.base_url}/v2/shopping/flight-offers",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
        if response.status_code >= 400:
            raise FlightProviderError("Amadeus flight search failed")
        payload: dict[str, Any] = response.json()
        return payload

    def _normalize(
        self, payload: dict[str, Any], request: FlightSearchRequest
    ) -> list[FlightOffer]:
        carriers: dict[str, str] = payload.get("dictionaries", {}).get("carriers", {})
        retrieved_at = datetime.now(UTC)
        normalized: list[FlightOffer] = []
        for raw_offer in payload.get("data", []):
            itineraries = raw_offer["itineraries"]
            outbound = itineraries[0]
            outbound_segments = outbound["segments"]
            all_raw_segments = [
                segment for itinerary in itineraries for segment in itinerary["segments"]
            ]
            segments = [self._normalize_segment(segment, carriers) for segment in all_raw_segments]
            validating_codes = raw_offer.get("validatingAirlineCodes") or [
                outbound_segments[0]["carrierCode"]
            ]
            airline_code = validating_codes[0]
            airline = Airline(code=airline_code, name=carriers.get(airline_code, airline_code))
            total = Decimal(str(raw_offer["price"]["grandTotal"])) / request.travelers
            price = total.quantize(Decimal("0.01"))
            departure_time = datetime.fromisoformat(outbound_segments[0]["departure"]["at"])
            arrival_time = datetime.fromisoformat(outbound_segments[-1]["arrival"]["at"])
            return_date = datetime.fromisoformat(
                itineraries[1]["segments"][0]["departure"]["at"]
            ).date()
            stops = max(len(itinerary["segments"]) - 1 for itinerary in itineraries)
            if stops > 2:
                continue
            offer_id = uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"amadeus:{raw_offer['id']}:{departure_time.isoformat()}:{return_date.isoformat()}",
            )
            normalized.append(
                FlightOffer(
                    id=offer_id,
                    provider=self.get_provider_name(),
                    airline=airline,
                    origin=Airport(code=request.origin),
                    destination=Airport(code=request.destination),
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    duration_minutes=parse_duration_minutes(outbound["duration"]),
                    stops=stops,
                    price=price,
                    currency=str(raw_offer["price"]["currency"]),
                    cabin_class=request.cabin_class,
                    booking_url=f"https://example.invalid/amadeus-offer/{offer_id}",
                    retrieved_at=retrieved_at,
                    segments=segments,
                    return_date=return_date,
                )
            )
        return normalized

    def _normalize_segment(
        self, raw_segment: dict[str, Any], carriers: dict[str, str]
    ) -> FlightSegment:
        airline_code = raw_segment.get("operating", {}).get(
            "carrierCode", raw_segment["carrierCode"]
        )
        return FlightSegment(
            airline=Airline(code=airline_code, name=carriers.get(airline_code, airline_code)),
            flight_number=f"{raw_segment['carrierCode']}{raw_segment['number']}",
            origin=Airport(code=raw_segment["departure"]["iataCode"]),
            destination=Airport(code=raw_segment["arrival"]["iataCode"]),
            departure_time=datetime.fromisoformat(raw_segment["departure"]["at"]),
            arrival_time=datetime.fromisoformat(raw_segment["arrival"]["at"]),
            duration_minutes=parse_duration_minutes(raw_segment["duration"]),
        )
