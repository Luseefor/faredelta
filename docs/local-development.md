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

No external provider credential is required while the mock provider is active.
