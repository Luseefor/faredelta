"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarRange, LoaderCircle, Plane, RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listTrackedRoutes, refreshTrackedRoute, removeTrackedRoute } from "@/lib/api/tracked-routes";
import { trackedRouteSearchHref } from "@/lib/tracked-route";
import { getPriceMovement } from "@/lib/price-movement";
import type { TrackedRoute } from "@/lib/types";

export function TrackedRoutesDashboard() {
  const [routes, setRoutes] = useState<TrackedRoute[] | null>(null);
  const [error, setError] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTrackedRoutes(controller.signal).then(setRoutes).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, []);

  if (error) {
    return <EmptyState title="Tracking is unavailable" message="Please refresh and try again." />;
  }
  if (routes === null) {
    return <div className="space-y-4">{[0, 1].map((item) => <Skeleton key={item} className="h-48 w-full rounded-xl" />)}</div>;
  }
  if (routes.length === 0) {
    return <EmptyState title="No tracked routes yet" message="Run a flight search, then select “Track this route.”" action />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {routes.map((route) => (
        <Card key={route.id} className="border-white/5 bg-card/85">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b47b16]">Round trip</p>
                <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold">
                  {route.origin}<Plane className="size-4 text-primary" />{route.destination}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Refresh ${route.origin} to ${route.destination}`}
                  disabled={refreshing === route.id}
                  onClick={() => {
                    setRefreshing(route.id);
                    refreshTrackedRoute(route.id)
                      .then((updated) => setRoutes((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []))
                      .catch(() => setError(true))
                      .finally(() => setRefreshing(null));
                  }}
                >
                  {refreshing === route.id ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Stop tracking ${route.origin} to ${route.destination}`}
                  disabled={removing === route.id}
                  onClick={() => {
                    setRemoving(route.id);
                    removeTrackedRoute(route.id)
                      .then(() => setRoutes((current) => current?.filter((item) => item.id !== route.id) ?? []))
                      .catch(() => setError(true))
                      .finally(() => setRemoving(null));
                  }}
                >
                  {removing === route.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                </Button>
              </div>
            </div>
            <PriceStatus route={route} />
            <div className="grid gap-3 rounded-xl bg-muted/35 p-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Departure window</p><p className="mt-1 font-medium">{route.earliest_departure_date} – {route.latest_departure_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Return window</p><p className="mt-1 font-medium">{route.earliest_return_date} – {route.latest_return_date}</p></div>
              <div><p className="text-xs text-muted-foreground">Travelers · cabin</p><p className="mt-1 font-medium">{route.travelers} · {route.cabin_class.replace("_", " ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Stops</p><p className="mt-1 font-medium">Up to {route.maximum_stops}</p></div>
            </div>
            <Button asChild className="w-full"><Link href={trackedRouteSearchHref(route)}>Check latest mock fares</Link></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PriceStatus({ route }: { route: TrackedRoute }) {
  const currency = route.currency ?? "USD";
  const money = (value: number) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

  if (route.last_price === null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        <RefreshCw className="size-4 text-primary" /> Waiting for the first scheduled or manual check.
      </div>
    );
  }

  const movement = getPriceMovement(route.previous_price, route.last_price);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-primary/5 p-4">
      <div>
        <p className="text-xs text-muted-foreground">Latest lowest fare</p>
        <p className="mt-1 text-2xl font-semibold">{money(route.last_price)}</p>
      </div>
      {movement.kind === "drop" ? (
        <Badge className="gap-1.5 bg-emerald-600 text-white"><BellRing className="size-3" />Price dropped {money(movement.amount)}</Badge>
      ) : movement.kind === "unchanged" ? (
        <Badge variant="secondary">No price change</Badge>
      ) : movement.kind === "increase" ? (
        <Badge variant="outline">Up {money(movement.amount)}</Badge>
      ) : (
        <Badge variant="outline">Baseline saved</Badge>
      )}
      <p className="w-full text-xs text-muted-foreground">
        {route.last_checked_at ? `Checked ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(route.last_checked_at))}` : "Not checked yet"}
      </p>
    </div>
  );
}

function EmptyState({ title, message, action = false }: { title: string; message: string; action?: boolean }) {
  return (
    <Card className="border-dashed bg-card/60">
      <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><CalendarRange /></span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {action ? <Button asChild className="mt-5"><Link href="/">Search flights</Link></Button> : null}
      </CardContent>
    </Card>
  );
}
