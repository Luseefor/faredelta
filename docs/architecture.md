# Architecture

FareDelta keeps provider payloads, business rules, persistence, HTTP handling, and presentation separate.

```text
Browser → Next.js route handler → FastAPI route → FlightSearchService
                                                ├─ FlightProvider
                                                │  ├─ MockFlightProvider
                                                │  └─ DuffelFlightProvider
                                                └─ FlightSearchRepository → PostgreSQL
```

The browser never needs the deployed backend URL. Next.js route handlers proxy same-origin requests using the server-only `FAREDELTA_API_URL` environment variable. FastAPI validates requests, delegates search behavior to a provider interface, and persists normalized results through a repository in one transaction.

The mock provider is deterministic for the same request criteria. `FLIGHT_PROVIDER` selects `mock` or `duffel`; both return the same normalized models, so the service, API, persistence, and UI remain provider-independent. The Duffel adapter samples up to three dates on each axis and creates an offer request for each valid round-trip date pair.

PostgreSQL contains future-facing `users` and `tracked_routes` tables alongside currently used `flight_searches`, `flight_offers`, and `fare_history` tables. Anonymous Version 1 records have a nullable user relationship.
