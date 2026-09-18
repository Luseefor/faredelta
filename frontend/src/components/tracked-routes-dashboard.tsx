"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarRange, ListChecks, LoaderCircle, Pause, Plane, Play, RefreshCw, Search, Trash2 } from "lucide-react";

import { RoutePriceStatus } from "@/components/route-price-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listTrackedRoutes, refreshTrackedRoute, removeTrackedRoute, updateTrackedRoute } from "@/lib/api/tracked-routes";
import { computeWatchlistStats, filterRoutes, money, priceDrops, sortRoutes, type RouteSortMode } from "@/lib/route-insights";
import { trackedRouteSearchHref } from "@/lib/tracked-route";
import type { TrackedRoute } from "@/lib/types";

const SORT_OPTIONS: { value: RouteSortMode; label: string }[] = [
  { value: "recent", label: "Recently added" },
  { value: "lowest-price", label: "Lowest price" },
  { value: "biggest-drop", label: "Biggest drop" },
];

export function TrackedRoutesDashboard() {
  const [routes, setRoutes] = useState<TrackedRoute[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<RouteSortMode>("recent");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();
    listTrackedRoutes(controller.signal).then(setRoutes).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, []);

  const stats = useMemo(() => computeWatchlistStats(routes ?? []), [routes]);
  const drops = useMemo(() => priceDrops(routes ?? []).slice(0, 5), [routes]);
  const visible = useMemo(
    () => sortRoutes(filterRoutes(routes ?? [], query), sortMode),
    [routes, query, sortMode],
  );

  function markBusy(id: string, busy: boolean) {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onRefresh(route: TrackedRoute) {
    markBusy(route.id, true);
    try {
      const updated = await refreshTrackedRoute(route.id);
      setRoutes((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch {
      setError(true);
    } finally {
      markBusy(route.id, false);
    }
  }

  async function onRemove(route: TrackedRoute) {
    markBusy(route.id, true);
    try {
      await removeTrackedRoute(route.id);
      setRoutes((current) => current?.filter((item) => item.id !== route.id) ?? []);
      setSelected((current) => {
        const next = new Set(current);
        next.delete(route.id);
        return next;
      });
    } catch {
      setError(true);
    } finally {
      markBusy(route.id, false);
    }
  }

  async function onTogglePause(route: TrackedRoute) {
    markBusy(route.id, true);
    try {
      const updated = await updateTrackedRoute(route.id, { paused: !route.paused });
      setRoutes((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch {
      setError(true);
    } finally {
      markBusy(route.id, false);
    }
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onBulkDelete() {
    if (!confirmingBulk) {
      setConfirmingBulk(true);
      return;
    }
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => removeTrackedRoute(id)));
      const removed = selected;
      setRoutes((current) => current?.filter((item) => !removed.has(item.id)) ?? []);
      setSelected(new Set());
      setConfirmingBulk(false);
    } catch {
      setError(true);
    } finally {
      setBulkBusy(false);
    }
  }

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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tracked routes" value={String(stats.total)} />
        <StatCard label="With latest price" value={String(stats.withPrice)} />
        <StatCard
          label="Price drops"
          value={String(stats.drops)}
          hint={stats.averageDrop !== null ? `Avg ${money(stats.averageDrop, "USD")} off` : undefined}
        />
        <StatCard label="Paused" value={String(stats.paused)} />
      </div>

      {drops.length > 0 ? (
        <Card className="border-emerald-600/20 bg-emerald-50/60">
          <CardContent className="space-y-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><BellRing className="size-4" />Price drops</p>
            <ul className="divide-y divide-emerald-900/10">
              {drops.map(({ route, amount }) => (
                <li key={route.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link href={`/tracked/${route.id}`} className="font-medium hover:underline">
                    {route.origin} → {route.destination}
                  </Link>
                  <span className="font-semibold text-emerald-700">−{money(amount, route.currency ?? "USD")}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by airport code…"
            aria-label="Filter tracked routes by airport code"
            className="pl-9"
          />
        </div>
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as RouteSortMode)}>
          <SelectTrigger className="sm:w-48" aria-label="Sort tracked routes"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={selectMode ? "secondary" : "outline"}
          onClick={() => {
            setSelectMode((value) => !value);
            setSelected(new Set());
            setConfirmingBulk(false);
          }}
        >
          <ListChecks />{selectMode ? "Done" : "Select"}
        </Button>
      </div>

      {selected.size > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/85 px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <Button variant="destructive" size="sm" disabled={bulkBusy} onClick={onBulkDelete}>
            {bulkBusy ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            {confirmingBulk ? `Confirm delete ${selected.size}` : `Delete ${selected.size}`}
          </Button>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState title="No routes match" message={`Nothing tracked matches “${query.trim()}”.`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((route) => {
            const busy = busyIds.has(route.id);
            return (
              <Card key={route.id} className="border-white/5 bg-card/85 transition-colors hover:border-[#1b6566]/30">
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {selectMode ? (
                        <input
                          type="checkbox"
                          checked={selected.has(route.id)}
                          onChange={() => toggleSelected(route.id)}
                          aria-label={`Select ${route.origin} to ${route.destination}`}
                          className="mt-1 size-4 cursor-pointer accent-[#1b6566]"
                        />
                      ) : null}
                      <div>
                        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b47b16]">
                          {route.trip_type === "one_way" ? "One way" : "Round trip"}
                          {route.paused ? <Badge variant="secondary">Paused</Badge> : null}
                        </p>
                        <h2 className="mt-2 flex items-center gap-3 text-2xl font-semibold">
                          {route.origin}<Plane className="size-4 text-primary" />{route.destination}
                        </h2>
                        {route.origin_alternates.length > 0 || route.destination_alternates.length > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            + {[...route.origin_alternates, ...route.destination_alternates].join(", ")} nearby
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Refresh ${route.origin} to ${route.destination}`}
                        title="Check latest fares now"
                        disabled={busy}
                        onClick={() => onRefresh(route)}
                      >
                        {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${route.paused ? "Resume" : "Pause"} ${route.origin} to ${route.destination}`}
                        title={route.paused ? "Resume scheduled checks" : "Pause scheduled checks"}
                        disabled={busy}
                        onClick={() => onTogglePause(route)}
                      >
                        {route.paused ? <Play /> : <Pause />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Stop tracking ${route.origin} to ${route.destination}`}
                        title="Stop tracking this route"
                        disabled={busy}
                        onClick={() => onRemove(route)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <RoutePriceStatus route={route} />
                  <div className="grid gap-3 rounded-xl bg-muted/35 p-4 text-sm sm:grid-cols-2">
                    <div><p className="text-xs text-muted-foreground">Departure window</p><p className="mt-1 font-medium">{route.earliest_departure_date} – {route.latest_departure_date}</p></div>
                    {route.trip_type === "one_way" || !route.earliest_return_date || !route.latest_return_date ? (
                      <div><p className="text-xs text-muted-foreground">Trip</p><p className="mt-1 font-medium">One way</p></div>
                    ) : (
                      <div><p className="text-xs text-muted-foreground">Return window</p><p className="mt-1 font-medium">{route.earliest_return_date} – {route.latest_return_date}</p></div>
                    )}
                    <div><p className="text-xs text-muted-foreground">Travelers · cabin</p><p className="mt-1 font-medium">{route.travelers} · {route.cabin_class.replace("_", " ")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Stops</p><p className="mt-1 font-medium">Up to {route.maximum_stops}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="secondary" className="flex-1"><Link href={`/tracked/${route.id}`}>View details</Link></Button>
                    <Button asChild className="flex-1"><Link href={trackedRouteSearchHref(route)}>Check latest fares</Link></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-white/5 bg-card/85">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-emerald-700">{hint}</p> : null}
      </CardContent>
    </Card>
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
