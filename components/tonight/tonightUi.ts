/**
 * Shared constants, formatters and copy for the Tonight tab.
 *
 * This tab answers one question: what can I see from here, tonight. It fetches
 * NOTHING new. The Sun, Moon and planets are computed by lib/tonight from
 * lib/solar, lib/lunar and lib/planets; the meteor showers come from the shower
 * catalogue this app already ships; the ISS comes from the committed TLE mirror.
 *
 * All honesty copy lives in lib/tonight so the physics module and the UI cannot
 * drift apart; this file only holds presentation.
 */

import type { PlanetName } from "@/lib/planets";
import type { MoonInterference, PlanetVisibility } from "@/lib/tonight";

/** Deep-twilight blue, matching the worlds registry entry. */
export const TONIGHT_ACCENT = "#7c9cff";

/** Where the observer choice is remembered between visits. */
export const OBSERVER_STORAGE_KEY = "hot-earth:tonight-observer";

/**
 * Preset places, so the tab is useful before anyone grants a location
 * permission. Deliberately spread across latitudes, because latitude is what
 * decides whether there is a night at all: Reykjavik and Tromso show the
 * no-astronomical-darkness and midnight-sun states, and Paranal shows what a
 * genuinely good site looks like.
 */
export const PRESET_PLACES: readonly {
  label: string;
  latDeg: number;
  lonDeg: number;
}[] = [
  { label: "Boston", latDeg: 42.3601, lonDeg: -71.0589 },
  { label: "New York", latDeg: 40.7128, lonDeg: -74.006 },
  { label: "London", latDeg: 51.5074, lonDeg: -0.1278 },
  { label: "Hyderabad", latDeg: 17.385, lonDeg: 78.4867 },
  { label: "Tokyo", latDeg: 35.6762, lonDeg: 139.6503 },
  { label: "Sydney", latDeg: -33.8688, lonDeg: 151.2093 },
  { label: "Nairobi", latDeg: -1.2921, lonDeg: 36.8219 },
  { label: "Reykjavik", latDeg: 64.1466, lonDeg: -21.9426 },
  { label: "Tromso", latDeg: 69.6492, lonDeg: 18.9553 },
  { label: "Paranal Observatory", latDeg: -24.6272, lonDeg: -70.4042 },
];

// ─────────────────────────────── formatters ─────────────────────────────────

/** Clock time in the visitor's own time zone (see TIME_ZONE_CAVEAT). */
export function fmtTime(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "not tonight";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Hours as "6 h 42 m". */
export function fmtHours(h: number | null): string {
  if (typeof h !== "number" || !Number.isFinite(h) || h < 0) return "none";
  const whole = Math.floor(h);
  const minutes = Math.round((h - whole) * 60);
  if (whole === 0) return `${minutes} m`;
  return `${whole} h ${String(minutes).padStart(2, "0")} m`;
}

/** Degrees, no decimals: altitudes and azimuths do not deserve any. */
export function fmtDeg(d: number | null): string {
  if (typeof d !== "number" || !Number.isFinite(d)) return "unknown";
  return `${Math.round(d)}°`;
}

/** Compass point for an azimuth, which is how anyone actually looks. */
export function compass(azDeg: number | null): string {
  if (typeof azDeg !== "number" || !Number.isFinite(azDeg)) return "";
  const points = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return points[Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16];
}

export function fmtIllumination(fraction: number | null): string {
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return "unknown";
  return `${Math.round(fraction * 100)}% lit`;
}

// ─────────────────────────────── labels ────────────────────────────────────

export const MOON_INTERFERENCE_LABEL: Record<MoonInterference, string> = {
  none: "Moon out of the way",
  minor: "Moon barely matters",
  moderate: "Moon washes out faint things",
  severe: "Moon dominates the sky",
};

export const MOON_INTERFERENCE_COLOR: Record<MoonInterference, string> = {
  none: "#7dffc0",
  minor: "#b8e986",
  moderate: "#ffd27a",
  severe: "#ff9f7a",
};

export const VISIBILITY_LABEL: Record<PlanetVisibility, string> = {
  "naked-eye": "naked eye",
  "dark-sky-naked-eye": "naked eye, dark site only",
  optics: "binoculars or telescope",
};

/** Per-planet dot colours, matching the Solar System tab's palette family. */
export const PLANET_COLOR: Record<Exclude<PlanetName, "Earth">, string> = {
  Mercury: "#b9b0a6",
  Venus: "#f5e2b8",
  Mars: "#e06246",
  Jupiter: "#e6c9a0",
  Saturn: "#e8d9a0",
  Uranus: "#9fe0e6",
  Neptune: "#7c9cff",
};

/** Docs base for the footer links (same convention as the other tabs). */
export { DOCS_BASE } from "@/lib/repo";
