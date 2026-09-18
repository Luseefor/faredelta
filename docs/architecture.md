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

The local-development provider is deterministic for the same request criteria. `FLIGHT_PROVIDER` selects `auto`, `mock`, `duffel`, or `travelpayouts`; all providers return the same normalized models, so the service, API, persistence, and UI remain provider-independent. Duffel samples up to three dates on each axis. Travelpayouts queries eligible departure/return month combinations independently and retains successful partial coverage before applying FareDelta's exact date-window and stop filters. Automatic mode uses configured providers in priority order. Sample fallback is controlled separately and remains disabled in production.

Travelpayouts results are cached fares observed within the previous 48 hours, not live availability. The adapter therefore uses the provider label `Travelpayouts · recently observed`, supports economy searches only, and filters returned dates and stop counts before persistence. Duffel test results remain explicitly non-production inventory.

PostgreSQL `users` rows are keyed to Clerk identities (`clerk_user_id`) and provisioned on first verified request; the backend never sees passwords. Tracked routes carry either a `user_id` (signed-in owner) or an `anonymous_id` (browser cookie); signing in claims the anonymous routes into the account with duplicate folding.
