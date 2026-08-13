/**
 * The SUN itself — rotation, activity cycle, and the space-weather it drives —
 * for the "Sun & space weather" phase of the digital twin.
 *
 * This is the counterpart to lib/solar.ts, but pointed the other way: solar.ts
 * is the EARTH's view OF the sun (subsolar point, day/night terminator);
 * this module is about the sun AS A BODY and the heliophysics it exports to the
 * whole system — differential rotation, the ~11-year sunspot cycle, X-ray
 * flares, the solar wind, geomagnetic Kp storms and the aurora they light up.
 *
 * Like lib/solar.ts and lib/planets.ts, every public function is a pure function
 * of its inputs (a UTC `Date` or a measured quantity), so it unit-tests cleanly
 * (lib/sun.test.ts) and the frontend HUD can call it once per tick.
 *
 * ── Honesty contract (.claude/skills/physics-env-simulation) ─────────────────
 * Real, cited physics or it doesn't ship. Two kinds of function live here and
 * are labelled as such:
 *   • DETERMINISTIC geometry/scales — differential rotation, Carrington
 *     rotation, X-ray flare classes, the NOAA G-scale — are exact given their
 *     inputs and cite a source.
 *   • TIMING APPROXIMATIONS — the solar-cycle phase and the aurora boundary —
 *     are rough models from published relationships. They are explicitly flagged
 *     as approximate, and the HUD should prefer real observed data (SWPC/SILSO
 *     sunspot numbers, live Kp, live GOES flux) whenever it is passed in.
 *
 * ── Sources ──────────────────────────────────────────────────────────────────
 *   • Differential rotation: Snodgrass & Ulrich (1990), "Rotation of Doppler
 *     features in the solar photosphere", ApJ 351, 309 — sidereal law
 *     ω(ψ) = A + B·sin²ψ + C·sin⁴ψ, A=14.713, B=−2.396, C=−1.787 (deg/day).
 *   • Carrington rotation: R. C. Carrington's mean synodic period 27.2753 d,
 *     rotation 1 starting JD 2398167.4 (1853-11-09.489).
 *     CR = 1 + (JD − 2398167.4)/27.2753 (Stanford WSO; UMD MTOF/PM CR tables —
 *     e.g. CR 2300 begins ~2025-07-16, reproduced by this formula to <1 day).
 *   • Solar constants: IAU 2015 Resolution B3 nominal values — nominal solar
 *     radius R⊙ = 6.957×10⁸ m, effective temperature T_eff = 5772 K, luminosity
 *     L⊙ = 3.828×10²⁶ W; GM⊙ ⇒ M⊙ ≈ 1.98892×10³⁰ kg. 1 au = 149 597 870.7 km
 *     (IAU 2012 Resolution B2).
 *   • Solar cycle 25: NOAA/NASA Solar Cycle 25 Prediction Panel — minimum
 *     (cycle start) December 2019, ~11-year mean length, maximum ~2024–2025.
 *   • Space-weather scales: NOAA SWPC "Space Weather Scales" (R/S/G), GOES
 *     X-ray flare A/B/C/M/X classification, and SWPC aurora / Kp guidance.
 */

// ─────────────────────────────── Time helpers ──────────────────────────────

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365.25;

/** Julian Date for a UTC instant. Unix epoch 1970-01-01T00:00Z = JD 2440587.5. */
export function julianDate(date: Date): number {
  return date.getTime() / DAY_MS + 2_440_587.5;
}

/** Finite-number guard used everywhere for null-safety (bad input ⇒ null). */
import { ovalBoundaryLatitude } from "./aurora";

function finite(x: number): boolean {
  return typeof x === "number" && Number.isFinite(x);
}

function isValidDate(date: unknown): date is Date {
  return date instanceof Date && Number.isFinite(date.getTime());
}

// ─────────────────────── 1. Differential solar rotation ─────────────────────
//
// The sun is not solid: its photosphere rotates fastest at the equator and
// slowest near the poles. Snodgrass & Ulrich (1990) fit Doppler tracer data to
//     ω(ψ) = A + B·sin²ψ + C·sin⁴ψ   [deg/day, SIDEREAL]
// with ψ the heliographic latitude. A is the equatorial rate; B and C are both
// negative, so ω falls (period rises) toward the poles.

