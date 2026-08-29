import hashlib
import random
import uuid
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from app.providers.base import FlightProvider
from app.schemas.flights import (
    Airline,
    Airport,
    FlightOffer,
    FlightSearchRequest,
    FlightSegment,
)

AIRLINES = (
    ("DL", "Delta Air Lines"),
    ("UA", "United Airlines"),
    ("AA", "American Airlines"),
    ("AS", "Alaska Airlines"),
    ("B6", "JetBlue"),
)


def _sample_dates(start: date, end: date, count: int = 3) -> list[date]:
    days = (end - start).days
    if days <= 0:
        return [start]
    offsets = sorted({round(index * days / (count - 1)) for index in range(count)})
    return [start + timedelta(days=offset) for offset in offsets]


class MockFlightProvider(FlightProvider):
    def get_provider_name(self) -> str:
        return "FareDelta Mock"

    async def search_flights(self, request: FlightSearchRequest) -> list[FlightOffer]:
        seed_material = request.model_dump_json()
        seed = int(hashlib.sha256(seed_material.encode()).hexdigest()[:16], 16)
        randomizer = random.Random(seed)
        departures = _sample_dates(request.earliest_departure_date, request.latest_departure_date)
        returns = _sample_dates(request.earliest_return_date, request.latest_return_date)
        retrieved_at = datetime.now(UTC)
        offers: list[FlightOffer] = []

        for date_index, departure_date in enumerate(departures):
            for return_index, return_date in enumerate(returns):
                if return_date <= departure_date:
                    continue
                airline_code, airline_name = AIRLINES[
                    (date_index * 2 + return_index) % len(AIRLINES)
                ]
                stops = min(request.maximum_stops, (return_index + date_index) % 3)
                duration = 165 + randomizer.randint(0, 155) + stops * 75
                depart_hour = 6 + return_index * 5 + randomizer.randint(0, 2)
                departure_time = datetime.combine(
                    departure_date, time(depart_hour, randomizer.choice((0, 15, 30, 45))), UTC
                )
                arrival_time = departure_time + timedelta(minutes=duration)
                trip_days = (return_date - departure_date).days
                base_price = 188 + date_index * 31 + return_index * 34 + stops * 22 + trip_days * 2
                price = Decimal(base_price + randomizer.randint(0, 70)).quantize(Decimal("0.01"))
                airline = Airline(code=airline_code, name=airline_name)
                origin = Airport(code=request.origin)
                destination = Airport(code=request.destination)
                segment = FlightSegment(
                    airline=airline,
                    flight_number=f"{airline_code}{100 + randomizer.randint(0, 899)}",
                    origin=origin,
                    destination=destination,
                    departure_time=departure_time,
                    arrival_time=arrival_time,
                    duration_minutes=duration,
                )
                offer_key = f"{seed_material}:{departure_date}:{return_date}"
                offer_id = uuid.uuid5(uuid.NAMESPACE_URL, offer_key)
                offers.append(
                    FlightOffer(
                        id=offer_id,
                        provider=self.get_provider_name(),
                        airline=airline,
                        origin=origin,
                        destination=destination,
                        departure_time=departure_time,
                        arrival_time=arrival_time,
                        duration_minutes=duration,
                        stops=stops,
                        price=price,
                        currency="USD",
                        cabin_class=request.cabin_class,
                        booking_url=f"https://example.invalid/mock-booking/{offer_id}",
                        retrieved_at=retrieved_at,
                        segments=[segment],
                        return_date=return_date,
                    )
                )

        return offers
