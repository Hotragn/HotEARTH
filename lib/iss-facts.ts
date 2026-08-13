/**
 * lib/iss-facts.ts — data plumbing + small pure helpers for the ISS Tracker tab.
 *
 * The physics (SGP4 propagation, ground track, passes, sunlit test) all lives in
 * lib/iss.ts. This module is the UI-facing layer around it: it parses the
 * committed TLE mirror (public/data/iss/tle.json), parses the two optional live
 * cross-checks (CelesTrak GP TLE + wheretheiss.at sub-point), holds the observer
 * presets for the passes feature, and provides the tiny display helpers (compass
 * points, great-circle distance, footprint radius). Kept free of React and three
 * so it is trivially readable and could be unit-tested in isolation.
 *
 * Honesty: everything measured (the TLE, the wheretheiss fix) is labelled as
 * such; everything computed (position, ground track, passes, sunlit) comes from
 * lib/iss. The TLE age is the load-bearing caveat and is surfaced in the UI.
 */

/** Committed TLE mirror, refreshed twice daily by a GitHub Action. */
export const ISS_TLE_PATH = "/data/iss/tle.json";

/** ISS NORAD catalog number (ZARYA). */
export const ISS_CATALOG_NUMBER = 25544;

/**
 * Mean Earth radius (km). Used ONLY to turn a real altitude in km into a height
 * in globe units (globe radius = 1) for the 3D marker, and for the footprint
 * geometry — a visualization scale, not the WGS72 ellipsoid the SGP4 geodetic
 * height in lib/iss is reduced onto (6378.135 km equatorial). Close enough for
 * placing a marker; the honest altitude number itself always comes from lib/iss.
 */
/**
 * Mean Earth radius [km], owned by lib/geo. Re-exported here because this
 * module's public API has always carried it.
 */
export { EARTH_MEAN_RADIUS_KM } from "./geo";
import { EARTH_MEAN_RADIUS_KM } from "./geo";

/**
 * CelesTrak GP endpoint for the ISS in raw TLE format. CORS `*` (verified in the
 * committed mirror's meta). Optional live refresh; on any failure we keep the
 * committed baseline. CelesTrak's usage policy: fetch at most once per ~2 h.
 */
export const CELESTRAK_ISS_TLE_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

/**
 * wheretheiss.at live sub-point (keyless, CORS `*`, ~1 req/s). A measured-ish
 * cross-check we can compare against our own SGP4 sub-point to visualize TLE age.
 * Defensive: never required.
 */
export const WHERETHEISS_URL =
  "https://api.wheretheiss.at/v1/satellites/25544";

const RAD2DEG = 180 / Math.PI;
const DEG2RAD = Math.PI / 180;

// ────────────────────────────── committed TLE ──────────────────────────────

export interface TleSet {
  name: string;
  line1: string;
  line2: string;
}

export interface OtherSat {
  name: string;
  catalogNumber: number | null;
  epoch: string | null;
  line1: string;
  line2: string;
}

export interface IssTleData {
  source: string;
  sourceUrl: string | null;
  catalogNumber: number;
  name: string;
  fetchedAt: string | null;
  epoch: string | null;
  attribution: string;
  note: string | null;
  tle: TleSet;
  others: OtherSat[];
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Pull a {name,line1,line2} out of an object with a nested `tle`, defensively. */
function readTleSet(raw: unknown, fallbackName: string): TleSet | null {
  if (!raw || typeof raw !== "object") return null;
  const t = (raw as { tle?: unknown }).tle;
  const src = t && typeof t === "object" ? (t as Record<string, unknown>) : (raw as Record<string, unknown>);
  const line1 = str(src.line1);
  const line2 = str(src.line2);
  if (!line1 || !line2) return null;
  return { name: str(src.name) ?? fallbackName, line1, line2 };
}

/**
 * Parse public/data/iss/tle.json into a typed shape, or `null` if the file is
 * missing/garbage or has no usable primary TLE. Never throws. The tab degrades
 * to a graceful "no orbital data" state on null.
 */
export function parseIssTleData(raw: unknown): IssTleData | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const meta =
    root.meta && typeof root.meta === "object"
      ? (root.meta as Record<string, unknown>)
      : {};

  const tle = readTleSet(root, str(meta.name) ?? "ISS (ZARYA)");
  if (!tle) return null;

  const others: OtherSat[] = [];
  if (Array.isArray(root.others)) {
    for (const o of root.others) {
      if (!o || typeof o !== "object") continue;
      const rec = o as Record<string, unknown>;
      const set = readTleSet(rec, str(rec.name) ?? "satellite");
      if (!set) continue;
      others.push({
        name: set.name,
        catalogNumber: num(rec.catalog_number),
        epoch: str(rec.epoch),
        line1: set.line1,
        line2: set.line2,
      });
    }
  }

  return {
    source: str(meta.source) ?? "CelesTrak",
    sourceUrl: str(meta.source_url),
    catalogNumber: num(meta.catalog_number) ?? ISS_CATALOG_NUMBER,
    name: tle.name,
    fetchedAt: str(meta.fetched_at),
    epoch: str(meta.epoch),
    attribution:
      str(meta.attribution) ??
      "Orbital data: US Space Force (18 SDS) via CelesTrak (celestrak.org)",
    note: str(meta.note),
    tle,
    others,
  };
}

