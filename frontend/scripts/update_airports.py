"""Refresh the compact worldwide airport catalog from OurAirports."""

import csv
import io
import json
import urllib.request
from pathlib import Path

BASE_URL = "https://davidmegginson.github.io/ourairports-data"
OUTPUT = Path(__file__).parents[1] / "src/data/airports.json"
TYPE_RANK = {
    "large_airport": 5,
    "medium_airport": 4,
    "small_airport": 3,
    "seaplane_base": 2,
    "heliport": 1,
    "balloonport": 0,
}


def download_csv(filename: str) -> list[dict[str, str]]:
    with urllib.request.urlopen(f"{BASE_URL}/{filename}") as response:
        text = response.read().decode("utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def main() -> None:
    countries = {row["code"]: row["name"] for row in download_csv("countries.csv")}
    regions = {row["code"]: row["name"] for row in download_csv("regions.csv")}
    chosen: dict[str, tuple[tuple[bool, int], dict[str, object]]] = {}

    for row in download_csv("airports.csv"):
        code = row["iata_code"].strip().upper()
        if len(code) != 3 or not code.isalpha() or row["type"] == "closed_airport":
            continue
        airport: dict[str, object] = {
            "code": code,
            "city": row["municipality"].strip() or row["name"].strip(),
            "name": row["name"].strip(),
            "region": regions.get(row["iso_region"], row["iso_region"]).strip(),
            "country": countries.get(row["iso_country"], row["iso_country"]).strip(),
            "type": row["type"],
            "scheduled": row["scheduled_service"] == "yes",
        }
        score = (bool(airport["scheduled"]), TYPE_RANK.get(row["type"], -1))
        if code not in chosen or score > chosen[code][0]:
            chosen[code] = (score, airport)

    airports = [entry[1] for entry in chosen.values()]
    airports.sort(
        key=lambda airport: (
            not airport["scheduled"],
            -TYPE_RANK.get(str(airport["type"]), -1),
            airport["country"],
            airport["city"],
            airport["code"],
        )
    )
    OUTPUT.write_text(
        json.dumps(airports, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(f"Updated {OUTPUT} with {len(airports):,} active IATA airports.")


if __name__ == "__main__":
    main()
