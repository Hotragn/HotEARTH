/**
 * lib/tides.ts — the equilibrium tide, and how wrong it is.
 *
 * This module computes Newton's equilibrium tide: the shape the ocean would
 * take if the Earth were covered by a global ocean of uniform depth that
 * responded instantly to the Moon's and Sun's gravity. It is the theory in every
 * textbook, it is genuinely beautiful, and it is WRONG about the sea level at
 * every coast on Earth, usually by a factor of several.
 *
 * That is the entire point of the tab it powers. The theory gets the RHYTHM
 * exactly right: two highs a day, the 12 h 25 m lunar beat, the spring-neap
 * fortnight, perigean tides. It gets the AMPLITUDE badly wrong: it predicts
 * about half a metre of range everywhere, while Boston sees three metres, the
 * Bay of Fundy sixteen, and much of the Mediterranean barely thirty centimetres.
 *
 * The reason is not a missing term. Real tides are a RESONANT RESPONSE: the
 * tide-raising force is a small periodic push, and each ocean basin answers it
 * according to its own size, depth and shape, amplifying it where the basin's
 * natural period is close to the forcing and cancelling it where it is not.
 * Continents, shelves and the Coriolis force turn the tide into a set of waves
 * rotating around amphidromic points. None of that is in the equilibrium theory,
 * and no amount of care with the potential will put it there.
 *
 * So this module computes the theory honestly, and the tab shows it next to a
 * real tide gauge so the gap is visible rather than described.
 *
 * WHAT IS COMPUTED HERE, from positions this app already had:
 *   - the sub-lunar and sub-solar points (lib/tonight, lib/solar, lib/celestial)
 *   - the equilibrium tide height at any place and instant, from the real
 *     distances, so perigee and apogee change the answer
 *   - the spring-neap state from the real Sun-Moon elongation
 *   - the amplification factor: measured range divided by predicted range
 *
 * Null-safety contract, as everywhere else: bad input returns null or an empty
 * array, and nothing throws.
 */

import { subsolarPoint } from "./solar";
import { moonEquatorial } from "./tonight";
import { moonPhase } from "./lunar";
import { greenwichMeanSiderealTimeDeg } from "./celestial";
import { heliocentricPosition } from "./planets";
import { EARTH_MEAN_RADIUS_KM } from "./geo";
import { parseUtcTimestamp } from "./utils";

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidDate(d: unknown): d is Date {
  return d instanceof Date && Number.isFinite(d.getTime());
}

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function norm360(deg: number): number {
  const x = deg % 360;
  return x < 0 ? x + 360 : x;
}

// ───────────────────────────── constants ────────────────────────────────────

/** Moon-to-Earth mass ratio (IAU / JPL DE440). */
export const MOON_EARTH_MASS_RATIO = 0.0123000371;
/** Sun-to-Earth mass ratio. */
export const SUN_EARTH_MASS_RATIO = 332946.0487;
/** Mean Earth-Moon distance [km]. */
export const MEAN_LUNAR_DISTANCE_KM = 384400;
/** One astronomical unit [km], IAU 2012 exact. */
export const AU_KM = 149597870.7;

/**
 * The principal lunar semi-diurnal constituent, M2: 12 h 25.2 m.
 *
 * This is half a LUNAR day, not half a solar day. The Moon moves about 13
 * degrees eastward per day, so the Earth has to turn about 50 minutes longer to
 * bring it back overhead, and that is why high tide slides later every day by
 * roughly that much. M2 is the largest constituent almost everywhere on Earth.
 */
export const M2_PERIOD_HOURS = 12.4206012;

/** The principal solar semi-diurnal constituent, S2: exactly half a solar day. */
export const S2_PERIOD_HOURS = 12;

/**
 * The spring-neap cycle: the beat between M2 and S2, which is half a synodic
 * month, 14.765 days. Springs come twice a lunar month, at new and full Moon.
 */
export const SPRING_NEAP_DAYS = 14.7653;

// ───────────────────── the sub-lunar and sub-solar points ───────────────────

export interface SubPoint {
  latDeg: number;
  lonDeg: number;
  /** distance from Earth's centre to the body [km] */
  distanceKm: number;
}

/**
 * The sub-lunar point: where the Moon is directly overhead, and the centre of
 * the near-side tidal bulge.
 */
export function subLunarPoint(date: Date): SubPoint | null {
  if (!isValidDate(date)) return null;
  const eq = moonEquatorial(date);
  const gmst = greenwichMeanSiderealTimeDeg(date);
  if (!eq || gmst === null) return null;
  let lon = norm360(eq.raDeg - gmst);
  if (lon > 180) lon -= 360;
  return { latDeg: eq.decDeg, lonDeg: lon, distanceKm: eq.distanceKm };
}

