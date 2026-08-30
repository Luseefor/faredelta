import asyncio
import re
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


def parse_duration_minutes(value: str) -> int:
    match = _DURATION_PATTERN.fullmatch(value)
    if match is None:
        raise ValueError("Unsupported ISO-8601 duration")
    return int(match.group(1) or 0) * 60 + int(match.group(2) or 0)


class DuffelFlightProvider(FlightProvider):
    def __init__(
        self,
        access_token: str,
        base_url: str = "https://api.duffel.com",
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.access_token = access_token
        self.base_url = base_url.rstrip("/")
        self.client = client or httpx.AsyncClient(timeout=30)

    def get_provider_name(self) -> str:
        return "Duffel"

    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        try:
            date_pairs = sample_date_pairs(
                request.earliest_departure_date,
                request.latest_departure_date,
                request.earliest_return_date,
                request.latest_return_date,
            )
            payloads = await asyncio.gather(
                *(
                    self._search_pair(request, departure_date, return_date)
                    for departure_date, return_date in date_pairs
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
            raise FlightProviderError("Duffel search could not be completed") from exc

    async def _search_pair(
        self,
        request: FlightSearchRequest,
        departure_date: date,
        return_date: date,
    ) -> dict[str, Any]:
        response = await self.client.post(
            f"{self.base_url}/air/offer_requests",
            params={"return_offers": "true", "supplier_timeout": 10000},
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Duffel-Version": "v2",
                "Authorization": f"Bearer {self.access_token}",
            },
            json={
                "data": {
                    "slices": [
                        {
                            "origin": request.origin,
                            "destination": request.destination,
                            "departure_date": departure_date.isoformat(),
                        },
                        {
                            "origin": request.destination,
                            "destination": request.origin,
                            "departure_date": return_date.isoformat(),
                        },
                    ],
                    "passengers": [{"type": "adult"} for _ in range(request.travelers)],
                    "cabin_class": request.cabin_class.value,
                    "max_connections": request.maximum_stops,
                }
            },
        )
        if response.status_code >= 400:
            raise FlightProviderError("Duffel flight search failed")
        payload: dict[str, Any] = response.json()
        return payload

    def _normalize(
        self, payload: dict[str, Any], request: FlightSearchRequest
    ) -> list[FlightOffer]:
        raw_offers = payload.get("data", {}).get("offers", [])
        cheapest = sorted(raw_offers, key=lambda offer: Decimal(str(offer["total_amount"])))[:2]
        return [self._normalize_offer(raw_offer, request) for raw_offer in cheapest]

    def _normalize_offer(
        self, raw_offer: dict[str, Any], request: FlightSearchRequest
    ) -> FlightOffer:
        slices = raw_offer["slices"]
        outbound = slices[0]
        outbound_segments = outbound["segments"]
        all_raw_segments = [segment for slice_ in slices for segment in slice_["segments"]]
        segments = [self._normalize_segment(segment) for segment in all_raw_segments]
        first_operating = outbound_segments[0]["operating_carrier"]
        airline_code = first_operating.get("iata_code") or "ZZ"
        airline = Airline(code=airline_code, name=first_operating["name"])
        total = Decimal(str(raw_offer["total_amount"])) / request.travelers
        price = total.quantize(Decimal("0.01"))
        departure_time = datetime.fromisoformat(outbound_segments[0]["departing_at"])
        arrival_time = datetime.fromisoformat(outbound_segments[-1]["arriving_at"])
        return_date = datetime.fromisoformat(slices[1]["segments"][0]["departing_at"]).date()
        stops = max(len(slice_["segments"]) - 1 for slice_ in slices)
        offer_id = uuid.uuid5(uuid.NAMESPACE_URL, f"duffel:{raw_offer['id']}")
        return FlightOffer(
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
            currency=str(raw_offer["total_currency"]),
            cabin_class=request.cabin_class,
            booking_url=f"https://example.invalid/duffel-offer/{offer_id}",
            retrieved_at=datetime.now(UTC),
            segments=segments,
            return_date=return_date,
        )

    def _normalize_segment(self, raw_segment: dict[str, Any]) -> FlightSegment:
        operating = raw_segment["operating_carrier"]
        marketing = raw_segment["marketing_carrier"]
        operating_code = operating.get("iata_code") or marketing.get("iata_code") or "ZZ"
        marketing_code = marketing.get("iata_code") or operating_code
        origin = raw_segment["origin"]
        destination = raw_segment["destination"]
        return FlightSegment(
            airline=Airline(code=operating_code, name=operating["name"]),
            flight_number=f"{marketing_code}{raw_segment['marketing_carrier_flight_number']}",
            origin=Airport(code=origin["iata_code"], name=origin.get("name")),
            destination=Airport(code=destination["iata_code"], name=destination.get("name")),
            departure_time=datetime.fromisoformat(raw_segment["departing_at"]),
            arrival_time=datetime.fromisoformat(raw_segment["arriving_at"]),
            duration_minutes=parse_duration_minutes(raw_segment["duration"]),
        )
