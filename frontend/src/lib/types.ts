export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export type TripType = "round_trip" | "one_way";

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  trip_type: TripType;
  origin_alternates: string[];
  destination_alternates: string[];
  earliest_departure_date: string;
  latest_departure_date: string;
  earliest_return_date: string | null;
  latest_return_date: string | null;
  travelers: number;
  cabin_class: CabinClass;
  maximum_stops: number;
}

export interface Airport {
  code: string;
  name: string | null;
}

export interface Airline {
  code: string;
  name: string;
}

export interface FlightSegment {
  airline: Airline;
  flight_number: string;
  origin: Airport;
  destination: Airport;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
}

export interface FlightOffer {
  id: string;
  provider: string;
  airline: Airline;
  origin: Airport;
  destination: Airport;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  stops: number;
  price: number;
  currency: string;
  cabin_class: CabinClass;
  booking_url: string;
  retrieved_at: string;
  segments: FlightSegment[];
  return_date: string | null;
}

export interface FlightSearchResponse {
  search_id: string;
  providers: string[];
  result_count: number;
  retrieved_at: string;
  trip_type: TripType;
  airport_pairs: AirportPair[];
  offers: FlightOffer[];
}

export interface AirportPair {
  origin: string;
  destination: string;
}

export interface FareHistoryPoint {
  retrieved_at: string;
  lowest_price: number;
  currency: string;
  offers_sampled: number;
}

export interface FareHistoryResponse {
  origin: string;
  destination: string;
  departure_date: string | null;
  return_date: string | null;
  currency: string;
  point_count: number;
  current_price: number | null;
  lowest_price: number | null;
  highest_price: number | null;
  points: FareHistoryPoint[];
}

export interface TrackedRoute extends FlightSearchRequest {
  id: string;
  active: boolean;
  paused: boolean;
  created_at: string;
  refresh_cadence_hours: number;
  next_refresh_at: string | null;
  consecutive_failures: number;
  previous_price: number | null;
  last_price: number | null;
  currency: string | null;
  last_checked_at: string | null;
}

export interface TrackedRouteUpdate {
  earliest_departure_date?: string;
  latest_departure_date?: string;
  earliest_return_date?: string;
  latest_return_date?: string;
  travelers?: number;
  cabin_class?: CabinClass;
  maximum_stops?: number;
  paused?: boolean;
  refresh_cadence_hours?: number;
  origin_alternates?: string[];
  destination_alternates?: string[];
}

export interface PriceAlert {
  id: string;
  route_id: string;
  origin: string;
  destination: string;
  target_price: number | null;
  drop_percent: number | null;
  active: boolean;
  last_notified_price: number | null;
  created_at: string;
}

export interface PriceAlertCreate {
  route_id: string;
  target_price?: number;
  drop_percent?: number;
}

export interface PriceAlertUpdate {
  target_price?: number | null;
  drop_percent?: number | null;
  active?: boolean;
}

export interface AlertNotification {
  id: string;
  kind: string;
  route_id: string | null;
  origin: string | null;
  destination: string | null;
  price: number;
  currency: string;
  previous_price: number | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: AlertNotification[];
  unread_count: number;
}

export type SortMode = "best" | "cheapest" | "fastest";

export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  email_verified: boolean;
  created_at: string;
}

export interface ClaimResult {
  claimed: number;
}

export interface CheapDestination {
  origin: string;
  destination: string;
  price: number;
  currency: string;
  airline: string | null;
  flight_number: string | null;
  departure_at: string | null;
  return_at: string | null;
  transfers: number;
}

export interface CheapDestinationsResponse {
  origin: string;
  currency: string;
  result_count: number;
  destinations: CheapDestination[];
}
