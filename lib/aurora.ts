/**
 * lib/aurora.ts — where the aurora is, and whether you can see it from where
 * you are standing.
 *
 * Data (NOAA SWPC, US Government work in the public domain, no key, CORS open):
 *   - the estimated planetary K index, once a minute
 *   - the 3-day Kp forecast
 *   - OVATION Prime: NOAA's aurora model, a 360 x 181 grid of the probability
 *     of visible aurora overhead, about an hour ahead
 *   - solar wind speed and interplanetary field from DSCOVR at L1
 *
 * WHAT THIS MODULE COMPUTES, none of which is in any of those feeds:
 *
 *  1. GEOMAGNETIC LATITUDE. This is the load-bearing idea of the whole tab.
 *     Aurora does not care about your geographic latitude, it cares about your
 *     position relative to the geomagnetic pole, which currently sits in the
 *     Canadian Arctic rather than at the top of the globe. That single fact is
 *     why Edinburgh and Moscow sit at the same geographic latitude and have
 *     completely different aurora luck: Edinburgh is over six degrees higher in
 *     geomagnetic latitude. Every "can I see it" answer here is computed in
 *     geomagnetic coordinates, and the tab shows both numbers so the difference
 *     is visible.
 *
 *  2. The equatorward edge of the auroral oval for a given Kp, from NOAA's
 *     published table.
 *
 *  3. How far away an aurora can be seen, from real geometry: an emission at
 *     height h is above the horizon out to a ground range of R*acos(R/(R+h)).
 *     This is why a big storm produces red glows reported from absurdly low
 *     latitudes while the oval itself never came near them: the red emission is
 *     two to four times higher up, so it clears the horizon from much further
 *     away.
 *
 *  4. The NOAA G scale from Kp, and a verdict that combines all of the above.
 *
 * Null-safety contract, as everywhere else: bad input returns null or an empty
 * array, and nothing throws.
 */

import { parseUtcTimestamp } from "./utils";

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function norm180(deg: number): number {
  let d = ((deg + 180) % 360 + 360) % 360 - 180;
  if (d === -180) d = 180;
  return d;
}

// ───────────────────────── geomagnetic coordinates ──────────────────────────

/**
 * The geomagnetic north pole, IGRF-13 epoch 2020.
 *
 * Note this is the GEOMAGNETIC pole (the axis of the best-fit dipole), not the
 * magnetic dip pole that a compass needle points to. They are different places
 * and the dip pole moves much faster. The geomagnetic pole drifts roughly
 * 0.02 degrees a year, so an epoch-2020 value is good to a few hundredths of a
 * degree for the years this app covers.
 */
export const GEOMAGNETIC_POLE_LAT_DEG = 80.65;
export const GEOMAGNETIC_POLE_LON_DEG = -72.68;

/**
 * Geomagnetic latitude of a place, in the centred dipole approximation:
 * 90 degrees minus the angular distance to the geomagnetic pole.
 *
 *   sin(phi_m) = sin(phi) sin(phi_p) + cos(phi) cos(phi_p) cos(lambda - lambda_p)
 *
 * LIMIT, stated because it matters at the margins: this is a centred DIPOLE.
 * The real field is not a perfect dipole, and the corrected geomagnetic (CGM)
 * coordinates used operationally differ from this by up to about 3 degrees in
 * places, most noticeably around the North Atlantic. For deciding whether the
 * oval is overhead or on your horizon, that is a difference of a few tens of
 * kilometres; for a published aurora forecast it would not be good enough, and
 * this app does not publish one.
 */
export function geomagneticLatitude(
  latDeg: number,
  lonDeg: number
): number | null {
  if (!finite(latDeg) || !finite(lonDeg)) return null;
  if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 180) return null;

  const phi = latDeg * DEG2RAD;
  const phiP = GEOMAGNETIC_POLE_LAT_DEG * DEG2RAD;
  const dLon = (lonDeg - GEOMAGNETIC_POLE_LON_DEG) * DEG2RAD;
  const sinPhiM =
    Math.sin(phi) * Math.sin(phiP) +
    Math.cos(phi) * Math.cos(phiP) * Math.cos(dLon);
  return Math.asin(clamp(sinPhiM, -1, 1)) * RAD2DEG;
}

