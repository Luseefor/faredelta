# FareDelta

FareDelta is a provider-neutral flight search and airfare-intelligence foundation. Version 1 searches flexible round-trip date windows through a deterministic mock provider, compares date pairs in a fare matrix, visualizes saved PostgreSQL price history, and provides a refreshable tracked-routes watchlist with in-app price movement alerts.

## Live deployment

- Web application: https://faredelta.rijan.sh
- API health: https://backend-production-2047.up.railway.app/health

The frontend runs on Vercel. FastAPI and its managed PostgreSQL database run on Railway. Provider and database credentials are stored only in platform environment variables.

The backend includes optional Duffel Flights and Travelpayouts Data API adapters. Automatic mode uses any configured external source and safely falls back to deterministic mock offers, so no external credential is required for local development.

## Quick start

Prerequisites: Docker, pnpm, Python 3.12+, and uv.

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cd backend && uv sync && uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`. API documentation is available at `http://localhost:8000/docs`.

## Verification

```bash
cd backend && uv run ruff check . && uv run mypy app && uv run pytest
cd frontend && pnpm lint && pnpm test && pnpm build
```

See [local development](docs/local-development.md), [architecture](docs/architecture.md), and [API](docs/api.md) for more detail.

Worldwide airport autocomplete is backed by a checked-in public-domain OurAirports snapshot. See [airport data](docs/airport-data.md) for coverage and refresh instructions.
