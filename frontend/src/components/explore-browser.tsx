"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Compass, LoaderCircle, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { getCheapDestinations } from "@/lib/api/explore";
import { allAirports } from "@/lib/airport-search";
import { money } from "@/lib/route-insights";
import { loadSettings } from "@/lib/settings";
import type { CheapDestinationsResponse } from "@/lib/types";

function cityName(code: string, lookup: Map<string, string>) {
  return lookup.get(code) ?? code;
}

export function ExploreBrowser() {
  const [initial] = useState(loadSettings);
  const [origin, setOrigin] = useState(initial.homeAirport);
  const [departDate, setDepartDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [result, setResult] = useState<CheapDestinationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const cities = useMemo(() => {
    const map = new Map<string, string>();
    for (const airport of allAirports()) {
      if (!map.has(airport.code)) map.set(airport.code, airport.city);
    }
    return map;
  }, []);

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const code = origin.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) {
      setError("Enter a three-letter origin airport code.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      const controller = new AbortController();
      const response = await getCheapDestinations(
        code,
        controller.signal,
        departDate || undefined,
        returnDate || undefined,
      );
      setResult(response);
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Cheap fares could not be loaded.");
    } finally {
      setPending(false);
    }
  }

  function searchHref(destination: string, departure: string | null, returning: string | null) {
    const params = new URLSearchParams({
      origin: result?.origin ?? origin.toUpperCase(),
      destination,
      trip_type: returning ? "round_trip" : "one_way",
      earliest_departure_date: (departure ?? "").slice(0, 10),
      latest_departure_date: (departure ?? "").slice(0, 10),
      travelers: "1",
      cabin_class: "economy",
      maximum_stops: "2",
    });
    if (returning) {
      params.set("earliest_return_date", returning.slice(0, 10));
      params.set("latest_return_date", returning.slice(0, 10));
    }
    return `/search?${params}`;
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/5 bg-card/85">
        <CardContent className="p-6">
          <form onSubmit={onSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="explore-origin">Flying from</Label>
              <Input
                id="explore-origin"
                value={origin}
                onChange={(event) => setOrigin(event.target.value.toUpperCase())}
                placeholder="ORD"
                maxLength={3}
                className="w-32 font-mono uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="explore-depart">Departure (optional)</Label>
              <Input id="explore-depart" type="date" value={departDate} onChange={(event) => setDepartDate(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="explore-return">Return (optional)</Label>
              <Input id="explore-return" type="date" value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Search />}Explore fares
            </Button>
          </form>
          {error ? <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
        </CardContent>
      </Card>

      {pending && !result ? <Skeleton className="h-64 w-full rounded-xl" /> : null}

      {result ? (
        result.destinations.length === 0 ? (
          <Card className="border-dashed bg-card/60">
            <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
              <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Compass /></span>
              <h2 className="text-xl font-semibold">No cheap fares found</h2>
              <p className="mt-2 text-sm text-muted-foreground">Try different dates or another origin airport.</p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground">
              {result.result_count} cheapest observed {result.result_count === 1 ? "destination" : "destinations"} from {result.origin} · recently observed fares, not live inventory.
            </p>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.destinations.map((destination) => (
                <li key={destination.destination}>
                  <Card className="h-full border-white/5 bg-card/85">
                    <CardContent className="flex h-full flex-col p-5">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b47b16]">{destination.destination}</p>
                      <h3 className="mt-1 text-xl font-semibold">{cityName(destination.destination, cities)}</h3>
                      <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{money(destination.price, destination.currency)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[destination.airline, destination.transfers === 0 ? "Nonstop" : `${destination.transfers} stop${destination.transfers > 1 ? "s" : ""}`]
                          .filter(Boolean)
                          .join(" · ")}
                        {destination.departure_at ? ` · ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(destination.departure_at))}` : ""}
                        {destination.return_at ? ` → ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(destination.return_at))}` : ""}
                      </p>
                      {destination.departure_at ? (
                        <Button asChild className="mt-4 w-full" variant="secondary">
                          <Link href={searchHref(destination.destination, destination.departure_at, destination.return_at)}>
                            Search these dates
                          </Link>
                        </Button>
                      ) : (
                        <Button className="mt-4 w-full" variant="secondary" disabled>
                          Dates unavailable
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )
      ) : null}
    </div>
  );
}
