import type { CabinClass } from "./types";

export interface UserSettings {
  homeAirport: string;
  defaultCabin: CabinClass;
  defaultStops: number;
}

const STORAGE_KEY = "faredelta:settings";

export const DEFAULT_SETTINGS: UserSettings = {
  homeAirport: "",
  defaultCabin: "economy",
  defaultStops: 1,
};

const DEFAULTS = DEFAULT_SETTINGS;

const CABINS: CabinClass[] = ["economy", "premium_economy", "business", "first"];

export function loadSettings(): UserSettings {
  try {
    // ReferenceError on the server falls through to defaults.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      homeAirport: /^[A-Za-z]{3}$/.test(parsed.homeAirport ?? "")
        ? (parsed.homeAirport as string).toUpperCase()
        : "",
      defaultCabin: CABINS.includes(parsed.defaultCabin as CabinClass)
        ? (parsed.defaultCabin as CabinClass)
        : DEFAULTS.defaultCabin,
      defaultStops:
        Number.isInteger(parsed.defaultStops) && (parsed.defaultStops as number) >= 0 && (parsed.defaultStops as number) <= 2
          ? (parsed.defaultStops as number)
          : DEFAULTS.defaultStops,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing and quota errors keep default behavior.
  }
}
