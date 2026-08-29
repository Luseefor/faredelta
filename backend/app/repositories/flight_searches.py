import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import FareHistory, FlightOfferRecord, FlightSearch
from app.schemas.flights import FlightOffer, FlightSearchRequest


class FlightSearchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_search_with_offers(
        self, request: FlightSearchRequest, offers: list[FlightOffer]
    ) -> uuid.UUID:
        search = FlightSearch(**request.model_dump(mode="python"), status="completed")
        self.session.add(search)
        await self.session.flush()

        today = datetime.now(UTC).date()
        history_records: list[FareHistory] = []
        for offer in offers:
            record_id = uuid.uuid4()
            record = FlightOfferRecord(
                id=record_id,
                search_id=search.id,
                provider=offer.provider,
                airline_code=offer.airline.code,
                airline_name=offer.airline.name,
                origin=offer.origin.code,
                destination=offer.destination.code,
                departure_time=offer.departure_time,
                arrival_time=offer.arrival_time,
                duration_minutes=offer.duration_minutes,
                stops=offer.stops,
                price=offer.price,
                currency=offer.currency,
                cabin_class=offer.cabin_class.value,
                booking_url=str(offer.booking_url),
                retrieved_at=offer.retrieved_at,
                segments=[segment.model_dump(mode="json") for segment in offer.segments],
            )
            self.session.add(record)
            history_records.append(
                FareHistory(
                    offer_id=record_id,
                    origin=offer.origin.code,
                    destination=offer.destination.code,
                    departure_date=offer.departure_time.date(),
                    return_date=offer.return_date,
                    airline=offer.airline.name,
                    provider=offer.provider,
                    price=offer.price,
                    currency=offer.currency,
                    retrieved_at=offer.retrieved_at,
                    days_until_departure=(offer.departure_time.date() - today).days,
                )
            )

        # PostgreSQL enforces this FK immediately, so offers must exist before history rows.
        await self.session.flush()
        self.session.add_all(history_records)
        await self.session.commit()
        return search.id
