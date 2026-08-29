from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.base import Base
from app.models.entities import FareHistory, FlightOfferRecord, FlightSearch
from app.providers.mock import MockFlightProvider
from app.repositories.fare_history import FareHistoryRepository
from app.repositories.flight_searches import FlightSearchRepository
from tests.test_schemas import valid_request


async def test_repository_persists_search_offers_and_history_transactionally() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    request = valid_request()
    offers = await MockFlightProvider().search_flights(request)

    async with factory() as session:
        search_id = await FlightSearchRepository(session).save_search_with_offers(request, offers)
        assert await session.scalar(select(func.count()).select_from(FlightSearch)) == 1
        assert await session.scalar(select(func.count()).select_from(FlightOfferRecord)) == len(
            offers
        )
        assert await session.scalar(select(func.count()).select_from(FareHistory)) == len(offers)
        assert await session.get(FlightSearch, search_id) is not None
        await FlightSearchRepository(session).save_search_with_offers(request, offers)
        assert await session.scalar(select(func.count()).select_from(FlightSearch)) == 2
        assert await session.scalar(select(func.count()).select_from(FlightOfferRecord)) == 2 * len(
            offers
        )
        history = await FareHistoryRepository(session).get_route_history("ORD", "LAX")
        assert len(history) == 1
        assert history[0].offers_sampled == 2 * len(offers)
        assert history[0].lowest_price == min(offer.price for offer in offers)

    await engine.dispose()
