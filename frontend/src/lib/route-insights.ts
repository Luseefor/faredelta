import type { TrackedRoute } from "@/lib/types";

export interface WatchlistStats {
  total: number;
  withPrice: number;
  drops: number;
  paused: number;
  averageDrop: number | null;
}

export interface PriceDrop {
  route: TrackedRoute;
  amount: number;
}

export type RouteSortMode = "recent" | "lowest-price" | "biggest-drop";

export function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function priceDrops(routes: TrackedRoute[]): PriceDrop[] {
  return routes
    .filter((route) => route.previous_price !== null && route.last_price !== null)
    .map((route) => ({ route, amount: (route.previous_price as number) - (route.last_price as number) }))
    .filter((drop) => drop.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function computeWatchlistStats(routes: TrackedRoute[]): WatchlistStats {
  const drops = priceDrops(routes);
  return {
    total: routes.length,
    withPrice: routes.filter((route) => route.last_price !== null).length,
    drops: drops.length,
    paused: routes.filter((route) => route.paused).length,
    averageDrop: drops.length > 0
      ? drops.reduce((sum, drop) => sum + drop.amount, 0) / drops.length
      : null,
  };
}

export function filterRoutes(routes: TrackedRoute[], query: string): TrackedRoute[] {
  const normalized = query.trim().toUpperCase();
  if (!normalized) return routes;
  return routes.filter(
    (route) =>
      route.origin.includes(normalized) || route.destination.includes(normalized),
  );
}

export function sortRoutes(routes: TrackedRoute[], mode: RouteSortMode): TrackedRoute[] {
  const copy = [...routes];
  switch (mode) {
    case "lowest-price":
      return copy.sort((a, b) => (a.last_price ?? Number.MAX_SAFE_INTEGER) - (b.last_price ?? Number.MAX_SAFE_INTEGER));
    case "biggest-drop": {
      const rank = new Map(priceDrops(copy).map((drop, index) => [drop.route.id, index]));
      return copy.sort((a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    }
    case "recent":
    default:
      return copy.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  }
}