/** Geomagnetic longitude, measured from the meridian through the pole. */
export function geomagneticLongitude(
  latDeg: number,
  lonDeg: number
): number | null {
  if (!finite(latDeg) || !finite(lonDeg)) return null;
  if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 180) return null;

  const phi = latDeg * DEG2RAD;
  const phiP = GEOMAGNETIC_POLE_LAT_DEG * DEG2RAD;
  const dLon = (lonDeg - GEOMAGNETIC_POLE_LON_DEG) * DEG2RAD;
  const y = Math.cos(phi) * Math.sin(dLon);
  const x =
    Math.cos(phiP) * Math.sin(phi) - Math.sin(phiP) * Math.cos(phi) * Math.cos(dLon);
  return norm180(Math.atan2(y, x) * RAD2DEG);
}

// ────────────────────────── the oval, and seeing it ─────────────────────────

/**
 * The equatorward edge of the auroral oval in GEOMAGNETIC latitude, by Kp, from
 * the table NOAA SWPC publishes with its aurora products. Aurora is overhead at
 * or poleward of this line; south of it you are looking north at something that
 * is somewhere else.
 */
export const OVAL_BOUNDARY_BY_KP: readonly number[] = [
  66.5, 64.5, 62.4, 60.4, 58.3, 56.3, 54.2, 52.2, 50.1, 48.1,
];

/**
 * Equatorward oval boundary for any Kp, interpolating between the published
 * whole-number entries. Kp is reported in thirds (5.33, 5.67), so interpolation
 * is what the data actually asks for.
 */
export function ovalBoundaryLatitude(kp: number): number | null {
  if (!finite(kp)) return null;
  const k = clamp(kp, 0, 9);
  const lo = Math.floor(k);
  const hi = Math.min(9, lo + 1);
  const t = k - lo;
  return OVAL_BOUNDARY_BY_KP[lo] * (1 - t) + OVAL_BOUNDARY_BY_KP[hi] * t;
}

/**
 * Mean Earth radius [km]. Re-exported from lib/geo so there is one value in
 * the codebase; the horizon geometry below is a surface calculation, so the
 * mean radius is the right one.
 */
export { EARTH_MEAN_RADIUS_KM as EARTH_RADIUS_KM } from "./geo";
import { EARTH_MEAN_RADIUS_KM as EARTH_RADIUS_KM_LOCAL } from "./geo";

/**
 * Published emission altitudes. Green comes from atomic oxygen at around 100 to
 * 150 km; the red glow above it is the same atom in a much longer-lived state,
 * which only survives where the air is thin enough that nothing knocks it out
 * first, so it sits at 200 to 400 km.
 */
export const EMISSION_ALTITUDE_KM = {
  green: 110,
  red: 300,
} as const;

/**
 * How far away, along the ground, something at height `heightKm` is still above
 * the horizon:
 *
 *   d = R * acos( R / (R + h) )
 *
 * Pure geometry for a spherical Earth, ignoring refraction and terrain (both of
 * which help you slightly, so this is the conservative answer). At 110 km the
 * range is about 1,175 km; at 300 km it is about 1,960 km. That difference is
 * the whole explanation for why a severe storm gets red aurora reported from
 * latitudes the oval never reached.
 */
export function horizonRangeKm(heightKm: number): number | null {
  if (!finite(heightKm) || heightKm <= 0) return null;
  const r = EARTH_RADIUS_KM_LOCAL;
  return r * Math.acos(clamp(r / (r + heightKm), -1, 1));
}

/** The same range expressed in degrees of latitude, which is how a map reads. */
export function horizonRangeDeg(heightKm: number): number | null {
  const km = horizonRangeKm(heightKm);
  if (km === null) return null;
  return (km / (EARTH_RADIUS_KM_LOCAL * Math.PI)) * 180;
}

// ──────────────────────────── the NOAA G scale ──────────────────────────────

export type GScale = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";

export interface GScaleInfo {
  scale: GScale;
  label: string;
  note: string;
}

