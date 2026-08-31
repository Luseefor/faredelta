"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFareHistory } from "@/lib/api/history";
import { buildFareTrend, collapseFareHistory } from "@/lib/fare-history";
import type { FareHistoryResponse } from "@/lib/types";

const CHART_WIDTH = 700;
const CHART_HEIGHT = 180;

function money(value: number | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function observedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FareHistoryChart({
  origin,
  destination,
  selectedPair,
}: {
  origin: string;
  destination: string;
  selectedPair: string | null;
}) {
  const [result, setResult] = useState<{
    key: string;
    history: FareHistoryResponse | null;
    unavailable: boolean;
  } | null>(null);
  const [departureDate, returnDate] = selectedPair?.split("|") ?? [];
  const requestKey = `${origin}|${destination}|${departureDate ?? ""}|${returnDate ?? ""}`;

  useEffect(() => {
    const controller = new AbortController();
    getFareHistory(origin, destination, controller.signal, departureDate, returnDate)
      .then((history) => setResult({ key: requestKey, history, unavailable: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setResult({ key: requestKey, history: null, unavailable: true });
      });
    return () => controller.abort();
  }, [departureDate, destination, origin, requestKey, returnDate]);

  const loading = result?.key !== requestKey;
  const unavailable = result?.key === requestKey && result.unavailable;
  const history = result?.key === requestKey ? result.history : null;
  const trend = useMemo(
    () => buildFareTrend(collapseFareHistory(history?.points ?? []), CHART_WIDTH, CHART_HEIGHT),
    [history],
  );
  const markerPoints = trend.length <= 12 ? trend : trend.slice(-1);
  const line = trend.map((point) => `${point.x},${point.y}`).join(" ");
  const area = trend.length > 1 ? `0,${CHART_HEIGHT} ${line} ${CHART_WIDTH},${CHART_HEIGHT}` : "";

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader className="gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Saved fare history</h2>
            <Badge variant="outline">Early data</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedPair
              ? `Lowest saved prices for ${departureDate} to ${returnDate}.`
              : `Lowest saved prices across searches from ${origin} to ${destination}.`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Database className="size-3.5" /> PostgreSQL snapshots
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4">
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : unavailable ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            Fare history is unavailable right now. Flight results are unaffected.
          </div>
        ) : !history || history.points.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-xl border border-dashed text-center">
            <Database className="mb-2 size-5 text-primary" />
            <p className="font-medium">No saved observations for these dates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">This search will establish the first baseline.</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <HistoryStat label="Latest" value={money(history.current_price, history.currency)} />
              <HistoryStat label="Lowest" value={money(history.lowest_price, history.currency)} accent />
              <HistoryStat label="Observations" value={String(history.point_count)} />
            </div>
            <div className="relative overflow-hidden rounded-xl border border-border/70 bg-muted/15 px-3 pb-3 pt-4 sm:px-4 sm:pt-5">
              <div className="pointer-events-none absolute inset-x-4 top-1/2 border-t border-dashed border-border/70" />
              <svg
                viewBox={`-8 -8 ${CHART_WIDTH + 16} ${CHART_HEIGHT + 16}`}
                role="img"
                aria-label={`Fare history from ${money(history.lowest_price, history.currency)} to ${money(history.highest_price, history.currency)}`}
                className="relative h-36 w-full overflow-visible sm:h-44"
                preserveAspectRatio="none"
              >
                {area ? <polygon points={area} className="fill-primary/10" /> : null}
                {trend.length > 1 ? (
                  <polyline
                    points={line}
                    fill="none"
                    className="stroke-primary"
                    strokeWidth="4"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
                {markerPoints.map((point) => (
                  <circle
                    key={point.retrieved_at}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    className="fill-card stroke-primary"
                    strokeWidth="4"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{observedAt(history.points[0].retrieved_at)}</span>
                <span>{observedAt(history.points.at(-1)!.retrieved_at)}</span>
              </div>
            </div>
            {history.point_count === 1 ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingDown className="size-3.5" /> One observation saved. The trend becomes more useful after future searches.
              </p>
            ) : null}
            <table className="sr-only">
              <caption>Saved fare history data</caption>
              <thead><tr><th>Observed</th><th>Lowest price</th></tr></thead>
              <tbody>
                {history.points.map((point) => (
                  <tr key={point.retrieved_at}><td>{observedAt(point.retrieved_at)}</td><td>{money(point.lowest_price, point.currency)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/45 p-2.5 sm:p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={accent ? "mt-1 truncate font-semibold text-primary" : "mt-1 truncate font-semibold"}>{value}</p>
    </div>
  );
}
