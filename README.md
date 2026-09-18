# FareDelta

![FareDelta icon](frontend/src/app/icon.svg)

FareDelta is a flexible-date flight search and airfare-intelligence application. It compares normalized fares across departure and return windows, saves observed prices, and turns repeated searches into useful route history.

**Live:** [faredelta.rijan.sh](https://faredelta.rijan.sh)

## What works today

- Worldwide airport autocomplete with more than 9,000 active IATA airports
- Round-trip and one-way search across flexible departure (and return) windows
- Explore view: cheapest observed destinations from any origin
- Nearby-airport expansion to the closest alternate on each end
- Traveler, cabin, and stop filters
- Recently observed Travelpayouts fares with explicit source labeling
- Deterministic local-development provider for offline work
- Flexible-date fare matrix (round-trip) with cheapest, fastest, and balanced sorting
- PostgreSQL fare-history snapshots and route charts
- Saved route tracking with pause/resume, editing, per-route check cadence, and manual price refreshes
- Route detail pages with full fare-history charts
- Scheduled refreshes with per-route cadence, staggering, and exponential backoff
- Clerk accounts (email/password, Google OAuth, MFA) with cross-device watchlist sync and anonymous-route claim on sign in
- Price alerts (target price and/or drop percentage) with in-app notification center, alerts overview, and email via Resend
- Recent searches, shareable search links, browser-stored search defaults, and settings page
- Responsive homepage, search results, empty states, and error states

Travelpayouts results are cached observations, not guaranteed live inventory. FareDelta keeps provider adapters behind a shared interface so additional live-search sources can be added without changing the UI or internal offer model.

## Architecture

```text
Browser
  → Next.js route handlers (Vercel)
    → FastAPI service (Railway)
      → provider abstraction
        → Travelpayouts
        → optional local-development fallback
      → SQLAlchemy repositories
        → PostgreSQL (Railway)
```

The browser never receives provider credentials or the private database URL. Next.js proxies API traffic through same-origin route handlers, while FastAPI owns validation, provider selection, normalization, and persistence.

## Technology

- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Motion, Anime.js
- Backend: FastAPI, Pydantic, SQLAlchemy 2, Alembic, asyncpg
- Database: PostgreSQL 17
- Tooling: pnpm, uv, Docker Compose, Vitest, pytest, Ruff, mypy
- Hosting: Vercel frontend; Railway API and PostgreSQL

## Local development

Requirements: Docker, pnpm, Python 3.12 or newer, and uv.

```bash
docker compose up -d postgres
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Open [localhost:3000](http://localhost:3000). Interactive API documentation is available at [localhost:8000/docs](http://localhost:8000/docs).

External credentials are optional locally. With `FLIGHT_PROVIDER=auto`, FareDelta uses configured server-side providers. Keep `MOCK_PROVIDER_ENABLED=false` in production so unavailable provider coverage returns a clear empty or error state instead of sample fares.

## Verification

```bash
cd backend
uv run ruff check .
uv run mypy app
uv run pytest

cd ../frontend
pnpm lint
pnpm test
pnpm build
```

## Documentation

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Local development and deployment](docs/local-development.md)
- [Airport catalog](docs/airport-data.md)

## Current scope

FareDelta does not yet provide booking guarantees, baggage comparison, nearby-airport expansion, or BUY/WAIT predictions.