/** Snodgrass & Ulrich (1990) sidereal differential-rotation coefficients [deg/day]. */
export const SNODGRASS_A = 14.713;
export const SNODGRASS_B = -2.396;
export const SNODGRASS_C = -1.787;

/**
 * Sidereal photospheric rotation rate [deg/day] at heliographic latitude
 * `latitudeDeg` (Snodgrass & Ulrich 1990). Symmetric in latitude (depends only
 * on sin²ψ). Returns null for non-finite or |lat| > 90.
 *
 * Equator: A = 14.713 °/day. 30°: ≈14.00 °/day. Pole: A+B+C ≈ 10.53 °/day.
 */
export function differentialRotationRateDegPerDay(
  latitudeDeg: number
): number | null {
  if (!finite(latitudeDeg) || Math.abs(latitudeDeg) > 90) return null;
  const s2 = Math.sin((latitudeDeg * Math.PI) / 180) ** 2;
  return SNODGRASS_A + SNODGRASS_B * s2 + SNODGRASS_C * s2 * s2;
}

/**
 * Sidereal rotation period [days] at heliographic latitude `latitudeDeg`:
 * period = 360 / ω(ψ). Returns null for bad input.
 *
 * Reference values (Snodgrass & Ulrich 1990):
 *   equator ≈ 24.47 d, 30° ≈ 25.71 d, 60° ≈ 30.9 d, pole ≈ 34.2 d
 * i.e. monotonically longer toward the poles. This is the TRUE photospheric
 * rate; the historical CARRINGTON mean sidereal period (≈25.38 d, synodic
 * ≈27.28 d — see below) is a slower convention representative of the ~16°
 * sunspot zone, used only for rotation numbering.
 */
export function siderealRotationPeriodDays(latitudeDeg: number): number | null {
  const omega = differentialRotationRateDegPerDay(latitudeDeg);
  if (omega === null || omega <= 0) return null;
  return 360 / omega;
}

// ── Carrington rotation ──────────────────────────────────────────────────────

/** Carrington mean SIDEREAL equatorial rotation period [days] (historical convention). */
export const CARRINGTON_SIDEREAL_PERIOD_DAYS = 25.38;
/** Carrington mean SYNODIC rotation period [days] (as seen from Earth) — 27.2753 d. */
export const CARRINGTON_SYNODIC_PERIOD_DAYS = 27.2753;
/** Rounded mean synodic value quoted in the literature (~27.28 d). */
export const MEAN_SYNODIC_ROTATION_DAYS = 27.28;
/** Rounded mean sidereal value quoted in the literature (~25.38 d). */
export const MEAN_SIDEREAL_ROTATION_DAYS = 25.38;

/** JD of the start of Carrington rotation 1 (1853-11-09.489). */
const CARRINGTON_EPOCH_JD = 2_398_167.4;

/**
 * Carrington rotation number (continuous / fractional) at a UTC instant:
 *     CR = 1 + (JD − 2398167.4) / 27.2753
 * (Stanford WSO / UMD MTOF-PM). Math.floor(CR) is the current rotation number;
 * the fractional part runs 0→1 across one synodic rotation. Increases by exactly
 * 1 every 27.2753 days. Sanity check: CR(2025-07-16) ≈ 2300.0. Returns null for
 * an invalid date.
 */
export function carringtonRotationNumber(date: Date): number | null {
  if (!isValidDate(date)) return null;
  return 1 + (julianDate(date) - CARRINGTON_EPOCH_JD) / CARRINGTON_SYNODIC_PERIOD_DAYS;
}

/**
 * APPROXIMATE Carrington longitude [deg, 0–360) of the sub-Earth central
 * meridian (the "L0" a solar HUD shows). Standard convention: L0 = 360 at the
 * start of a rotation and decreases to 0 across it, so here
 *     L0 ≈ (360 · (1 − frac(CR))) mod 360.
 * APPROXIMATION: this uses only the mean synodic rate. The true L0 (Astronomical
 * Almanac) also carries the ~±7° annual B0/orbital-geometry variation, so treat
 * this as accurate to a few degrees, for display only. Returns null on bad input.
 */