/** The sub-solar point, with the real Earth-Sun distance of the day. */
export function subSolarPointWithDistance(date: Date): SubPoint | null {
  if (!isValidDate(date)) return null;
  const sub = subsolarPoint(date);
  if (!sub || !finite(sub.lat) || !finite(sub.lon)) return null;
  const earth = heliocentricPosition("Earth", date);
  const distanceKm = earth.distanceAU * AU_KM;
  if (!finite(distanceKm) || distanceKm <= 0) return null;
  return { latDeg: sub.lat, lonDeg: sub.lon, distanceKm };
}

/** Angular distance between an observer and a sub-point [deg]. */
export function zenithAngleDeg(
  latDeg: number,
  lonDeg: number,
  sub: SubPoint | null | undefined
): number | null {
  if (!sub || !finite(latDeg) || !finite(lonDeg)) return null;
  const phi = latDeg * DEG2RAD;
  const phiS = sub.latDeg * DEG2RAD;
  const dLon = (lonDeg - sub.lonDeg) * DEG2RAD;
  const cosPsi =
    Math.sin(phi) * Math.sin(phiS) + Math.cos(phi) * Math.cos(phiS) * Math.cos(dLon);
  return Math.acos(clamp(cosPsi, -1, 1)) * RAD2DEG;
}

// ─────────────────────────── the equilibrium tide ───────────────────────────

/**
 * The equilibrium tide coefficient for a body: the height of the bulge directly
 * under it, in metres.
 *
 *   A = (M_body / M_earth) * (R_earth / d)^3 * R_earth
 *
 * The cube is the whole story of tides. Tidal force is a DIFFERENCE in gravity
 * across the Earth, not gravity itself, so it falls off as the cube of distance
 * rather than the square. That is why the Moon beats the Sun: the Sun pulls on
 * Earth about 178 times harder, but it is 390 times further away, and 390 cubed
 * wins comfortably.
 *
 * With mean distances this gives about 0.36 m for the Moon and 0.16 m for the
 * Sun, which are the values every textbook quotes.
 */
export function equilibriumCoefficientM(
  massRatio: number,
  distanceKm: number
): number | null {
  if (!finite(massRatio) || !finite(distanceKm) || distanceKm <= 0) return null;
  const ratio = EARTH_MEAN_RADIUS_KM / distanceKm;
  return massRatio * ratio * ratio * ratio * EARTH_MEAN_RADIUS_KM * 1000;
}

export interface EquilibriumTide {
  /** the Moon's contribution at this place [m] */
  moonM: number;
  /** the Sun's contribution [m] */
  sunM: number;
  /** their sum, the equilibrium sea surface displacement [m] */
  totalM: number;
  /** zenith angle of the Moon [deg] */
  moonZenithDeg: number;
  /** zenith angle of the Sun [deg] */
  sunZenithDeg: number;
}

/**
 * The equilibrium tide height at a place and instant [m].
 *
 * For each body, the displacement is
 *
 *   zeta = A * (3 cos^2(psi) - 1) / 2
 *
 * with psi the body's zenith angle. The (3cos²−1)/2 is a Legendre polynomial,
 * and it is the reason there are TWO high tides a day rather than one: it is
 * positive both where the body is overhead AND where it is underfoot, because
 * the near side is pulled toward the body while the Earth itself is pulled away
 * from the far side's water. A theory with one bulge would predict one high tide
 * a day, which is not what anyone observes.
 */
export function equilibriumTide(
  date: Date,
  latDeg: number,
  lonDeg: number
): EquilibriumTide | null {
  if (!isValidDate(date) || !finite(latDeg) || !finite(lonDeg)) return null;
  if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 180) return null;

  const moon = subLunarPoint(date);
  const sun = subSolarPointWithDistance(date);
  if (!moon || !sun) return null;

  const moonZenithDeg = zenithAngleDeg(latDeg, lonDeg, moon);
  const sunZenithDeg = zenithAngleDeg(latDeg, lonDeg, sun);
  if (moonZenithDeg === null || sunZenithDeg === null) return null;

  const aMoon = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, moon.distanceKm);
  const aSun = equilibriumCoefficientM(SUN_EARTH_MASS_RATIO, sun.distanceKm);
  if (aMoon === null || aSun === null) return null;

  const legendre = (psiDeg: number) => {
    const c = Math.cos(psiDeg * DEG2RAD);
    return (3 * c * c - 1) / 2;
  };

  const moonM = aMoon * legendre(moonZenithDeg);
  const sunM = aSun * legendre(sunZenithDeg);

  return {
    moonM,
    sunM,
    totalM: moonM + sunM,
    moonZenithDeg,
    sunZenithDeg,
  };
}

/**
 * The equilibrium tide sampled over a window, for plotting against a gauge.
 * Returns [] rather than a partial curve if the inputs are unusable.
 */
