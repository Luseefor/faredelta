# Airport data

FareDelta's airport autocomplete uses the worldwide [OurAirports open-data downloads](https://ourairports.com/data/). OurAirports releases the data to the public domain and notes that it is community-maintained without a guarantee of accuracy.

The checked-in catalog contains active airports, heliports, seaplane bases, and balloonports with a valid three-letter IATA code. Duplicate IATA codes are resolved in favor of scheduled service and then the larger facility type. Closed facilities and records without an IATA code are excluded.

The catalog is searched only on the Next.js server, so its full contents are not added to the browser bundle. Refresh it from the current OurAirports CSV files with:

```bash
cd frontend
pnpm airports:update
```

## Automatic synchronization

The `Sync worldwide airport catalog` GitHub Actions workflow runs every day and can also be started manually. It rebuilds the catalog from scratch, so upstream additions, removals, renames, service changes, and IATA-code changes are reflected automatically.

When the generated catalog changes, the workflow runs lint, tests, and a production build before committing only `frontend/src/data/airports.json`. If the source has not changed, it creates no commit. The workflow becomes active after this repository is pushed to GitHub with Actions enabled and requires `contents: write` permission for its scoped `GITHUB_TOKEN`.