export function subEarthCarringtonLongitude(date: Date): number | null {
  const cr = carringtonRotationNumber(date);
  if (cr === null) return null;
  const frac = cr - Math.floor(cr);
  return (360 * (1 - frac)) % 360;
}

// ────────────────────────────── 2. Solar cycle ──────────────────────────────

export type SolarCyclePhase =
  | "minimum"
  | "rising"
  | "maximum"
  | "declining";

export interface SolarCycleInfo {
  /** Cycle number (25 for the ongoing cycle that began Dec 2019). */
  cycleNumber: number;
  /** Fraction 0→1 through the nominal 11-yr cycle (0 = minimum/start). */
  phase: number;
  /** Years elapsed since the cycle's starting minimum. */
  yearsIntoCycle: number;
  /** Coarse phase label derived from `phase`. */
  phaseLabel: SolarCyclePhase;
  /** Always true — this is a timing estimate, not a sunspot measurement. */
  approximate: true;
  /** Honesty string for the HUD. */
  note: string;
}

/** Adopted start (minimum) of Solar Cycle 25 — December 2019 (NOAA/NASA panel). */
const CYCLE_25_START_MS = Date.UTC(2019, 11, 1);
const CYCLE_25_NUMBER = 25;
/** Nominal solar-cycle length [years] (Schwabe cycle ≈ 11 yr). */
export const SOLAR_CYCLE_LENGTH_YEARS = 11;

/**
 * Coarse phase label from a 0–1 cycle phase. Solar cycles rise faster than they
 * decline (rise ~4 yr, decline ~7 yr), so the maximum window sits a little past
 * a third of the way in. Boundaries are nominal, not sharp physical transitions.
 */
export function solarCyclePhaseLabel(phase: number): SolarCyclePhase | null {
  if (!finite(phase)) return null;
  const p = ((phase % 1) + 1) % 1; // wrap into [0,1)
  if (p < 0.09 || p >= 0.9) return "minimum";
  if (p < 0.36) return "rising";
  if (p < 0.55) return "maximum";
  return "declining";
}

/**
 * APPROXIMATE solar-cycle state at a UTC instant, from cycle timing alone:
 * Cycle 25 began (minimum) Dec 2019 with a nominal 11-yr length, so
 *   yearsIntoCycle = (date − 2019-12) mod 11,  cycleNumber = 25 + ⌊elapsed/11⌋.
 *
 * DOCUMENTED APPROXIMATION: real cycles vary in length and amplitude and are not
 * sinusoidal. This is a clock, not a forecast. Prefer measured SILSO/SWPC
 * sunspot numbers when available — pass them to the HUD and label the phase from
 * the data, using this only as a fallback. Returns null on an invalid date.
 *
 * Sanity check: date in 2025 ⇒ Cycle 25, phase ≈ 0.46 ⇒ "maximum".
 */
export function solarCycleInfo(date: Date): SolarCycleInfo | null {
  if (!isValidDate(date)) return null;
  const yearsSinceC25 =
    (date.getTime() - CYCLE_25_START_MS) / (DAYS_PER_YEAR * DAY_MS);
  const cyclesElapsed = Math.floor(yearsSinceC25 / SOLAR_CYCLE_LENGTH_YEARS);
  const cycleNumber = CYCLE_25_NUMBER + cyclesElapsed;
  const yearsIntoCycle =
    yearsSinceC25 - cyclesElapsed * SOLAR_CYCLE_LENGTH_YEARS;
  const phase = yearsIntoCycle / SOLAR_CYCLE_LENGTH_YEARS;
  return {
    cycleNumber,
    phase,
    yearsIntoCycle,
    phaseLabel: solarCyclePhaseLabel(phase) ?? "minimum",
    approximate: true,
    note: "Approximate phase from cycle-25 timing (min Dec 2019, ~11-yr length). Prefer observed SILSO/SWPC sunspot numbers when available.",
  };
}

