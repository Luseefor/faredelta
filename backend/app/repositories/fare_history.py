from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.entities import FareHistory
from app.schemas.flights import FareHistoryPoint


class FareHistoryRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_route_history(
        self,
        origin: str,
        destination: str,
        departure_date: date | None = None,
        return_date: date | None = None,
        limit: int = 30,
    ) -> list[FareHistoryPoint]:
        statement = (
            select(
                FareHistory.retrieved_at,
                FareHistory.currency,
                func.min(FareHistory.price).label("lowest_price"),
                func.count(FareHistory.id).label("offers_sampled"),
            )
            .where(FareHistory.origin == origin, FareHistory.destination == destination)
            .group_by(FareHistory.retrieved_at, FareHistory.currency)
            .order_by(FareHistory.retrieved_at.desc())
            .limit(limit)
        )
        if departure_date is not None:
            statement = statement.where(FareHistory.departure_date == departure_date)
        if return_date is not None:
            statement = statement.where(FareHistory.return_date == return_date)

        rows = (await self.session.execute(statement)).all()
        return [
            FareHistoryPoint(
                retrieved_at=row.retrieved_at,
                lowest_price=row.lowest_price,
                currency=row.currency,
                offers_sampled=row.offers_sampled,
            )
            for row in reversed(rows)
        ]
