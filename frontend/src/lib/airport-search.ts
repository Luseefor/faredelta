import airportData from "../data/airports.json";
import type { AirportOption } from "./airports";

const AIRPORTS = airportData as AirportOption[];
const POPULAR_CODES = ["ATL", "LAX", "ORD", "DFW", "JFK", "LHR", "CDG", "DXB", "HND", "SIN", "AMS", "FRA"];
const POPULAR_ORDER = new Map(POPULAR_CODES.map((code, index) => [code, index]));
const TYPE_RANK: Record<AirportOption["type"], number> = { large_airport: 50, medium_airport: 40, small_airport: 30, seaplane_base: 20, heliport: 10, balloonport: 0 };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function scoreAirport(airport: AirportOption, query: string) {
  const code = airport.code.toLowerCase();
  const city = normalize(airport.city);
  const name = normalize(airport.name);
  const region = normalize(airport.region);
  const country = normalize(airport.country);
  const searchable = `${code} ${city} ${name} ${region} ${country}`;
  const tokens = query.split(/\s+/).filter(Boolean);
  if (!tokens.every((token) => searchable.includes(token))) return -1;

  let score = airport.scheduled ? 100 : 0;
  score += TYPE_RANK[airport.type] ?? 0;
  if (code === query) return score + 10_000;
  else if (code.startsWith(query)) score += 850;
  if (city === query) score += 800;
  else if (city.startsWith(query)) score += 650;
  if (name === query) score += 600;
  else if (name.startsWith(query)) score += 450;
  else if (name.includes(query)) score += 250;
  return score;
}

export function searchAirports(rawQuery: string, limit = 20) {
  const query = normalize(rawQuery);
  if (!query) {
    return AIRPORTS.filter((airport) => POPULAR_ORDER.has(airport.code))
      .sort((a, b) => (POPULAR_ORDER.get(a.code) ?? 99) - (POPULAR_ORDER.get(b.code) ?? 99))
      .slice(0, limit);
  }
  return AIRPORTS.map((airport) => ({ airport, score: scoreAirport(airport, query) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.airport.city.localeCompare(b.airport.city) || a.airport.code.localeCompare(b.airport.code))
    .slice(0, limit)
    .map((entry) => entry.airport);
}

export function airportCount() {
  return AIRPORTS.length;
}