// ─────────────────────────────── 3. Aurora oval ─────────────────────────────
//
// The equatorward edge of the auroral oval lives in lib/aurora now, and this
// module DELEGATES to it rather than carrying a second model.
//
// It used to carry its own rule of thumb, boundary = 67 - 3*Kp. That is also
// attributed to NOAA guidance, but it disagrees with the table NOAA publishes
// alongside its aurora products by up to 8 degrees at high Kp (40 against 48.1
// at Kp9), and two tabs of the same app quietly disagreeing about where the
// aurora reaches is exactly the sort of thing this project exists not to do.
//
// The table won for a reason beyond being the more standard citation: the old
// rule folded two separate effects into one number. An observer south of the
// oval can still see aurora, because the emission is 110 to 300 km up and
// clears their horizon from hundreds of kilometres away. lib/aurora computes
// that horizon range explicitly, so the boundary can mean just the boundary.

/**
 * APPROXIMATE equatorward boundary of the auroral oval [° geomagnetic latitude]
 * for a given Kp, from NOAA's published table (66.5° at Kp0 down to 48.1° at
 * Kp9). Delegates to lib/aurora's {@link ovalBoundaryLatitude} so there is one
 * model in the codebase. Kp is clamped to 0-9; returns null for non-finite
 * input.
 *
 * NOTE this is the boundary alone. Whether a given observer can SEE the aurora
 * also depends on how far it stays above their horizon, which lib/aurora
 * computes separately.
 */
export function auroraEquatorwardBoundaryDeg(kp: number): number | null {
  return ovalBoundaryLatitude(kp);
}

/**
 * Whether aurora is (roughly) overhead from geomagnetic latitude `latDeg` at
 * the given Kp: true iff |latDeg| >= the equatorward boundary. Works for both
 * hemispheres (uses |lat|). This answers "is it above me", NOT "can I see it":
 * for the second question, which includes the horizon geometry, use
 * lib/aurora's `auroraVerdict`. Returns null on bad input.
 */
export function auroraVisibleFromGeomagLatitude(
  kp: number,
  latDeg: number
): boolean | null {
  const boundary = auroraEquatorwardBoundaryDeg(kp);
  if (boundary === null || !finite(latDeg)) return null;
  return Math.abs(latDeg) >= boundary;
}

// ─────────────────── 4. Space-weather scales / classification ────────────────

/**
 * GOES soft X-ray (1–8 Å) flare class from the peak flux in W/m². The scale is
 * log-decade: A ≥ 1e-8, B ≥ 1e-7, C ≥ 1e-6, M ≥ 1e-5, X ≥ 1e-4 W/m²; the
 * magnitude is the flux divided by the band's base (e.g. 5e-5 → "M5.0", 2e-4 →
 * "X2.0", 1e-6 → "C1.0", 1e-8 → "A1.0"). X-class has no upper letter, so very
 * large flares read "X10.0", "X28.0", … Flux below 1e-8 is still reported on the
 * A scale (e.g. 5e-9 → "A0.5"). Returns null for non-finite or non-positive
 * flux (log-undefined). Reference: NOAA SWPC / GOES X-ray flare classification.
 */
export function xrayFlareClass(wattsPerM2: number): string | null {
  if (!finite(wattsPerM2) || wattsPerM2 <= 0) return null;
  const bands: ReadonlyArray<{ letter: string; base: number }> = [
    { letter: "X", base: 1e-4 },
    { letter: "M", base: 1e-5 },
    { letter: "C", base: 1e-6 },
    { letter: "B", base: 1e-7 },
    { letter: "A", base: 1e-8 },
  ];
  for (const b of bands) {
    if (wattsPerM2 >= b.base) {
      return b.letter + (wattsPerM2 / b.base).toFixed(1);
    }
  }
  // Below A1.0: sub-A flux, still expressed on the A scale.
  return "A" + (wattsPerM2 / 1e-8).toFixed(1);
}

/**
 * NOAA G-scale (geomagnetic storm) from Kp: none below Kp5, then G1 at Kp5, G2
 * at Kp6, G3 at Kp7, G4 at Kp8, G5 at Kp9 — i.e. G = Kp − 4, clamped to 1–5.
 * Returns 0 for "no storm" (Kp < 5). Returns null for non-finite Kp or Kp < 0
 * or Kp > 9 (outside the defined index range). Reference: NOAA SWPC Space
 * Weather Scales (G).
 */