export function equilibriumCurve(
  from: Date,
  to: Date,
  latDeg: number,
  lonDeg: number,
  stepMinutes = 10
): Array<{ time: Date; heightM: number }> {
  if (
    !isValidDate(from) ||
    !isValidDate(to) ||
    !finite(stepMinutes) ||
    stepMinutes <= 0 ||
    to.getTime() <= from.getTime()
  ) {
    return [];
  }
  // Refuse an absurd sample count rather than locking the tab up.
  const steps = (to.getTime() - from.getTime()) / (stepMinutes * 60_000);
  if (steps > 20_000) return [];

  const out: Array<{ time: Date; heightM: number }> = [];
  for (let ms = from.getTime(); ms <= to.getTime(); ms += stepMinutes * 60_000) {
    const t = new Date(ms);
    const e = equilibriumTide(t, latDeg, lonDeg);
    if (e) out.push({ time: t, heightM: e.totalM });
  }
  return out;
}

/** Peak-to-trough range of a curve [m]. */
export function curveRangeM(
  curve: ReadonlyArray<{ heightM: number }> | null | undefined
): number | null {
  if (!Array.isArray(curve) || curve.length < 2) return null;
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of curve) {
    if (!finite(p?.heightM)) continue;
    if (p.heightM < lo) lo = p.heightM;
    if (p.heightM > hi) hi = p.heightM;
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return hi - lo;
}

// ──────────────────────────── spring and neap ───────────────────────────────

export type TidePhase = "spring" | "neap" | "between";

export interface SpringNeap {
  phase: TidePhase;
  /** Sun-Moon elongation [deg], 0 at new Moon and 180 at full */
  elongationDeg: number;
  /**
   * How much the solar bulge reinforces the lunar one: 1 at syzygy (spring), 0
   * at quadrature (neap). This is (1 + cos(2 * elongation)) / 2.
   *
   * NOT |cos(2 * elongation)|, which was the first version and is wrong: that
   * has a period of 90 degrees, so it reads 1 at the QUARTERS as well and calls
   * every neap a spring. The unsigned form matters, because the solar term adds
   * at syzygy and subtracts at quadrature.
   */
  alignment: number;
  /** the Moon's illuminated fraction, since springs track new and full Moon */
  moonIllumination: number;
}

/**
 * Spring or neap, from the real Sun-Moon geometry.
 *
 * Springs happen when the Sun and Moon pull along the SAME LINE, which is both
 * at new Moon and at full Moon: the far-side bulge means alignment matters, not
 * which side. Neaps come at the quarters, when the solar bulge sits over the
 * lunar trough and partly fills it in. The cycle is therefore twice per lunar
 * month, and the giveaway that the theory has the physics right is that this
 * falls straight out of the same double-bulge term.
 */
export function springNeap(date: Date): SpringNeap | null {
  if (!isValidDate(date)) return null;
  const phase = moonPhase(date);
  if (!phase || !finite(phase.elongation)) return null;

  const elongationDeg = phase.elongation;
  const alignment = (1 + Math.cos(2 * elongationDeg * DEG2RAD)) / 2;

  let tidePhase: TidePhase;
  if (alignment > 0.8) tidePhase = "spring";
  else if (alignment < 0.35) tidePhase = "neap";
  else tidePhase = "between";

  return {
    phase: tidePhase,
    elongationDeg,
    alignment,
    moonIllumination: phase.illuminatedFraction,
  };
}

// ───────────────────────── the gauge, and the gap ───────────────────────────

export interface WaterLevelSample {
  time: Date;
  /** measured water level above the station datum [m] */
  heightM: number;
}

export interface GaugeSeries {
  samples: WaterLevelSample[];
  stationId: string | null;
  stationName: string | null;
  latDeg: number | null;
  lonDeg: number | null;
  /** rows dropped because the value was missing or unparseable */
  dropped: number;
}

const EMPTY_GAUGE: GaugeSeries = {
  samples: [],
  stationId: null,
  stationName: null,
  latDeg: null,
  lonDeg: null,
  dropped: 0,
};

/**
 * Parse a NOAA CO-OPS datagetter response (water level or predictions).
 *
 * Two things here bite if you trust the feed:
 *
 * Values arrive as STRINGS, and a missing reading is an EMPTY STRING rather than
 * a null, which becomes NaN on a chart if nobody checks.
 *
 * Time tags are "YYYY-MM-DD HH:mm" with no zone marker (we request GMT), and
 * appending "Z" before handing them to `new Date` is a trap: V8's parser is
 * lenient enough to turn a malformed tag into 2000-01-01 rather than an Invalid
 * Date. Timestamps go through lib/utils' strict parser instead.
 */
