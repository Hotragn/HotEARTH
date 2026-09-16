/**
 * Shared UI constants and small pure helpers for the Saturn's Moons tab.
 * Kept in one place so the scene, HUD, ring panel and events panel agree on the
 * moon colors, designations, phenomenon labels, compass wording and the
 * seasonality facts (no per-file drift). Mirrors jupiter-moons/galileanUi.ts.
 *
 * Nothing here is physics: the geometry all comes from lib/saturn-moons.ts. The
 * moon RADII below are real measured values (NASA/JPL) used ONLY to size the true
 * angular markers and to scale the enlarged ones; they are not invented, and the
 * enlarge choice is labeled where it is used (honesty rule).
 */

import type { PhenomenonType, SaturnMoon } from "@/lib/saturn-moons";

/**
 * Per-moon marker color. The four already in the Moons tab (Mimas, Enceladus,
 * Titan, Iapetus) match lib/moon-facts MOON_ACCENT exactly; Tethys, Dione and
 * Rhea are given pale icy tones in the same family. Presentation only.
 */
export const MOON_COLORS: Record<SaturnMoon, string> = {
  Mimas: "#c3c9d2", // pale grey
  Enceladus: "#eef3f7", // fresh-ice white
  Tethys: "#dfe4ea", // icy pale
  Dione: "#cdd3da", // icy grey
  Rhea: "#c7ccd4", // cratered grey
  Titan: "#e69a3c", // orange haze
  Iapetus: "#c2a26a", // two-tone amber
};

/**
 * IAU Roman-numeral designation (Saturn N). Real, standard designations: Mimas I,
 * Enceladus II, Tethys III, Dione IV, Rhea V, Titan VI, Iapetus VIII (Hyperion,
 * omitted here, is VII). Used as a small prefix next to each moon name.
 */
export const MOON_DESIGNATION: Record<SaturnMoon, string> = {
  Mimas: "I",
  Enceladus: "II",
  Tethys: "III",
  Dione: "IV",
  Rhea: "V",
  Titan: "VI",
  Iapetus: "VIII",
};

/**
 * Real mean radii [km] (NASA/JPL planetary-satellite physical parameters). Used
 * only to size the moon markers: the TRUE-size toggle draws radiusKm / Saturn Req
 * (which is tiny, and that is the honest point), and the enlarged markers preserve
 * this real size ordering scaled relative to Titan (the largest).
 */
export const MOON_RADIUS_KM: Record<SaturnMoon, number> = {
  Mimas: 198.2,
  Enceladus: 252.1,
  Tethys: 531.1,
  Dione: 561.4,
  Rhea: 763.8,
  Titan: 2574.7,
  Iapetus: 734.5,
};

export interface PhenomenonMeta {
  /** full label for the events panel */
  label: string;
  /** one-line plain-English description of the geometry */
  blurb: string;
  /** shadow transits get warm emphasis like Jupiter's tab */
  emphasize: boolean;
  /** accent for the row */
  accent: string;
}

/**
 * Presentation metadata per phenomenon type. Same four types as Jupiter's tab,
 * but the copy states plainly that for Saturn these cluster around each ring-plane
 * crossing (see the seasonality note). Blurbs come from docs/SATURN_MOONS_PHYSICS.md.
 */
export const PHENOMENON_META: Record<PhenomenonType, PhenomenonMeta> = {
  transit: {
    label: "Transit",
    blurb: "Moon crossing in front of Saturn's disk (Earth-line event).",
    emphasize: false,
    accent: "#cbd3e0",
  },
  shadow_transit: {
    label: "Shadow transit",
    blurb: "Moon's shadow on the cloud tops, a small dark dot (Sun-line event).",
    emphasize: true,
    accent: "#d8c48f",
  },
  occultation: {
    label: "Occultation",
    blurb: "Moon hidden behind Saturn's disk (Earth-line event).",
    emphasize: false,
    accent: "#8b93a4",
  },
  eclipse: {
    label: "Eclipse",
    blurb: "Moon inside Saturn's shadow, darkened even when not behind the disk (Sun-line event).",
    emphasize: false,
    accent: "#7f93c8",
  },
};

/** Order phenomenon types are listed in summaries. */
export const PHENOMENON_ORDER: readonly PhenomenonType[] = [
  "transit",
  "shadow_transit",
  "occultation",
  "eclipse",
];

// ─────────────────────────── seasonality (the headline) ─────────────────────
// Saturn's moon disk-transits and shadow-transits happen only in the season
// around each ~15-year ring-plane crossing (equinox). These dates are documented
// facts, stated plainly by lib/saturn-moons's honesty block and the docs.

/** The most recent Saturn ring-plane crossing (equinox). Documented fact. */
export const LAST_EQUINOX = "2025-05-06";
/** The next ring-plane crossing is ~2038-2039 (rings opening again until then). */
export const NEXT_EQUINOX_APPROX = "2038-2039";

/**
 * Which ring face is tilted toward Earth, from the sign of B (the saturnicentric
 * latitude of the Earth): B > 0 = north face, B < 0 = south face, ~0 = edge-on.
 */
export function ringFace(bDeg: number): "north" | "south" | "edge-on" {
  if (Math.abs(bDeg) < 0.05) return "edge-on";
  return bDeg > 0 ? "north" : "south";
}

// ─────────────────────────────── formatting ────────────────────────────────

/**
 * 16-point compass abbreviation for an azimuth measured from North, clockwise
 * (the convention lib/celestial.equatorialToHorizontal returns). Pure and total.
 */
export function compass16(azimuthDeg: number): string {
  const names = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const i = Math.round(((azimuthDeg % 360) + 360) % 360 / 22.5) % 16;
  return names[i];
}

/** Short local clock time (HH:MM) for the viewer's own timezone. */
export function hhmm(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Local day header, e.g. "Sat, Jul 19 2026". */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─────────────────────────────── observer ──────────────────────────────────

/** An observing site: a label plus geographic latitude / longitude (deg). */
export interface Observer {
  label: string;
  /** latitude, degrees north positive */
  lat: number;
  /** longitude, degrees east positive (matches lib/geo / lib/celestial) */
  lon: number;
}

/**
 * Labeled fallback location used until the viewer opts into geolocation. Chosen
 * as a neutral, well-known meridian reference (Greenwich, London), and clearly
 * labeled so it is never mistaken for the viewer's real position. Same posture
 * as the Jupiter tab.
 */
export const DEFAULT_OBSERVER: Observer = {
  label: "Greenwich (default)",
  lat: 51.4779,
  lon: -0.0015,
};
