"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BellRing, LoaderCircle, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  createPriceAlert,
  deletePriceAlert,
  listPriceAlerts,
  updatePriceAlert,
} from "@/lib/api/alerts";
import { money } from "@/lib/route-insights";
import type { PriceAlert, TrackedRoute } from "@/lib/types";

const DROP_OPTIONS = ["5", "10", "15", "20", "25"];

export function PriceAlertsSection({ route }: { route: TrackedRoute }) {
  const { isSignedIn } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(isSignedIn ? null : []);
  const [target, setTarget] = useState("");
  const [drop, setDrop] = useState("10");
  const [useTarget, setUseTarget] = useState(true);
  const [useDrop, setUseDrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    listPriceAlerts(controller.signal)
      .then((all) => setAlerts(all.filter((alert) => alert.route_id === route.id)))
      .catch(() => setAlerts([]));
    return () => controller.abort();
  }, [isSignedIn, route.id]);

  if (!isSignedIn) {
    return (
      <Card className="border-white/5 bg-card/80">
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="size-4" />Price alerts</h2>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to get an email and notification when this route hits your target.</p>
          </div>
          <Button asChild><Link href="/login">Sign in</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (alerts === null) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const target_price = useTarget && target ? Number(target) : undefined;
    const drop_percent = useDrop ? Number(drop) : undefined;
    if ((target_price === undefined || Number.isNaN(target_price)) && drop_percent === undefined) {
      setError("Set a target price, a drop percentage, or both.");
      return;
    }
    setSaving(true);
    try {
      const created = await createPriceAlert({ route_id: route.id, target_price, drop_percent });
      setAlerts((current) => (current?.some((alert) => alert.id === created.id) ? current : [...(current ?? []), created]));
      setTarget("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The alert could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(alert: PriceAlert) {
    setBusyId(alert.id);
    try {
      const updated = await updatePriceAlert(alert.id, { active: !alert.active });
      setAlerts((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The alert could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(alert: PriceAlert) {
    setBusyId(alert.id);
    try {
      await deletePriceAlert(alert.id);
      setAlerts((current) => current?.filter((item) => item.id !== alert.id) ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The alert could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  const currency = route.currency ?? "USD";

  return (
    <Card className="border-white/5 bg-card/80">
      <CardHeader>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="size-4" />Price alerts</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get an email and notification when the fare hits your target or drops enough. Alerts fire once per new low.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4">
            <div className="text-sm">
              <p className="font-medium">
                {alert.target_price !== null ? `Below ${money(alert.target_price, currency)}` : ""}
                {alert.target_price !== null && alert.drop_percent !== null ? " or " : ""}
                {alert.drop_percent !== null ? `Drop of ${alert.drop_percent}%+` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {alert.active ? "Active" : "Paused"}
                {alert.last_notified_price !== null ? ` · last notified at ${money(alert.last_notified_price, currency)}` : " · not triggered yet"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={busyId === alert.id} onClick={() => onToggle(alert)}>
                {alert.active ? "Pause" : "Resume"}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete alert" disabled={busyId === alert.id} onClick={() => onDelete(alert)}>
                {busyId === alert.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              </Button>
            </div>
          </div>
        ))}

        <form onSubmit={onCreate} className="space-y-3 rounded-xl bg-muted/35 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="flex items-center gap-2">
                <input
                  id="alert-target-toggle"
                  type="checkbox"
                  checked={useTarget}
                  onChange={(event) => setUseTarget(event.target.checked)}
                  className="size-4 cursor-pointer accent-[#1b6566]"
                />
                <Label htmlFor="alert-target">Target price ({currency})</Label>
              </span>
              <Input
                id="alert-target"
                type="number"
                min={1}
                step="any"
                placeholder="e.g. 299"
                disabled={!useTarget}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <span className="flex items-center gap-2">
                <input
                  id="alert-drop-toggle"
                  type="checkbox"
                  checked={useDrop}
                  onChange={(event) => setUseDrop(event.target.checked)}
                  className="size-4 cursor-pointer accent-[#1b6566]"
                />
                <Label htmlFor="alert-drop">Drop percentage</Label>
              </span>
              <Select value={drop} onValueChange={setDrop} disabled={!useDrop}>
                <SelectTrigger id="alert-drop"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DROP_OPTIONS.map((option) => <SelectItem key={option} value={option}>{option}% or more</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Create alert"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
