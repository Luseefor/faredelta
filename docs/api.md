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

Validation failures return HTTP 422. Provider and persistence failures return stable HTTP 502/503 messages without internal details.

The configured provider is returned in `providers` and on every normalized offer. Amadeus mode queries the sampled flexible-date grid and normalizes carrier dictionaries, outbound timing, round-trip segments, stop count, per-traveler price, and currency. It does not expose Amadeus credentials or claim that placeholder booking links are purchasable inventory.

## `GET /api/flights/history`

Returns up to 30 saved lowest-fare observations for a route. Optional departure and return dates narrow the history to one date pair.

```text
/api/flights/history?origin=ORD&destination=LAX&departure_date=2026-10-10&return_date=2026-10-18
```

The response includes the current, lowest, and highest saved prices plus timestamped chart points. Version 1 history comes from mock-provider searches and is clearly labeled as early data in the interface.

## Tracked routes

`GET /api/tracked-routes`, `POST /api/tracked-routes`, and `DELETE /api/tracked-routes/{id}` provide anonymous watchlist management. The same-origin Next.js layer assigns an HTTP-only anonymous browser identifier and forwards it in `X-FareDelta-Anonymous-ID`; clients cannot list or delete another identifier's routes.

The create body uses the same normalized criteria as a flight search. Saving the same active criteria twice is idempotent.

`POST /api/tracked-routes/{id}/refresh` immediately searches through the configured provider, saves the resulting offers and fare history, and updates the tracked route's current and previous lowest prices.

## Scheduled route refreshes

`POST /api/jobs/refresh-tracked-routes` refreshes up to 500 active routes. It is intended for a Render or Railway scheduled job and requires `X-FareDelta-Job-Token` to match the backend-only `TRACKED_ROUTE_JOB_TOKEN` environment variable.

Never expose this token to the frontend. A daily schedule is appropriate for the mock-backed foundation; provider rate limits should determine the production schedule after a real provider is connected.
