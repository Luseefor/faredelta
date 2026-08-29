export interface AirportOption {
  code: string;
  city: string;
  name: string;
  region: string;
  country: string;
  type: "large_airport" | "medium_airport" | "small_airport" | "seaplane_base" | "heliport" | "balloonport";
  scheduled: boolean;
}

export function airportTypeLabel(type: AirportOption["type"]) {
  return {
    large_airport: "Major airport",
    medium_airport: "Regional airport",
    small_airport: "Local airport",
    seaplane_base: "Seaplane base",
    heliport: "Heliport",
    balloonport: "Balloonport",
  }[type];
}