const G_SCALE_TABLE: Record<GScale, { label: string; note: string }> = {
  G0: {
    label: "quiet to unsettled",
    note: "Below storm level. Aurora stays close to the poles and is a high-latitude affair.",
  },
  G1: {
    label: "minor storm",
    note: "The oval pushes down far enough that the northern tier of the US, Scotland and southern Scandinavia have a chance.",
  },
  G2: {
    label: "moderate storm",
    note: "Visible as low as New York and the north of England when the sky is dark and clear.",
  },
  G3: {
    label: "strong storm",
    note: "Aurora reported from the middle of the US and much of central Europe.",
  },
  G4: {
    label: "severe storm",
    note: "A rare event that puts aurora over the southern US and southern Europe. Power grids and HF radio start to notice.",
  },
  G5: {
    label: "extreme storm",
    note: "A handful per solar cycle. Aurora into the tropics, and real risk to grids, pipelines and satellites.",
  },
};

/**
 * NOAA G scale from Kp, on the published mapping: G1 starts at Kp 5 and each
 * step up is one Kp. Below Kp 5 there is no storm, which the scale calls G0
 * rather than pretending a quiet day is a small storm.
 */
export function gScale(kp: number): GScaleInfo | null {
  if (!finite(kp)) return null;
  const k = clamp(kp, 0, 9);
  const scale: GScale =
    k < 5 ? "G0" : (`G${Math.min(5, Math.floor(k) - 4)}` as GScale);
  return { scale, ...G_SCALE_TABLE[scale] };
}

// ─────────────────────────────── the feeds ──────────────────────────────────

export interface KpSample {
  time: Date;
  kp: number;
  /** true for a measured value, false for a forecast */
  observed: boolean;
}

/**
 * Parse the 1-minute estimated planetary K index feed (an array of objects with
 * `time_tag` and `estimated_kp`).
 */
export function parseKpMinute(raw: unknown): KpSample[] {
  if (!Array.isArray(raw)) return [];
  const out: KpSample[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const kp = finite(r.estimated_kp)
      ? r.estimated_kp
      : finite(r.kp_index)
        ? r.kp_index
        : null;
    if (kp === null) continue;
    // SWPC time tags are UTC without a zone marker. Parsed strictly: appending
    // "Z" and trusting `new Date` turns a malformed tag into 2000-01-01 rather
    // than an Invalid Date.
    const t = parseUtcTimestamp(r.time_tag);
    if (t === null) continue;
    out.push({ time: t, kp, observed: true });
  }
  out.sort((a, b) => a.time.getTime() - b.time.getTime());
  return out;
}

/**
 * Parse the 3-day Kp forecast (objects with `time_tag`, `kp` and an `observed`
 * string that is either "observed" or "predicted").
 */
export function parseKpForecast(raw: unknown): KpSample[] {
  if (!Array.isArray(raw)) return [];
  const out: KpSample[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (!finite(r.kp)) continue;
    const t = parseUtcTimestamp(r.time_tag);
    if (t === null) continue;
    out.push({
      time: t,
      kp: r.kp,
      observed: r.observed === "observed",
    });
  }
  out.sort((a, b) => a.time.getTime() - b.time.getTime());
  return out;
}

export interface SolarWind {
  /** bulk proton speed [km/s] */
  speedKmS: number | null;
  /** total interplanetary field strength [nT] */
  btNt: number | null;
  /** north-south field component in GSM [nT]; NEGATIVE is the one that matters */
  bzNt: number | null;
  time: Date | null;
}

/** Parse the two one-row SWPC summary products into one record. */
export function parseSolarWind(speedRaw: unknown, magRaw: unknown): SolarWind {
  const out: SolarWind = { speedKmS: null, btNt: null, bzNt: null, time: null };
  const first = (v: unknown): Record<string, unknown> | null =>
    Array.isArray(v) && v[0] && typeof v[0] === "object"
      ? (v[0] as Record<string, unknown>)
      : null;

  const s = first(speedRaw);
  if (s && finite(s.proton_speed)) out.speedKmS = s.proton_speed;

  const m = first(magRaw);
  if (m) {
    if (finite(m.bt)) out.btNt = m.bt;
    if (finite(m.bz_gsm)) out.bzNt = m.bz_gsm;
  }

  const tag = (m?.time_tag ?? s?.time_tag) as string | undefined;
  if (typeof tag === "string") {
    const t = new Date(tag);
    if (Number.isFinite(t.getTime())) out.time = t;
  }
  return out;
}