export function gScaleFromKp(kp: number): number | null {
  if (!finite(kp) || kp < 0 || kp > 9) return null;
  if (kp < 5) return 0;
  return Math.min(5, Math.floor(kp) - 4);
}

/** "G1".."G5" or "none" for the HUD, from Kp. Returns null on bad input. */
export function gScaleLabel(kp: number): string | null {
  const g = gScaleFromKp(kp);
  if (g === null) return null;
  return g === 0 ? "none" : "G" + g;
}

/**
 * Qualitative solar-wind speed label [km/s]: slow < 400, nominal 400–500,
 * fast 500–700, very fast > 700. (Typical background ~300–500 km/s; coronal-hole
 * high-speed streams and shocks push higher.) Returns null on bad input.
 */
export function solarWindLabel(speedKmS: number): string | null {
  if (!finite(speedKmS) || speedKmS < 0) return null;
  if (speedKmS < 400) return "slow";
  if (speedKmS <= 500) return "nominal";
  if (speedKmS <= 700) return "fast";
  return "very fast";
}

/**
 * Descriptive geomagnetic-activity label from Kp (NOAA SWPC descriptors):
 * Kp 0–2 quiet, 3 unsettled, 4 active, 5 minor storm, 6 moderate storm,
 * 7 strong storm, 8 severe storm, 9 extreme storm. Returns null for non-finite
 * Kp or Kp outside 0–9.
 */
export function kpLabel(kp: number): string | null {
  if (!finite(kp) || kp < 0 || kp > 9) return null;
  const k = Math.floor(kp);
  switch (k) {
    case 0:
    case 1:
    case 2:
      return "quiet";
    case 3:
      return "unsettled";
    case 4:
      return "active";
    case 5:
      return "minor storm";
    case 6:
      return "moderate storm";
    case 7:
      return "strong storm";
    case 8:
      return "severe storm";
    default:
      return "extreme storm"; // Kp 9
  }
}

// ───────────────────────────── 5. Constants / HUD ───────────────────────────

/**
 * Physical constants of the sun for the HUD. IAU 2015 Resolution B3 nominal
 * values (radius, T_eff, luminosity), IAU mass, and the IAU 2012 astronomical
 * unit. `radiusInEarthRadii` uses Earth's equatorial radius 6378.137 km
 * (matches lib/planets.ts) ⇒ ≈109.1; against the mean radius 6371 km it is ≈109.2.
 */
export const SUN = {
  /** Nominal solar radius R⊙ [km] (IAU 2015). */
  radiusKm: 695_700,
  /** R⊙ in Earth equatorial radii (695700 / 6378.137). */
  radiusInEarthRadii: 695_700 / 6378.137,
  /** Effective (photospheric) temperature T_eff [K] (IAU 2015). */
  effectiveTemperatureK: 5772,
  /** Bolometric luminosity L⊙ [W] (IAU 2015). */
  luminosityW: 3.828e26,
  /** Mass M⊙ [kg] (from GM⊙; IAU). */
  massKg: 1.98892e30,
  /** 1 astronomical unit [km] (IAU 2012). */
  oneAuKm: 149_597_870.7,
} as const;

/** Nominal solar radius R⊙ [km]. */
export const SOLAR_RADIUS_KM = SUN.radiusKm;
/** Effective photospheric temperature [K]. */
export const SOLAR_EFFECTIVE_TEMPERATURE_K = SUN.effectiveTemperatureK;
/** Solar luminosity [W]. */
export const SOLAR_LUMINOSITY_W = SUN.luminosityW;
/** 1 AU [km]. */
export const AU_KM = SUN.oneAuKm;

/**
 * Angular diameter of the sun [deg] as seen from a distance `distanceKm`:
 * θ = 2·atan(R⊙ / d). From 1 AU this is ≈0.533° (~32′), the familiar half-degree
 * solar disk. Returns null for non-finite or non-positive distance.
 */
export function angularDiameterDegFromKm(distanceKm: number): number | null {
  if (!finite(distanceKm) || distanceKm <= 0) return null;
  return (2 * Math.atan(SUN.radiusKm / distanceKm) * 180) / Math.PI;
}
