from collections.abc import AsyncIterator

from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.session import get_session
from app.main import app
from app.models.entities import FareHistory, FlightOfferRecord, FlightSearch


async def test_search_http_flow_persists_all_snapshots() -> None:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            health = await client.get("/health")
            assert health.status_code == 200
            assert health.json()["database"] == "ready"

            response = await client.post(
                "/api/flights/search",
                json={
                    "origin": "ORD",
                    "destination": "LAX",
                    "earliest_departure_date": "2026-10-10",
                    "latest_departure_date": "2026-10-12",
                    "earliest_return_date": "2026-10-16",
                    "latest_return_date": "2026-10-19",
                    "travelers": 1,
                    "cabin_class": "economy",
                    "maximum_stops": 1,
                },
            )
            assert response.status_code == 200
            body = response.json()
            assert body["result_count"] == 9
            assert isinstance(body["offers"][0]["price"], int | float)

            history = await client.get(
                "/api/flights/history", params={"origin": "ord", "destination": "lax"}
            )
            assert history.status_code == 200
            history_body = history.json()
            assert history_body["point_count"] == 1
            assert history_body["points"][0]["offers_sampled"] == 9
            assert isinstance(history_body["lowest_price"], int | float)

            invalid_history = await client.get(
                "/api/flights/history", params={"origin": "ORD", "destination": "ORD"}
            )
            assert invalid_history.status_code == 422

        async with factory() as session:
            assert await session.scalar(select(func.count()).select_from(FlightSearch)) == 1
            assert await session.scalar(select(func.count()).select_from(FlightOfferRecord)) == 9
            assert await session.scalar(select(func.count()).select_from(FareHistory)) == 9
    finally:
        app.dependency_overrides.clear()
        await engine.dispose()
