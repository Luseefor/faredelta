import type { AlertNotification, NotificationList } from "@/lib/types";

async function responseOrError<T>(response: Response): Promise<T> {
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.detail ?? "Notifications are temporarily unavailable.");
  return payload as T;
}

export async function listNotifications(signal?: AbortSignal) {
  return responseOrError<NotificationList>(await fetch("/api/notifications", { signal }));
}

export async function markNotificationRead(id: string) {
  return responseOrError<AlertNotification>(
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }),
  );
}

export async function markAllNotificationsRead() {
  return responseOrError<{ read: number }>(
    await fetch("/api/notifications/read-all", { method: "POST" }),
  );
}