// ────────────────────────────── live TLE (CelesTrak) ───────────────────────

/**
 * Parse a raw CelesTrak `FORMAT=TLE` response (an optional name line plus the two
 * element lines) into a TleSet. Returns `null` if the two element lines are not
 * both present. Pure + defensive — validity as an orbit is checked by the caller
 * via lib/iss `parseTle`.
 */
export function parseCelestrakTle(text: unknown): TleSet | null {
  if (typeof text !== "string") return null;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.length > 0);
  const line1 = lines.find((l) => l.startsWith("1 "));
  const line2 = lines.find((l) => l.startsWith("2 "));
  if (!line1 || !line2) return null;
  const nameLine = lines.find((l) => !l.startsWith("1 ") && !l.startsWith("2 "));
  return { name: nameLine ? nameLine.trim() : "ISS (ZARYA)", line1, line2 };
}

// ────────────────────────────── live sub-point (wheretheiss.at) ────────────

export interface WhereTheIssFix {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  /** ISS speed relative to the ground, km/s (their `velocity` is km/h). */
  velocityKmS: number;
  /** UNIX seconds of the reported fix. */
  timestampMs: number;
}

/**
 * Parse a wheretheiss.at `/v1/satellites/25544` response. Their payload gives
 * `latitude`, `longitude` (deg), `altitude` (km), `velocity` (km/h) and
 * `timestamp` (UNIX seconds). Returns `null` on any missing field. Never throws.
 */
export function parseWhereTheIss(raw: unknown): WhereTheIssFix | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const lat = num(r.latitude);
  const lon = num(r.longitude);
  const alt = num(r.altitude);
  const vel = num(r.velocity);
  const ts = num(r.timestamp);
  if (lat === null || lon === null || alt === null) return null;
  return {
    latitude: lat,
    longitude: lon,
    altitudeKm: alt,
    velocityKmS: vel !== null ? vel / 3600 : NaN,
    timestampMs: ts !== null ? ts * 1000 : Date.now(),
  };
}

// ────────────────────────────── display helpers ────────────────────────────

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** 16-point compass label for an azimuth in degrees (0 = N, 90 = E). */
export function compass16(azimuthDeg: number): string {
  if (!Number.isFinite(azimuthDeg)) return "—";
  const idx = Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_16[idx];
}

/**
 * Great-circle distance [km]. Re-exported from lib/geo, which owns it. This
 * module used to carry its own copy with a slightly different Earth radius and
 * no null-safety; see the note in lib/geo.
 */
export { greatCircleKm } from "./geo";


/**
 * Angular radius (degrees, from Earth's centre) of the ISS "footprint" — the
 * circle on the ground from which the station is on or above the horizon, for a
 * given altitude: acos(R / (R + h)). At ~420 km this is ~20°, a ground radius of
 * ~2,260 km. A real, honest geometric fact — not a coverage guarantee.
 *
 * This is the SAME geometry lib/aurora uses for how far away an aurora stays
 * above the horizon: "what can see this thing at height h" and "what can this
 * thing at height h see" are one question. The two are asserted to agree in
 * lib/consistency.test.ts.
 */
export function footprintAngularRadiusDeg(altitudeKm: number): number {
  if (!Number.isFinite(altitudeKm) || altitudeKm <= 0) return 0;
  return Math.acos(EARTH_MEAN_RADIUS_KM / (EARTH_MEAN_RADIUS_KM + altitudeKm)) * RAD2DEG;
}

/** Ground radius (km) of the footprint circle, for the HUD label. */
export function footprintGroundRadiusKm(altitudeKm: number): number {
  return footprintAngularRadiusDeg(altitudeKm) * DEG2RAD * EARTH_MEAN_RADIUS_KM;
}

// ────────────────────────────── observer presets ───────────────────────────

export interface Observer {
  label: string;
  lat: number;
  lon: number;
  /** observer height above the ellipsoid, metres (0 is fine for passes). */
  altitudeM: number;
}

/** A spread of observing sites across latitude + longitude (matches Night Sky). */
export const PRESET_CITIES: readonly Observer[] = [
  { label: "Boston, USA", lat: 42.3601, lon: -71.0589, altitudeM: 43 },
  { label: "New York, USA", lat: 40.7128, lon: -74.006, altitudeM: 10 },
  { label: "London, UK", lat: 51.5074, lon: -0.1278, altitudeM: 11 },
  { label: "Reykjavík, Iceland", lat: 64.1466, lon: -21.9426, altitudeM: 61 },
  { label: "Nairobi, Kenya", lat: -1.2921, lon: 36.8219, altitudeM: 1795 },
  { label: "Tokyo, Japan", lat: 35.6762, lon: 139.6503, altitudeM: 40 },
  { label: "Sydney, Australia", lat: -33.8688, lon: 151.2093, altitudeM: 58 },
  { label: "Santiago, Chile", lat: -33.4489, lon: -70.6693, altitudeM: 570 },
] as const;

export const DEFAULT_OBSERVER: Observer = PRESET_CITIES[0];