export interface OvationGrid {
  /** probability of visible aurora overhead [0-100] indexed [lon 0..359][lat] */
  probability: Int16Array;
  /** when the model input was observed */
  observationTime: Date | null;
  /** the time the grid is valid for (typically about an hour ahead) */
  forecastTime: Date | null;
  /** how many grid points carried a non-zero probability */
  activePoints: number;
}

const OVATION_LONS = 360;
const OVATION_LATS = 181; // -90 .. +90 inclusive

/**
 * Parse NOAA's OVATION Prime aurora grid: 360 x 181 triples of
 * [longitude 0-359, latitude -90..90, probability 0-100].
 *
 * Stored flat as Int16Array rather than a nested array, because this is 65,160
 * points arriving on every load and the naive shape costs several megabytes of
 * heap for no benefit.
 */
export function parseOvation(raw: unknown): OvationGrid | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const coords = root.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return null;

  const probability = new Int16Array(OVATION_LONS * OVATION_LATS);
  let activePoints = 0;

  for (const c of coords) {
    if (!Array.isArray(c) || c.length < 3) continue;
    const [lon, lat, p] = c;
    if (!finite(lon) || !finite(lat) || !finite(p)) continue;
    const li = ((Math.round(lon) % 360) + 360) % 360;
    const ai = Math.round(lat) + 90;
    if (ai < 0 || ai >= OVATION_LATS) continue;
    probability[li * OVATION_LATS + ai] = p;
    if (p > 0) activePoints++;
  }

  const parseTime = (v: unknown): Date | null => {
    if (typeof v !== "string") return null;
    const t = new Date(v);
    return Number.isFinite(t.getTime()) ? t : null;
  };

  return {
    probability,
    observationTime: parseTime(root["Observation Time"]),
    forecastTime: parseTime(root["Forecast Time"]),
    activePoints,
  };
}

/**
 * The modelled probability of visible aurora overhead at a place, [0-100].
 *
 * "Overhead" is the model's own definition and it is the thing people most
 * often misread: a zero here does NOT mean you cannot see anything, because the
 * oval may still be north of you and well within horizon range. That is what
 * {@link auroraVerdict} is for.
 */
export function ovationProbabilityAt(
  grid: OvationGrid | null | undefined,
  latDeg: number,
  lonDeg: number
): number | null {
  if (!grid || !finite(latDeg) || !finite(lonDeg)) return null;
  if (Math.abs(latDeg) > 90) return null;
  const li = ((Math.round(lonDeg) % 360) + 360) % 360;
  const ai = Math.round(clamp(latDeg, -90, 90)) + 90;
  const v = grid.probability[li * OVATION_LATS + ai];
  return typeof v === "number" ? v : null;
}

/** The highest probability anywhere on the grid, for a headline figure. */
export function ovationPeak(grid: OvationGrid | null | undefined): number | null {
  if (!grid) return null;
  let peak = 0;
  for (let i = 0; i < grid.probability.length; i++) {
    if (grid.probability[i] > peak) peak = grid.probability[i];
  }
  return peak;
}

// ────────────────────────────── the verdict ─────────────────────────────────

export type AuroraChance =
  /** the oval is modelled overhead */
  | "overhead"
  /** the oval is north of you but close enough to show on the horizon */
  | "horizon"
  /** only the high red emission could clear your horizon */
  | "red-only"
  /** the oval is too far away tonight */
  | "too-far";

export interface AuroraVerdict {
  chance: AuroraChance;
  /** the observer's geomagnetic latitude */
  geomagneticLat: number;
  /** the equatorward edge of the oval for this Kp, geomagnetic */
  boundaryLat: number;
  /** how far the observer is from that edge, in degrees (negative = inside) */
  degreesFromOval: number;
  /** the OVATION overhead probability at this location, if the grid was loaded */
  overheadProbability: number | null;
  /** which hemisphere's oval was used */
  hemisphere: "north" | "south";
}

