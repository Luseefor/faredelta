# Local development

## Services

1. Start PostgreSQL with `docker compose up -d postgres` from the repository root.
2. Copy both `.env.example` files to `backend/.env` and `frontend/.env.local`.
3. In `backend`, run `uv sync`, `uv run alembic upgrade head`, then `uv run uvicorn app.main:app --reload`.
4. In `frontend`, run `pnpm install` and `pnpm dev`.

The frontend runs on port 3000 and proxies API requests to FastAPI on port 8000. The database runs on port 5432. Real `.env` files are ignored by Git.

## Migrations

After changing SQLAlchemy models, create and review an Alembic revision before applying it. Apply migrations with `uv run alembic upgrade head`; roll back one revision with `uv run alembic downgrade -1`.

## Deployment notes

- Vercel: deploy `frontend` as the root directory and set `FAREDELTA_API_URL` to the public backend URL.
- Render or Railway: deploy `backend`, run `uv run alembic upgrade head` as a release command, and start with the Dockerfile or uvicorn command.
- Scheduled refreshes: set a long random `TRACKED_ROUTE_JOB_TOKEN` on the backend and configure the platform scheduler to `POST /api/jobs/refresh-tracked-routes` with the matching `X-FareDelta-Job-Token` header.
- Neon or Supabase: provide an asyncpg-compatible `DATABASE_URL`, including TLS parameters required by the chosen service.

No external provider credential is required in automatic or mock mode. With no tokens configured, automatic mode uses deterministic mock data.

## Free recently observed fares

Create a free Travelpayouts affiliate account and Data API token, then add the token only to `backend/.env`:

```dotenv
FLIGHT_PROVIDER=auto
TRAVELPAYOUTS_ACCESS_TOKEN=your-private-token
TRAVELPAYOUTS_BASE_URL=https://api.travelpayouts.com
TRAVELPAYOUTS_MARKET=us
```

The Data API returns fares observed by Aviasales users during the previous 48 hours. They are useful for price discovery and history, but they are not guaranteed live availability. FareDelta labels these results `Travelpayouts · recently observed`. This feed supports economy results; automatic mode falls back to mock data for other cabins, missing coverage, or temporary provider failures. Set `FLIGHT_PROVIDER=travelpayouts` to disable fallback and expose an empty/error state instead.

## Duffel test mode

Create a test access token from the [Duffel dashboard](https://duffel.com/guides/getting-started), then set these backend-only values in `backend/.env`:

```dotenv
FLIGHT_PROVIDER=duffel
DUFFEL_ACCESS_TOKEN=duffel_test_your-token
DUFFEL_BASE_URL=https://api.duffel.com
```

Restart FastAPI after changing provider settings. Never add real credentials to `.env.example`, Git, frontend variables, or browser code. Set `FLIGHT_PROVIDER=mock` to force deterministic local results. Duffel test mode is safe for integration work, but its schedules and prices are not intended to represent live inventory.
