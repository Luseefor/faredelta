"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, LoaderCircle, Pause, Pencil, Plane, Play, RefreshCw, Trash2 } from "lucide-react";

import { FareHistoryChart } from "@/components/fare-history-chart";
import { PriceAlertsSection } from "@/components/price-alerts-section";
import { RoutePriceStatus } from "@/components/route-price-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTrackedRoute,
  refreshTrackedRoute,
  removeTrackedRoute,
  updateTrackedRoute,
} from "@/lib/api/tracked-routes";
import { trackedRouteSearchHref } from "@/lib/tracked-route";
import type { CabinClass, TrackedRoute } from "@/lib/types";

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

const CADENCES = [
  { value: "12", label: "Every 12 hours" },
  { value: "24", label: "Daily" },
  { value: "48", label: "Every 2 days" },
  { value: "168", label: "Weekly" },
];

export function TrackedRouteDetail({ id }: { id: string }) {
  const router = useRouter();
  const [route, setRoute] = useState<TrackedRoute | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "failed">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [togglingPause, setTogglingPause] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCadence, setSavingCadence] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    earliest_departure_date: "",
    latest_departure_date: "",
    earliest_return_date: "",
    latest_return_date: "",
    travelers: "1",
    cabin_class: "economy",
    maximum_stops: "1",
  });

  useEffect(() => {
    const controller = new AbortController();
    getTrackedRoute(id, controller.signal)
      .then((loaded) => {
        setRoute(loaded);
        setForm({
          earliest_departure_date: loaded.earliest_departure_date,
          latest_departure_date: loaded.latest_departure_date,
          earliest_return_date: loaded.earliest_return_date ?? "",
          latest_return_date: loaded.latest_return_date ?? "",
          travelers: String(loaded.travelers),
          cabin_class: loaded.cabin_class,
          maximum_stops: String(loaded.maximum_stops),
        });
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setStatus(reason instanceof Error && /not found/i.test(reason.message) ? "missing" : "failed");
      });
    return () => controller.abort();
  }, [id]);

  if (status === "loading") {
    return <div className="space-y-4"><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }
  if (status === "missing") {
    return (
      <Card className="border-dashed bg-card/60">
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-semibold">Route not found</h2>
          <p className="mt-2 text-sm text-muted-foreground">It may have been removed or belong to another session.</p>
          <Button asChild className="mt-5"><Link href="/tracked">Back to watchlist</Link></Button>
        </CardContent>
      </Card>
    );
  }
  if (status === "failed" || route === null) {
    return (
      <Card className="border-dashed bg-card/60">
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <h2 className="text-xl font-semibold">Route is unavailable</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please refresh and try again.</p>
          <Button asChild className="mt-5"><Link href="/tracked">Back to watchlist</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const oneWay = route.trip_type === "one_way";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      setRoute(await refreshTrackedRoute(route.id));
    } catch {
      setStatus("failed");
    } finally {
      setRefreshing(false);
    }
  };

  const onTogglePause = async () => {
    setTogglingPause(true);
    try {
      setRoute(await updateTrackedRoute(route.id, { paused: !route.paused }));
    } catch {
      setStatus("failed");
    } finally {
      setTogglingPause(false);
    }
  };

  const onDelete = async () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await removeTrackedRoute(route.id);
      router.push("/tracked");
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      setStatus("failed");
    }
  };

  const onSaveCadence = async (hours: number) => {
    setSavingCadence(true);
    try {
      setRoute(await updateTrackedRoute(route.id, { refresh_cadence_hours: hours }));
    } catch {
      setStatus("failed");
    } finally {
      setSavingCadence(false);
    }
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const updated = await updateTrackedRoute(route.id, {
        earliest_departure_date: form.earliest_departure_date,
        latest_departure_date: form.latest_departure_date,
        ...(oneWay
          ? {}
          : {
              earliest_return_date: form.earliest_return_date,
              latest_return_date: form.latest_return_date,
            }),
        travelers: Number(form.travelers),
        cabin_class: form.cabin_class as CabinClass,
        maximum_stops: Number(form.maximum_stops),
      });
      setRoute(updated);
      setEditing(false);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The route could not be updated.");
    } finally {
      setSaving(false);
    }
  }

  const busy = refreshing || togglingPause || deleting || saving || savingCadence;

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-card/85">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b47b16]">
                {oneWay ? "One way" : "Round trip"}
                {route.paused ? <Badge variant="secondary">Paused</Badge> : null}
              </p>
              <h2 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
                {route.origin}<Plane className="size-5 text-primary" />{route.destination}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button variant="ghost" size="sm" disabled={busy} onClick={onRefresh}>
                {refreshing ? <LoaderCircle className="animate-spin" /> : <RefreshCw />}Refresh
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={onTogglePause}>
                {route.paused ? <Play /> : <Pause />}{route.paused ? "Resume" : "Pause"}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setEditing((value) => !value)}>
                <Pencil />{editing ? "Cancel" : "Edit"}
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={onDelete} className={confirmingDelete ? "text-destructive" : undefined}>
                {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}{confirmingDelete ? "Confirm delete" : "Delete"}
              </Button>
            </div>
          </div>

          <RoutePriceStatus route={route} />
          {route.paused ? (
            <Alert><AlertDescription>Scheduled checks skip paused routes. Manual refresh still works.</AlertDescription></Alert>
          ) : null}

          {editing ? (
            <form onSubmit={onSave} className="space-y-4 rounded-xl border border-border/60 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="dep-from">Departure from</Label><Input id="dep-from" type="date" required value={form.earliest_departure_date} onChange={(event) => setForm({ ...form, earliest_departure_date: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="dep-to">Departure to</Label><Input id="dep-to" type="date" required value={form.latest_departure_date} onChange={(event) => setForm({ ...form, latest_departure_date: event.target.value })} /></div>
                {oneWay ? null : (
                  <>
                    <div className="space-y-1.5"><Label htmlFor="ret-from">Return from</Label><Input id="ret-from" type="date" required value={form.earliest_return_date} onChange={(event) => setForm({ ...form, earliest_return_date: event.target.value })} /></div>
                    <div className="space-y-1.5"><Label htmlFor="ret-to">Return to</Label><Input id="ret-to" type="date" required value={form.latest_return_date} onChange={(event) => setForm({ ...form, latest_return_date: event.target.value })} /></div>
                  </>
                )}
                <div className="space-y-1.5"><Label htmlFor="travelers">Travelers</Label><Input id="travelers" type="number" min={1} max={9} required value={form.travelers} onChange={(event) => setForm({ ...form, travelers: event.target.value })} /></div>
                <div className="space-y-1.5"><Label htmlFor="stops">Stops</Label>
                  <Select value={form.maximum_stops} onValueChange={(value) => setForm({ ...form, maximum_stops: value })}>
                    <SelectTrigger id="stops"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="0">Nonstop only</SelectItem><SelectItem value="1">Up to 1 stop</SelectItem><SelectItem value="2">Up to 2 stops</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cabin">Cabin</Label>
                  <Select value={form.cabin_class} onValueChange={(value) => setForm({ ...form, cabin_class: value })}>
                    <SelectTrigger id="cabin"><SelectValue /></SelectTrigger>
                    <SelectContent>{CABINS.map((cabin) => <SelectItem key={cabin} value={cabin}>{cabin.replace("_", " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {formError ? <Alert variant="destructive"><AlertDescription>{formError}</AlertDescription></Alert> : null}
              <p className="text-xs text-muted-foreground">Changing dates, travelers, cabin, or stops resets the price baseline for this route.</p>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
            </form>
          ) : (
            <div className="grid gap-3 rounded-xl bg-muted/35 p-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs text-muted-foreground">Departure window</p><p className="mt-1 font-medium">{route.earliest_departure_date} – {route.latest_departure_date}</p></div>
              {oneWay || !route.earliest_return_date || !route.latest_return_date ? (
                <div><p className="text-xs text-muted-foreground">Trip</p><p className="mt-1 font-medium">One way</p></div>
              ) : (
                <div><p className="text-xs text-muted-foreground">Return window</p><p className="mt-1 font-medium">{route.earliest_return_date} – {route.latest_return_date}</p></div>
              )}
              <div><p className="text-xs text-muted-foreground">Travelers · cabin</p><p className="mt-1 font-medium">{route.travelers} · {route.cabin_class.replace("_", " ")}</p></div>
              <div><p className="text-xs text-muted-foreground">Stops</p><p className="mt-1 font-medium">Up to {route.maximum_stops}</p></div>
              {route.origin_alternates.length > 0 || route.destination_alternates.length > 0 ? (
                <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Nearby airports</p><p className="mt-1 font-medium">Also checking {[...route.origin_alternates, ...route.destination_alternates].join(", ")}</p></div>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <p className="font-medium">Scheduled checks</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {route.paused
                  ? "Paused — scheduled checks skip this route."
                  : route.next_refresh_at
                    ? `Next check ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(route.next_refresh_at))}.`
                    : "Due for the next scheduled check."}
                {route.consecutive_failures > 0 ? ` ${route.consecutive_failures} recent check${route.consecutive_failures === 1 ? "" : "s"} failed — retrying with backoff.` : ""}
              </p>
            </div>
            <Select
              value={String(route.refresh_cadence_hours)}
              onValueChange={(value) => onSaveCadence(Number(value))}
              disabled={busy}
            >
              <SelectTrigger className="sm:w-44" aria-label="Check frequency"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CADENCES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button asChild className="w-full"><Link href={trackedRouteSearchHref(route)}>Check latest fares</Link></Button>
        </CardContent>
      </Card>

      <FareHistoryChart origin={route.origin} destination={route.destination} selectedPair={null} />

      <PriceAlertsSection route={route} />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="size-3.5" /> Tracked since {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(route.created_at))}
      </p>
    </div>
  );
}
