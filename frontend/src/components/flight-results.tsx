"use client";

import { useEffect, useMemo, useState } from "react";

import { AnimeStagger } from "@/components/anime-stagger";
import { FlightOfferCard } from "@/components/flight-offer-card";
import { FlexibleDateMatrix } from "@/components/flexible-date-matrix";
import { FareHistoryChart } from "@/components/fare-history-chart";
import { ResultState } from "@/components/result-state";
import { ShareButton } from "@/components/share-button";
import { TrackRouteButton } from "@/components/track-route-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchFlights } from "@/lib/api/search";
import { sortFlightOffers } from "@/lib/flight-sorting";
import { farePairKey } from "@/lib/flexible-date-matrix";
import { recordSearch } from "@/lib/recent-searches";
import type {
  CabinClass,
  FlightSearchRequest,
  FlightSearchResponse,
  SortMode,
} from "@/lib/types";

function parseRequest(params: Record<string, string | string[] | undefined>) {
  const value = (key: string) => {
    const raw = params[key];
    return typeof raw === "string" ? raw : "";
  };
  const values = (key: string) => {
    const raw = params[key];
    const list = typeof raw === "string" ? [raw] : (raw ?? []);
    return [...new Set(
      list.map((item) => item.toUpperCase()).filter((item) => /^[A-Z]{3}$/.test(item)),
    )].slice(0, 1);
  };
  const origin = value("origin").toUpperCase();
  const destination = value("destination").toUpperCase();
  const travelers = Number(value("travelers"));
  const maximumStops = Number(value("maximum_stops"));
  const cabinClass = value("cabin_class") as CabinClass;
  const tripType = value("trip_type") === "one_way" ? "one_way" : "round_trip";
  const originAlternates = values("origin_alternates").filter(
    (code) => code !== origin && code !== destination,
  );
  const destinationAlternates = values("destination_alternates").filter(
    (code) => code !== origin && code !== destination && !originAlternates.includes(code),
  );
  const dates = [
    value("earliest_departure_date"),
    value("latest_departure_date"),
    value("earliest_return_date"),
    value("latest_return_date"),
  ];
  const validCabins: CabinClass[] = ["economy", "premium_economy", "business", "first"];
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const returnsValid =
    tripType === "one_way"
      ? dates[2] === "" && dates[3] === ""
      : datePattern.test(dates[2]) && datePattern.test(dates[3]);
  if (
    !/^[A-Z]{3}$/.test(origin) ||
    !/^[A-Z]{3}$/.test(destination) ||
    origin === destination ||
    !datePattern.test(dates[0]) ||
    !datePattern.test(dates[1]) ||
    !returnsValid ||
    !Number.isInteger(travelers) ||
    travelers < 1 ||
    travelers > 9 ||
    !Number.isInteger(maximumStops) ||
    maximumStops < 0 ||
    maximumStops > 2 ||
    !validCabins.includes(cabinClass)
  ) {
    return null;
  }
  return {
    origin,
    destination,
    trip_type: tripType,
    origin_alternates: originAlternates,
    destination_alternates: destinationAlternates,
    earliest_departure_date: dates[0],
    latest_departure_date: dates[1],
    earliest_return_date: tripType === "one_way" ? null : dates[2],
    latest_return_date: tripType === "one_way" ? null : dates[3],
    travelers,
    cabin_class: cabinClass,
    maximum_stops: maximumStops,
  } satisfies FlightSearchRequest;
}

export function FlightResults({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const request = useMemo(() => parseRequest(searchParams), [searchParams]);
  const [data, setData] = useState<FlightSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(request));
  const [retryKey, setRetryKey] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    searchFlights(request, controller.signal)
      .then((response) => {
        setData(response);
        recordSearch({
          href: window.location.pathname + window.location.search,
          origin: request.origin,
          destination: request.destination,
          tripType: request.trip_type,
          label: `${request.origin} → ${request.destination}`,
        });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "The search failed.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [request, retryKey]);

  const offers = useMemo(() => {
    const matchingOffers = selectedPair
      ? (data?.offers ?? []).filter(
          (offer) =>
            offer.return_date !== null &&
            farePairKey(offer.departure_time.slice(0, 10), offer.return_date) === selectedPair,
        )
      : (data?.offers ?? []);
    return sortFlightOffers(matchingOffers, sortMode);
  }, [data?.offers, selectedPair, sortMode]);

  if (!request) {
    return (
      <ResultState
        kind="invalid"
        title="This search link is incomplete"
        message="Return to the homepage and enter your route and flexible travel dates again."
      />
    );
  }
  if (loading) return <ResultsSkeleton />;
  if (error) {
    return (
      <ResultState
        kind="error"
        title="We couldn't load these flights"
        message={error}
        onRetry={() => {
          setLoading(true);
          setError(null);
          setRetryKey((key) => key + 1);
        }}
      />
    );
  }
  if (!data || data.offers.length === 0) {
    const usesTravelpayouts = data?.providers.some((provider) =>
      provider.includes("Travelpayouts"),
    );
    return (
      <ResultState
        kind="empty"
        title={usesTravelpayouts ? "No fares available for these dates" : "No flights found"}
        message={
          usesTravelpayouts
            ? "We couldn't find a matching fare within this date window. Try dates that keep the trip within 30 days, choose another route, or check again later."
            : "Try a wider date window, another airport, or allow an additional stop."
        }
      />
    );
  }

  const oneWay = request.trip_type === "one_way";

  return (
    <div className="space-y-4">
      {data.notice ? (
        <Alert><AlertDescription>{data.notice}</AlertDescription></Alert>
      ) : null}
      {oneWay ? null : (
        <FlexibleDateMatrix
          offers={data.offers}
          selectedPair={selectedPair}
          onSelectPair={setSelectedPair}
        />
      )}
      <FareHistoryChart
        origin={request.origin}
        destination={request.destination}
        selectedPair={selectedPair}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {selectedPair ? `${offers.length} of ${data.result_count}` : data.result_count} offers
            {oneWay ? " · one way" : ""}
          </p>
          <h2 className="text-xl font-semibold">
            {request.origin} to {request.destination}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Source: {data.providers.join(", ")}
          </p>
          {data.airport_pairs.length > 1 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Nearby airports included:{" "}
              {data.airport_pairs
                .filter((pair) => pair.origin !== request.origin || pair.destination !== request.destination)
                .map((pair) => `${pair.origin} → ${pair.destination}`)
                .join(", ")}
              {" "}· matrix shows the lowest fare per date across airports.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TrackRouteButton request={request} />
          <ShareButton />
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)}>
            <SelectTrigger className="w-36" aria-label="Sort flight offers">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="best">Best</SelectItem>
              <SelectItem value="cheapest">Cheapest</SelectItem>
              <SelectItem value="fastest">Fastest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <AnimeStagger sequenceKey={`${sortMode}:${selectedPair ?? "all"}:${offers.length}`}>
        {offers.map((offer) => (
          <div key={offer.id} data-stagger-item>
            <FlightOfferCard offer={offer} />
          </div>
        ))}
      </AnimeStagger>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading flight results" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="mb-5 h-14 w-72 max-w-full" />
          <Skeleton className="h-56 w-full" />
        </CardContent>
      </Card>
      {[0, 1, 2].map((item) => (
        <Card key={item}>
          <CardContent className="grid gap-6 p-6 sm:grid-cols-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
