/**
 * Shared constants and formatters for the Tides tab.
 *
 * All honesty copy lives in lib/tides so the physics module and the UI quote the
 * same strings; this file is presentation only.
 */

import type { TidePhase } from "@/lib/tides";

/** Deep ocean blue, matching the worlds registry entry. */
export const TIDES_ACCENT = "#4fc3f7";
/** The measured gauge trace. */
export const GAUGE_COLOR = "#4fc3f7";
/** The computed equilibrium theory trace. */
export const THEORY_COLOR = "#ffb86b";

/**
 * NOAA CO-OPS. Public domain, no key, CORS open.
 *
 * `water_level` is the MEASURED level at the gauge, which is the point: this tab
 * compares theory against a measurement, not against another model. NOAA also
 * publishes `predictions` from its own harmonic fit, and those are the numbers
 * to actually navigate by, which the honesty panel says.
 */
export const COOPS_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
export const COOPS_CREDIT =
  "NOAA Center for Operational Oceanographic Products and Services (CO-OPS). US Government work in the public domain.";
export const COOPS_PAGE = "https://tidesandcurrents.noaa.gov/";

export function coopsUrl(stationId: string, days: number): string {
  const params = new URLSearchParams({
    product: "water_level",
    application: "hot-earth",
    station: stationId,
    date: "latest",
    datum: "MLLW",
    units: "metric",
    time_zone: "gmt",
    format: "json",
  });
  // `range` is in hours and is what actually controls the window.
  params.set("date", "recent");
  params.set("range", String(Math.round(days * 24)));
  return `${COOPS_BASE}?${params.toString()}`;
}

/**
 * Stations chosen for one reason: they disagree with each other enormously.
 *
 * Equilibrium theory predicts about half a metre of range everywhere on Earth.
 * These five span roughly 0.3 m to 6 m, which is the fastest way to see that a
 * global theory cannot be describing a local coast.
 */
export const STATIONS: readonly {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
  note: string;
}[] = [
  {
    id: "8410140",
    name: "Eastport, Maine",
    latDeg: 44.9033,
    lonDeg: -66.985,
    note: "At the mouth of the Bay of Fundy, the most amplified tide on Earth.",
  },
  {
    id: "8443970",
    name: "Boston, Massachusetts",
    latDeg: 42.3539,
    lonDeg: -71.0503,
    note: "A big, clean semi-diurnal tide on a resonant shelf.",
  },
  {
    id: "9414290",
    name: "San Francisco, California",
    latDeg: 37.8063,
    lonDeg: -122.4659,
    note: "A mixed tide: two highs a day, but of noticeably unequal size.",
  },
  {
    id: "8771450",
    name: "Galveston, Texas",
    latDeg: 29.3103,
    lonDeg: -94.7933,
    note: "The Gulf of Mexico runs largely DIURNAL: often one high a day, not two.",
  },
  {
    id: "1612340",
    name: "Honolulu, Hawaii",
    latDeg: 21.3067,
    lonDeg: -157.867,
    note: "Mid-ocean, far from any resonant shelf, so the range stays small.",
  },
];

/** Docs base for footer links (same convention as the other tabs). */
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export const PHASE_LABEL: Record<TidePhase, string> = {
  spring: "spring tides",
  neap: "neap tides",
  between: "between springs and neaps",
};

export const PHASE_NOTE: Record<TidePhase, string> = {
  spring:
    "The Sun and Moon are pulling along the same line, so the two bulges add. Springs happen at both new and full Moon.",
  neap:
    "The Sun and Moon are at right angles, so the solar bulge sits over the lunar trough and partly fills it in.",
  between: "The solar and lunar bulges are partly aligned, on the way to one extreme or the other.",
};

// ─────────────────────────────── formatters ─────────────────────────────────

export function fmtMetres(m: number | null): string {
  if (typeof m !== "number" || !Number.isFinite(m)) return "unknown";
  return `${m.toFixed(2)} m`;
}

export function fmtFactor(f: number | null): string {
  if (typeof f !== "number" || !Number.isFinite(f)) return "unknown";
  if (f >= 10) return `${Math.round(f)}x`;
  return `${f.toFixed(1)}x`;
}

export function fmtClock(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDayClock(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtPercent(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${Math.round(v * 100)}%`;
}
