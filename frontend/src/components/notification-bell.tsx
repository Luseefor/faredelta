"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Bell, CheckCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/api/notifications";
import { money } from "@/lib/route-insights";
import type { AlertNotification, NotificationList } from "@/lib/types";

function describe(notification: AlertNotification) {
  const route = notification.origin && notification.destination
    ? `${notification.origin} → ${notification.destination}`
    : "A tracked route";
  const price = money(notification.price, notification.currency);
  return notification.kind === "target_hit"
    ? { title: "Target price hit", body: `${route} is now ${price}.` }
    : { title: "Price drop", body: `${route} dropped to ${price}.` };
}

export function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationList | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      setData(await listNotifications(signal));
    } catch {
      // Bell stays quiet when notifications are unavailable.
    }
  }, []);

  useEffect(() => {
    // Signed-out state renders nothing, so stale data never shows.
    if (!isSignedIn) return;
    const controller = new AbortController();
    listNotifications(controller.signal)
      .then(setData)
      .catch(() => undefined);
    const timer = setInterval(() => {
      listNotifications().then(setData).catch(() => undefined);
    }, 60_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [isSignedIn]);

  if (!isSignedIn) return null;
  const unread = data?.unread_count ?? 0;

  async function openRoute(notification: AlertNotification) {
    try {
      if (!notification.read_at) {
        const updated = await markNotificationRead(notification.id);
        setData((current) => current && {
          notifications: current.notifications.map((item) => item.id === updated.id ? updated : item),
          unread_count: Math.max(0, current.unread_count - 1),
        });
      }
    } catch {
      // Navigation still works when marking read fails.
    } finally {
      setOpen(false);
      if (notification.route_id) router.push(`/tracked/${notification.route_id}`);
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      await load();
    } catch {
      // Panel keeps its current state on failure.
    }
  }

  return (
    <span className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className={dark ? "text-white/75 hover:bg-white/10 hover:text-white" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell />
        {unread > 0 ? (
          <span
            key={unread}
            className="animate-badge-pop absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#f2c94c] text-[10px] font-bold text-[#102f35]"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <>
          <button
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <Card className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-100">
            <CardContent className="p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-sm font-semibold">Notifications</p>
                {unread > 0 ? (
                  <Button variant="ghost" size="sm" onClick={markAllRead}>
                    <CheckCheck className="size-4" />Mark all read
                  </Button>
                ) : null}
              </div>
              {!data || data.notifications.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No alerts triggered yet. Set a target price on any tracked route.
                </p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {data.notifications.slice(0, 10).map((notification) => {
                    const { title, body } = describe(notification);
                    return (
                      <li key={notification.id}>
                        <button
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted/50"
                          onClick={() => openRoute(notification)}
                        >
                          <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read_at ? "bg-border" : "bg-[#f2c94c]"}`} />
                          <span>
                            <span className="block text-sm font-medium">{title}</span>
                            <span className="block text-sm text-muted-foreground">{body}</span>
                            <span className="block text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </span>
  );
}
