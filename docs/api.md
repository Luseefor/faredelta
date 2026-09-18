# API

## `GET /health`

Returns API availability and a non-fatal database readiness value.

```json
{"status":"ok","service":"faredelta-api","database":"ready"}
```

## `POST /api/flights/search`

Accepts a round-trip flexible-date search:

```json
{
  "origin": "ORD",
  "destination": "LAX",
  "earliest_departure_date": "2026-10-10",
  "latest_departure_date": "2026-10-12",
  "earliest_return_date": "2026-10-16",
  "latest_return_date": "2026-10-19",
  "travelers": 1,
  "cabin_class": "economy",
  "maximum_stops": 1
}
```

Airport codes are three letters; traveler count is 1–9; maximum stops is 0–2. Cabin class is `economy`, `premium_economy`, `business`, or `first`. A successful response includes a search ID, provider list, retrieval timestamp, result count, and normalized offers.

`origin_alternates` and `destination_alternates` (at most one code each, different from both primaries) expand the search to nearby airports. The service queries every airport pair (up to four), persists one search row, and returns per-offer actual airports plus the `airport_pairs` list. Tracked routes store the alternates and re-expand them on every refresh.

`trip_type` is `round_trip` (default) or `one_way`. One-way searches omit both return dates (422 otherwise), query single slices/dates in every provider — Travelpayouts uses its native `one_way` mode — and return offers with `return_date: null` and a single segment. The fare matrix is a round-trip view; one-way results list offers directly. Tracked routes, history, alerts, and refreshes all work for one-way; a route's trip type is fixed at creation.

Validation failures return HTTP 422. Provider and persistence failures return stable HTTP 502/503 messages without internal details.

The provider that actually produced the offers is returned in `providers` and on every normalized offer. Duffel mode queries the sampled flexible-date grid and normalizes operating carriers, outbound timing, round-trip segments, stop count, per-traveler price, and currency. Travelpayouts mode normalizes recently observed economy fares from its free Data API and labels them as cached observations rather than live inventory. Neither integration exposes credentials or enables purchasing.

## `GET /api/flights/history`

Returns up to 30 saved lowest-fare observations for a route. Optional departure and return dates narrow the history to one date pair.
```text
/api/flights/history?origin=ORD&destination=LAX&departure_date=2026-10-10&return_date=2026-10-18
```

The response includes the current, lowest, and highest saved prices plus timestamped chart points. Version 1 history can contain mock, test, or recently observed provider searches and is clearly labeled as early data in the interface.

## `GET /api/flights/cheap-destinations`

Answers "where is cheap?" from the free Travelpayouts token (`v1/prices/cheap`):

```text
/api/flights/cheap-destinations?origin=ORD&depart_date=2026-11-01&return_date=2026-11-30&limit=20
```

Returns observed minima per destination (price, airline, dates, transfers), sorted cheapest first. Requires the Travelpayouts token; without it the endpoint returns 503 instead of an empty lie. Powers the `/explore` page.

## Authentication

Sign-up, login, OAuth, MFA, and password resets are handled by Clerk; the backend stores no passwords and issues no tokens. The browser sends the Clerk session token as `Authorization: Bearer <token>` (the Next.js proxies attach it server-side). FastAPI verifies the token with the official `clerk-backend-api` SDK, maps the Clerk user ID to an internal `users` row (provisioned on first sight from the Clerk profile), and scopes tracked routes to it. Missing or invalid tokens resolve to signed-out: `GET /api/auth/me` returns 401 and tracked-route endpoints fall back to the anonymous session.

`POST /api/auth/claim` with `{"anonymous_id": "<uuid>"}` moves that browser's anonymous tracked routes into the signed-in account (exact duplicates are folded, not doubled) and returns `{"claimed": n}`. The Next.js signup/login proxies perform this claim automatically using the anonymous cookie, so routes saved before signup are adopted on first sign in.

## Tracked routes

`GET /api/tracked-routes`, `POST /api/tracked-routes`, and `DELETE /api/tracked-routes/{id}` provide watchlist management scoped to the caller. Pass a JWT from `/api/auth/*` as `Authorization: Bearer <token>` for account-scoped routes, or the same-origin Next.js layer assigns an HTTP-only anonymous browser identifier and forwards it in `X-FareDelta-Anonymous-ID`; clients cannot list or delete another owner's routes. Authenticated callers take the account scope even when the anonymous header is present.

The create body uses the same normalized criteria as a flight search. Saving the same active criteria twice is idempotent.

`GET /api/tracked-routes/{id}` returns one route for the caller, or 404 when it belongs to another owner.

`PATCH /api/tracked-routes/{id}` partially updates a route: any of the departure/return window dates, travelers, cabin class, maximum stops, `paused`, `refresh_cadence_hours` (6–168), or the airport alternates. At least one field is required; the merged criteria are re-validated like a flight search (422 on inconsistency). Changing criteria resets the price baseline (`last_price`/`previous_price`) so the next check starts fresh. Pausing keeps the route visible but excludes it from the scheduled bulk refresh; manual refresh still works on paused routes.

`POST /api/tracked-routes/{id}/refresh` immediately searches through the configured provider, saves the resulting offers and fare history, and updates the tracked route's current and previous lowest prices.

## Price alerts

Alerts are account-only: anonymous callers get 401. `GET /api/alerts`, `POST /api/alerts`, `PATCH /api/alerts/{id}`, and `DELETE /api/alerts/{id}` manage per-route rules. The create body takes the owned `route_id` plus a `target_price`, a `drop_percent` (0–100), or both; saving the same active rule twice is idempotent.

Every refresh (manual or scheduled) evaluates the route's active alerts. An alert fires only on a new low versus its last notified price, so repeated checks at the same fare stay quiet. Firing creates an in-app notification and, when Resend is configured (`RESEND_API_KEY` + `ALERT_FROM_EMAIL`), sends an email with a link back to the route. Without Resend keys the in-app notification is still created and email is skipped with a log line.

## Notifications

`GET /api/notifications` returns the latest 50 notifications with route context plus `unread_count`. `POST /api/notifications/{id}/read` marks one read; `POST /api/notifications/read-all` marks everything read and returns the count.

## Scheduled route refreshes

`POST /api/jobs/refresh-tracked-routes` refreshes up to 500 due routes. It is intended for an hourly cron on Render or Railway and requires `X-FareDelta-Job-Token` to match the backend-only `TRACKED_ROUTE_JOB_TOKEN` environment variable. Each route defines its own `refresh_cadence_hours` (default 24); the job checks only routes whose `next_refresh_at` has passed, runs up to five provider searches concurrently, and backs failing routes off exponentially (visible as `consecutive_failures`).

Never expose this token to the frontend. A daily schedule is appropriate for the mock-backed foundation; provider rate limits should determine the production schedule after a real provider is connected.
