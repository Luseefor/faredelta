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

## `GET /api/flights/history`

Returns up to 30 saved lowest-fare observations for a route. Optional departure and return dates narrow the history to one date pair.

```text
/api/flights/history?origin=ORD&destination=LAX&departure_date=2026-10-10&return_date=2026-10-18
```

The response includes the current, lowest, and highest saved prices plus timestamped chart points. Version 1 history comes from mock-provider searches and is clearly labeled as early data in the interface.