export function parseCoOps(raw: unknown): GaugeSeries {
  if (!raw || typeof raw !== "object") return EMPTY_GAUGE;
  const root = raw as Record<string, unknown>;
  const rows = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.predictions)
      ? root.predictions
      : null;
  if (!rows) return EMPTY_GAUGE;

  const meta =
    root.metadata && typeof root.metadata === "object"
      ? (root.metadata as Record<string, unknown>)
      : {};

  const num = (v: unknown): number | null => {
    if (finite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const samples: WaterLevelSample[] = [];
  let dropped = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      dropped++;
      continue;
    }
    const r = row as Record<string, unknown>;
    const v = num(r.v);
    const tag = typeof r.t === "string" ? r.t : null;
    if (v === null || !tag) {
      dropped++;
      continue;
    }
    const time = parseUtcTimestamp(tag);
    if (time === null) {
      dropped++;
      continue;
    }
    samples.push({ time, heightM: v });
  }
  samples.sort((a, b) => a.time.getTime() - b.time.getTime());

  return {
    samples,
    stationId: typeof meta.id === "string" ? meta.id : null,
    stationName: typeof meta.name === "string" ? meta.name : null,
    latDeg: num(meta.lat),
    lonDeg: num(meta.lon),
    dropped,
  };
}

export interface Amplification {
  /** measured peak-to-trough range over the window [m] */
  measuredRangeM: number;
  /** what the equilibrium theory predicted for the same window [m] */
  predictedRangeM: number;
  /** measured / predicted */
  factor: number;
}

/**
 * How many times larger the real tide is than the equilibrium theory predicts.
 *
 * This is the number the whole tab exists to show. It is not an error bar and
 * not a correction factor: it is the size of the resonant amplification each
 * ocean basin applies to the same small forcing. It varies from well under 1 in
 * places where the basin cancels the tide, to more than 30 in the Bay of Fundy,
 * and no single number would be right for two coasts at once.
 */
export function amplification(
  gauge: ReadonlyArray<WaterLevelSample> | null | undefined,
  predicted: ReadonlyArray<{ heightM: number }> | null | undefined
): Amplification | null {
  const measuredRangeM = curveRangeM(
    Array.isArray(gauge) ? gauge.map((s) => ({ heightM: s.heightM })) : null
  );
  const predictedRangeM = curveRangeM(predicted);
  if (measuredRangeM === null || predictedRangeM === null) return null;
  if (predictedRangeM <= 0) return null;
  return {
    measuredRangeM,
    predictedRangeM,
    factor: measuredRangeM / predictedRangeM,
  };
}

// ─────────────────────────────── honesty copy ───────────────────────────────

export const EQUILIBRIUM_LIMIT_NOTE =
  "The curve this app computes is Newton's equilibrium tide: what the ocean would do if the Earth were covered by a uniform ocean that responded instantly. It predicts a range of about half a metre everywhere on the planet. That is not what any coast does, and the difference is not a rounding error. Real tides are a resonant response: each ocean basin answers the same small push according to its own size, depth and shape.";

export const RHYTHM_NOTE =
  "What the theory does get right is the timing. Two highs a day, the 12 hour 25 minute lunar beat that slides high tide about 50 minutes later each day, springs at new and full Moon, neaps at the quarters, and bigger tides at lunar perigee. Watch the shape of the two curves rather than their heights and they keep step.";

export const DOUBLE_BULGE_NOTE =
  "There are two high tides a day, not one, because the tide-raising term is positive both where the Moon is overhead and where it is underfoot. The near side is pulled toward the Moon; on the far side the solid Earth is pulled away from the water. A one-bulge picture would predict a single daily high tide, which nobody observes.";

export const CUBE_LAW_NOTE =
  "The Sun pulls on Earth about 178 times harder than the Moon does, and still loses. Tidal force is a DIFFERENCE in gravity across the Earth's diameter rather than gravity itself, so it falls off as the cube of distance, and the Sun is 390 times further away. The Moon wins by roughly two to one.";

export const PHASE_LAG_NOTE =
  "The two curves do not peak at the same moment, and that offset is real rather than an error. An ocean basin does not respond instantly to the force applied to it: the water has to be moved, and it arrives late. Mariners have called that delay the age of the tide, or the establishment of the port, for centuries, and it is a fixed local number for each harbour. It is another thing the equilibrium theory cannot give you, because a theory with no basins has nothing to lag.";

export const DATUM_NOTE =
  "The gauge is measured against a local tidal datum (MLLW, mean lower low water) and the theory is a displacement about zero. Only the RANGE of the two can be compared, not their absolute levels, so the curves are plotted about their own means.";

export const NO_PREDICTION_NOTE =
  "Do not navigate by this. NOAA publishes real tide predictions for these stations, computed from dozens of harmonic constituents fitted to each station's own record, and those are the numbers to use for anything that matters. What is computed here is the textbook theory, shown next to reality precisely so you can see why the harmonic fit is necessary.";
