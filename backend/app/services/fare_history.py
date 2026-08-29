from datetime import date

from app.repositories.fare_history import FareHistoryRepository
from app.schemas.flights import FareHistoryResponse


class FareHistoryService:
    def __init__(self, repository: FareHistoryRepository) -> None:
        self.repository = repository

    async def get_history(
        self,
        origin: str,
        destination: str,
        departure_date: date | None = None,
        return_date: date | None = None,
    ) -> FareHistoryResponse:
        points = await self.repository.get_route_history(
            origin, destination, departure_date, return_date
        )
        prices = [point.lowest_price for point in points]
        return FareHistoryResponse(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            currency=points[-1].currency if points else "USD",
            point_count=len(points),
            current_price=prices[-1] if prices else None,
            lowest_price=min(prices) if prices else None,
            highest_price=max(prices) if prices else None,
            points=points,
        )
