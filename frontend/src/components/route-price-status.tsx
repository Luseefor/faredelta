"use client";

import { BellRing, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getPriceMovement } from "@/lib/price-movement";
import { money } from "@/lib/route-insights";
import type { TrackedRoute } from "@/lib/types";

export function RoutePriceStatus({ route }: { route: TrackedRoute }) {
  const currency = route.currency ?? "USD";

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
        <p className="mt-1 text-2xl font-semibold">{money(route.last_price, currency)}</p>
      </div>
      {movement.kind === "drop" ? (
        <Badge className="gap-1.5 bg-emerald-600 text-white"><BellRing className="size-3" />Price dropped {money(movement.amount, currency)}</Badge>
      ) : movement.kind === "unchanged" ? (
        <Badge variant="secondary">No price change</Badge>
      ) : movement.kind === "increase" ? (
        <Badge variant="outline">Up {money(movement.amount, currency)}</Badge>
      ) : (
        <Badge variant="outline">Baseline saved</Badge>
      )}
      <p className="w-full text-xs text-muted-foreground">
        {route.last_checked_at ? `Checked ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(route.last_checked_at))}` : "Not checked yet"}
      </p>
    </div>
  );
}
