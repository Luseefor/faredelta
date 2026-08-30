export type CabinClass = "economy" | "premium_economy" | "business" | "first";

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  earliest_departure_date: string;
  latest_departure_date: string;
  earliest_return_date: string;
  latest_return_date: string;
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
  return_date: string;
}

export interface FlightSearchResponse {
  search_id: string;
  providers: string[];
  result_count: number;
  retrieved_at: string;
  offers: FlightOffer[];
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
  created_at: string;
  previous_price: number | null;
  last_price: number | null;
  currency: string | null;
  last_checked_at: string | null;
}

export type SortMode = "best" | "cheapest" | "fastest";
