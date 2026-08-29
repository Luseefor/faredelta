import type { FlightSearchRequest } from "@/lib/types";

export function trackedRouteSearchHref(route: FlightSearchRequest) {
  const params = new URLSearchParams({
    origin: route.origin,
    destination: route.destination,
    earliest_departure_date: route.earliest_departure_date,
    latest_departure_date: route.latest_departure_date,
    earliest_return_date: route.earliest_return_date,
    latest_return_date: route.latest_return_date,
    travelers: String(route.travelers),
    cabin_class: route.cabin_class,
    maximum_stops: String(route.maximum_stops),
  });
  return `/search?${params}`;
}