/**
 * Can this observer see it, and how.
 *
 * The three cases are geometry, not vibes. If the observer is poleward of the
 * oval edge, the aurora is overhead. If not, the question is whether the oval
 * is still within horizon range of the emission's height: the green layer at
 * about 110 km clears the horizon out to roughly 10.6 degrees of latitude, and
 * the red layer at about 300 km out to roughly 17.6, which is why the two cases
 * are reported separately rather than averaged into one fuzzy answer.
 *
 * Southern-hemisphere observers are compared against the southern oval, using
 * the same boundary table mirrored, because the oval is a ring around each
 * magnetic pole and the physics does not care which one you are under.
 */
export function auroraVerdict(
  latDeg: number,
  lonDeg: number,
  kp: number,
  grid?: OvationGrid | null
): AuroraVerdict | null {
  const geomagneticLat = geomagneticLatitude(latDeg, lonDeg);
  const boundary = ovalBoundaryLatitude(kp);
  if (geomagneticLat === null || boundary === null) return null;

  const hemisphere: "north" | "south" = geomagneticLat >= 0 ? "north" : "south";
  const absGeo = Math.abs(geomagneticLat);
  const degreesFromOval = boundary - absGeo;

  const greenReach = horizonRangeDeg(EMISSION_ALTITUDE_KM.green) ?? 10.6;
  const redReach = horizonRangeDeg(EMISSION_ALTITUDE_KM.red) ?? 17.6;

  let chance: AuroraChance;
  if (degreesFromOval <= 0) chance = "overhead";
  else if (degreesFromOval <= greenReach) chance = "horizon";
  else if (degreesFromOval <= redReach) chance = "red-only";
  else chance = "too-far";

  return {
    chance,
    geomagneticLat,
    boundaryLat: boundary,
    degreesFromOval,
    overheadProbability: ovationProbabilityAt(grid, latDeg, lonDeg),
    hemisphere,
  };
}

export const CHANCE_LABEL: Record<AuroraChance, string> = {
  overhead: "the oval is modelled over you",
  horizon: "possible low on the horizon",
  "red-only": "only a high red glow could reach you",
  "too-far": "the oval is too far away right now",
};

// ─────────────────────────────── honesty copy ───────────────────────────────

export const GEOMAGNETIC_NOTE =
  "Aurora does not care about your geographic latitude. It cares where you are relative to the geomagnetic pole, which currently sits in the Canadian Arctic rather than at the top of the globe. That is why Edinburgh and Moscow, at the same geographic latitude, have completely different aurora luck: Edinburgh is more than six degrees higher in geomagnetic latitude. Every answer here is computed in geomagnetic coordinates and both numbers are shown.";

export const DIPOLE_LIMIT_NOTE =
  "Geomagnetic latitude here is the centred dipole value. The real field is not a perfect dipole, and the corrected geomagnetic coordinates used operationally differ from this by up to about 3 degrees in places, most noticeably around the North Atlantic. Close to the edge of the oval, treat the verdict as a strong hint rather than a ruling.";

export const OVATION_NOTE =
  "The coloured oval is NOAA's OVATION Prime model, not a photograph and not our own model. It gives the probability of visible aurora OVERHEAD about an hour ahead, driven by solar wind measured at L1, roughly a million miles upstream. That is where the one-hour warning comes from, and it is also the hard limit on it: nothing sees a storm coming much earlier than the wind reaches that spacecraft.";

export const KP_NOTE =
  "Kp is a PLANETARY index on a 3-hour cadence, derived from magnetometers scattered around the world. It is not a local measurement and not an instantaneous one. A quiet Kp does not rule out a local substorm, and a high Kp does not mean the aurora is above you specifically.";

export const FORECAST_LIMIT_NOTE =
  "Beyond about an hour, aurora forecasting is genuinely poor. The 3-day Kp outlook is a probabilistic guess at how disturbed the field will be, not a schedule. Anyone offering you a precise aurora prediction for next Tuesday is selling something.";

export const NO_WEATHER_NOTE =
  "As on the Tonight tab: no cloud cover, no light pollution. This is geometry and geomagnetism. A clear verdict here is still nothing at all through an overcast.";

export const BZ_NOTE =
  "The number to watch in the solar wind is Bz, the north-south tilt of the interplanetary magnetic field. When it turns SOUTHWARD (negative) it is antiparallel to Earth's field at the nose of the magnetosphere, the two can reconnect, and energy pours in. A fast wind with northward Bz often does very little; a moderate wind with strongly southward Bz can light up the sky.";
