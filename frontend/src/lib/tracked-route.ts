import type { FlightSearchRequest } from "@/lib/types";

export function trackedRouteSearchHref(route: FlightSearchRequest) {
  const params = new URLSearchParams({
    origin: route.origin,
    destination: route.destination,
    trip_type: route.trip_type,
    earliest_departure_date: route.earliest_departure_date,
    latest_departure_date: route.latest_departure_date,
    travelers: String(route.travelers),
    cabin_class: route.cabin_class,
    maximum_stops: String(route.maximum_stops),
  });
  if (route.earliest_return_date) params.set("earliest_return_date", route.earliest_return_date);
  if (route.latest_return_date) params.set("latest_return_date", route.latest_return_date);
  for (const code of route.origin_alternates) params.append("origin_alternates", code);
  for (const code of route.destination_alternates) params.append("destination_alternates", code);
  return `/search?${params}`;
}
