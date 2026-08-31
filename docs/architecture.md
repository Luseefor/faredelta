# Architecture

FareDelta keeps provider payloads, business rules, persistence, HTTP handling, and presentation separate.

```text
Browser → Next.js route handler → FastAPI route → FlightSearchService
                                                ├─ FlightProvider
                                                │  ├─ MockFlightProvider
                                                │  ├─ DuffelFlightProvider
                                                │  ├─ TravelpayoutsFlightProvider
                                                │  └─ FallbackFlightProvider
                                                └─ FlightSearchRepository → PostgreSQL
```

The browser never needs the deployed backend URL. Next.js route handlers proxy same-origin requests using the server-only `FAREDELTA_API_URL` environment variable. FastAPI validates requests, delegates search behavior to a provider interface, and persists normalized results through a repository in one transaction.

The mock provider is deterministic for the same request criteria. `FLIGHT_PROVIDER` selects `auto`, `mock`, `duffel`, or `travelpayouts`; all providers return the same normalized models, so the service, API, persistence, and UI remain provider-independent. Duffel samples up to three dates on each axis. Travelpayouts queries each unique departure/return month combination once and then applies FareDelta's exact date-window and stop filters locally, which improves sparse-cache coverage while limiting upstream requests. Automatic mode prefers the free Travelpayouts cache, then Duffel when configured, and finally mock data when a source fails or has no coverage.

Travelpayouts results are cached fares observed within the previous 48 hours, not live availability. The adapter therefore uses the provider label `Travelpayouts · recently observed`, supports economy searches only, and filters returned dates and stop counts before persistence. Duffel test results remain explicitly non-production inventory.

PostgreSQL contains future-facing `users` and `tracked_routes` tables alongside currently used `flight_searches`, `flight_offers`, and `fare_history` tables. Anonymous Version 1 records have a nullable user relationship.
