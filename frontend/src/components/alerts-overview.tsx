"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { BellRing, CheckCheck, Inbox, LoaderCircle, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deletePriceAlert,
  listPriceAlerts,
  updatePriceAlert,
} from "@/lib/api/alerts";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { money } from "@/lib/route-insights";
import type { AlertNotification, NotificationList, PriceAlert } from "@/lib/types";

export function AlertsOverview() {
  const { isSignedIn } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[] | null>(null);
  const [feed, setFeed] = useState<NotificationList | null>(null);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    Promise.all([listPriceAlerts(controller.signal), listNotifications(controller.signal)])
      .then(([loadedAlerts, loadedFeed]) => {
        setAlerts(loadedAlerts);
        setFeed(loadedFeed);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [isSignedIn]);

  if (!isSignedIn) {
    return (
      <Card className="border-dashed bg-card/60">
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><BellRing /></span>
          <h2 className="text-xl font-semibold">Price alerts need an account</h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to get an email and notification when fares drop.</p>
          <Button asChild className="mt-5"><Link href="/login">Sign in</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (failed) {
    return (
      <Alert variant="destructive"><AlertDescription>Alerts are temporarily unavailable. Please refresh and try again.</AlertDescription></Alert>
    );
  }

  if (alerts === null || feed === null) {
    return <div className="space-y-4">{[0, 1].map((item) => <Skeleton key={item} className="h-48 w-full rounded-xl" />)}</div>;
  }

  async function onToggle(alert: PriceAlert) {
    setBusyId(alert.id);
    try {
      const updated = await updatePriceAlert(alert.id, { active: !alert.active });
      setAlerts((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? []);
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(alert: PriceAlert) {
    setBusyId(alert.id);
    try {
      await deletePriceAlert(alert.id);
      setAlerts((current) => current?.filter((item) => item.id !== alert.id) ?? []);
    } catch {
      setFailed(true);
    } finally {
      setBusyId(null);
    }
  }

  async function onOpen(notification: AlertNotification) {
    if (!notification.read_at) {
      try {
        const updated = await markNotificationRead(notification.id);
        setFeed((current) => current && {
          notifications: current.notifications.map((item) => item.id === updated.id ? updated : item),
          unread_count: Math.max(0, current.unread_count - 1),
        });
      } catch {
        // Read state stays stale; navigation below still works.
      }
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllNotificationsRead();
      const reloaded = await listNotifications();
      setFeed(reloaded);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-white/5 bg-card/85">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><BellRing className="size-4" />Your alerts</h2>
          <p className="mt-1 text-sm text-muted-foreground">One notification per new low — repeated checks at the same fare stay quiet.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {alerts.length === 0 ? (
            <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              No alerts yet. Open any tracked route and set a target price or drop percentage.
            </p>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-4">
                <div className="text-sm">
                  <p className="font-medium">
                    <Link href={`/tracked/${alert.route_id}`} className="hover:underline">
                      {alert.origin} → {alert.destination}
                    </Link>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[
                      alert.target_price !== null ? `Below ${money(alert.target_price, "USD")}` : null,
                      alert.drop_percent !== null ? `Drop of ${alert.drop_percent}%+` : null,
                      alert.active ? "Active" : "Paused",
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" disabled={busyId === alert.id} onClick={() => onToggle(alert)}>
                    {alert.active ? "Pause" : "Resume"}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete alert for ${alert.origin} to ${alert.destination}`} disabled={busyId === alert.id} onClick={() => onDelete(alert)}>
                    {busyId === alert.id ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-card/85">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><Inbox className="size-4" />Notification history</h2>
            {feed.unread_count > 0 ? (
              <Button variant="ghost" size="sm" onClick={onMarkAllRead}><CheckCheck className="size-4" />Mark all read</Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {feed.notifications.length === 0 ? (
            <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Nothing triggered yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {feed.notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.route_id ? `/tracked/${notification.route_id}` : "/tracked"}
                    onClick={() => onOpen(notification)}
                    className="flex items-start gap-3 rounded-lg px-2 py-3 hover:bg-muted/50"
                  >
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read_at ? "bg-border" : "bg-[#f2c94c]"}`} />
                    <span>
                      <span className="block text-sm font-medium">
                        {notification.kind === "target_hit" ? "Target price hit" : "Price drop"}
                        {notification.origin && notification.destination ? ` · ${notification.origin} → ${notification.destination}` : ""}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        Now {money(notification.price, notification.currency)}
                        {notification.previous_price !== null ? ` (was ${money(notification.previous_price, notification.currency)})` : ""}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
