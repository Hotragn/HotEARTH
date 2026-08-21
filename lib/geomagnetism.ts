/**
 * The geomagnetic field from IGRF-14, computed here.
 *
 * THE LOAD-BEARING IDEA of this tab is that a compass does not point north, and
 * the size of the error is a real number you can look up for where you are
 * standing. In Boston the needle sits about 14 degrees west of true north. That
 * is not a defect in the compass; it is the field.
 *
 * What arrives from NOAA is 195 Gauss coefficients per epoch and nothing else.
 * Every number this module reports is synthesised from them: the field at a
 * point, the declination, the position of the magnetic poles, the dipole
 * moment, the South Atlantic Anomaly. Nothing is copied from a published table.
 * That matters because it makes the numbers checkable, and they are checked
 * against published values in the tests, including NOAA's own published pole
 * positions for 2025.
 *
 * THE THREE NORTH POLES, which are routinely confused:
 *
 *   1. The GEOGRAPHIC pole, where the rotation axis comes out. Fixed.
 *   2. The GEOMAGNETIC pole, where the axis of the best-fit central dipole
 *      comes out. A closed-form function of exactly three coefficients. Around
 *      80.8 N, 72.8 W and drifting slowly. This is the one the auroral oval is
 *      centred on.
 *   3. The DIP pole, where the field is actually vertical and a compass needle
 *      stands on end. Requires all 195 coefficients and an iterative search.
 *      Around 86 N, 139 E, and it has been sprinting: roughly 10 km a year in
 *      the mid 20th century, over 50 km a year by the 2000s.
 *
 * None of the three is where your compass points, which is a fourth thing
 * again: the needle follows the LOCAL horizontal field, so it points along a
 * curved field line, not at a pole.
 *
 * THE LIMIT THAT MATTERS MOST: degree 13 means the shortest wavelength in the
 * model is roughly 3,000 km. The crustal field, the magnetised rock under your
 * feet, is not in it at all. Over a basalt province the real declination can
 * differ from this model by several degrees, and no amount of arithmetic here
 * will find that out. IGRF describes the field of the core, accurately, and
 * says nothing about the ground.
 *
 * Sources
 *   IGRF-14 coefficients: IAGA Working Group V-MOD, distributed by NOAA NCEI.
 *   Synthesis: the standard Schmidt semi-normalised spherical harmonic
 *   expansion; geodetic to geocentric conversion after Langel (1987) as used by
 *   the official pyIGRF reference implementation.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Geomagnetic reference radius, km. Not the WGS84 radius: it is a model constant. */
export const IGRF_REFERENCE_RADIUS_KM = 6371.2;

/** WGS84, for the geodetic to geocentric step. */
const WGS84_EQUATORIAL_KM = 6378.137;
const WGS84_FLATTENING = 1 / 298.257223563;

const DEG = Math.PI / 180;

// ────────────────────────────────── the model ────────────────────────────────

export interface IgrfModel {
  /** e.g. "IGRF-14" */
  model: string;
  credit: string;
  source: string;
  maxDegree: number;
  svMaxDegree: number;
  /** epoch years, 5 apart */
  epochs: number[];
  validFrom: number;
  /** last epoch + 5: past this the model has nothing to say */
  validTo: number;
  /** [epoch][coefficient], flat in the canonical ordering */
  coeffs: number[][];
  /** secular variation in nT/year, same ordering */
  sv: number[];
}

/** Bad input gives null rather than a half-built model. */
export function parseIgrf(raw: unknown): IgrfModel | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const maxDegree = r.maxDegree;
  const epochs = r.epochs;
  const coeffs = r.coeffs;
  const sv = r.sv;
  if (!finite(maxDegree) || maxDegree < 1) return null;
  if (!Array.isArray(epochs) || epochs.length < 2) return null;
  if (!Array.isArray(coeffs) || !Array.isArray(sv)) return null;

  const expected = coefficientCount(maxDegree);
  if (sv.length !== expected) return null;
  if (coeffs.length !== epochs.length) return null;
  for (const row of coeffs) {
    if (!Array.isArray(row) || row.length !== expected) return null;
    for (const v of row) if (!finite(v)) return null;
  }
  for (const v of sv) if (!finite(v)) return null;
  for (const v of epochs) if (!finite(v)) return null;
  // must be ordered, or interpolation is meaningless
  for (let i = 1; i < epochs.length; i++) {
    if (!(epochs[i] > epochs[i - 1])) return null;
  }

  const validFrom = finite(r.validFrom) ? r.validFrom : epochs[0];
  const validTo = finite(r.validTo) ? r.validTo : epochs[epochs.length - 1] + 5;
  if (!(validTo > validFrom)) return null;

  return {
    model: typeof r.model === "string" ? r.model : "IGRF",
    credit: typeof r.credit === "string" ? r.credit : "",
    source: typeof r.source === "string" ? r.source : "",
    maxDegree,
    svMaxDegree: finite(r.svMaxDegree) ? r.svMaxDegree : maxDegree,
    epochs: epochs as number[],
    validFrom,
    validTo,
    coeffs: coeffs as number[][],
    sv: sv as number[],
  };
}

/** Number of Gauss coefficients up to a given degree: sum of 2n+1. */
export function coefficientCount(maxDegree: number): number {
  if (!finite(maxDegree) || maxDegree < 1) return 0;
  let n = 0;
  for (let d = 1; d <= Math.floor(maxDegree); d++) n += 2 * d + 1;
  return n;
}

/**
 * The coefficients at an arbitrary date.
 *
 * Between epochs: linear interpolation, which is the definition IGRF itself
 * specifies rather than a convenience. After the last epoch: the published
 * secular variation column, straight-lined forward. That is exactly what the
 * official 2030 epoch contains, so this reproduces the reference implementation
 * rather than approximating it.
 *
 * Outside the validity window it returns null. A model asked about 1850 or 2100
 * should refuse, not extrapolate a century of core dynamics off a five-year
 * trend.
 */
export function coefficientsAt(model: IgrfModel | null, year: number): number[] | null {
  if (!model || !finite(year)) return null;
  if (year < model.validFrom || year > model.validTo) return null;

  const { epochs, coeffs } = model;
  const last = epochs.length - 1;

  if (year >= epochs[last]) {
    const dt = year - epochs[last];
    return coeffs[last].map((c, i) => c + model.sv[i] * dt);
  }

  let hi = 1;
  while (hi < last && epochs[hi] < year) hi++;
  const lo = hi - 1;
  const span = epochs[hi] - epochs[lo];
  const w = span > 0 ? (year - epochs[lo]) / span : 0;
  return coeffs[lo].map((c, i) => c + (coeffs[hi][i] - c) * w);
}

// ─────────────────────────────── the synthesis ───────────────────────────────

export interface MagneticField {
  /** north component, nT */
  x: number;
  /** east component, nT */
  y: number;
  /** vertically DOWN component, nT. Positive in the northern hemisphere. */
  z: number;
  /** horizontal intensity, nT: what actually turns a compass needle */
  h: number;
  /** total intensity, nT */
  f: number;
  /** degrees east of true north. The compass error. */
  declination: number;
  /** degrees below horizontal. 90 at the north dip pole. */
  inclination: number;
}

/**
 * Everything about the expansion that depends only on its DEGREE, worked out
 * once and kept.
 *
 * The recursion constants are square roots, and the synthesis needs 195 of them
 * per point. Recomputing them per point cost more than the field did.
 */
interface DegreeTables {
  maxDegree: number;
  /** number of coefficients */
  n: number;
  /** triangular index -> Schmidt sectoral factor sqrt((2d-1)/(2d)) */
  sectoral: Float64Array;
  /** triangular index -> (2d-1) */
  c1: Float64Array;
  /** triangular index -> sqrt((d-1)^2 - m^2) */
  c2: Float64Array;
  /** triangular index -> 1 / sqrt(d^2 - m^2) */
  invDen: Float64Array;
  /** flat coefficient index -> degree n */
  degreeOf: Int32Array;
  /** flat coefficient index -> order m */
  orderOf: Int32Array;
  /** scratch, triangular */
  P: Float64Array;
  dP: Float64Array;
  /** scratch, flat */
  p: Float64Array;
  dp: Float64Array;
  /** scratch, cos and sin of m * longitude for m = 0..maxDegree */
  cosM: Float64Array;
  sinM: Float64Array;
}

const triIndex = (d: number, m: number) => (d * (d + 1)) / 2 + m;

function buildTables(maxDegree: number): DegreeTables {
  const size = ((maxDegree + 1) * (maxDegree + 2)) / 2;
  const n = coefficientCount(maxDegree);
  const t: DegreeTables = {
    maxDegree,
    n,
    sectoral: new Float64Array(size),
    c1: new Float64Array(size),
    c2: new Float64Array(size),
    invDen: new Float64Array(size),
    degreeOf: new Int32Array(n),
    orderOf: new Int32Array(n),
    P: new Float64Array(size),
    dP: new Float64Array(size),
    p: new Float64Array(n),
    dp: new Float64Array(n),
    cosM: new Float64Array(maxDegree + 1),
    sinM: new Float64Array(maxDegree + 1),
  };
  for (let d = 1; d <= maxDegree; d++) {
    for (let m = 0; m <= d; m++) {
      const i = triIndex(d, m);
      t.sectoral[i] = d === 1 ? 1 : Math.sqrt((2 * d - 1) / (2 * d));
      t.c1[i] = 2 * d - 1;
      t.c2[i] = Math.sqrt((d - 1) * (d - 1) - m * m);
      t.invDen[i] = 1 / Math.sqrt(d * d - m * m);
    }
  }
  let i = 0;
  for (let d = 1; d <= maxDegree; d++) {
    t.degreeOf[i] = d;
    t.orderOf[i] = 0;
    i++;
    for (let m = 1; m <= d; m++) {
      t.degreeOf[i] = d;
      t.orderOf[i] = m;
      i++;
      t.degreeOf[i] = d;
      t.orderOf[i] = m;
      i++;
    }
  }
  return t;
}

/**
 * One set of tables and scratch buffers, cached by degree.
 *
 * The declination map runs about thirty thousand syntheses in a single pass, so
 * this is the difference between a map that appears and a map that stalls the
 * page. JavaScript here is single threaded and there is no await inside the
 * synthesis, so sharing the buffers is safe.
 */
let tables: DegreeTables | null = null;

function tablesFor(maxDegree: number): DegreeTables | null {
  if (!finite(maxDegree) || maxDegree < 1 || maxDegree > 60) return null;
  const d = Math.floor(maxDegree);
  if (!tables || tables.maxDegree !== d) tables = buildTables(d);
  return tables;
}

/**
 * Schmidt semi-normalised associated Legendre functions and their derivatives
 * with respect to colatitude, by the standard recursions, written into the
 * cached scratch buffers in coefficient order.
 */
function legendreInto(t: DegreeTables, colatRad: number): void {
  const ct = Math.cos(colatRad);
  const st = Math.sin(colatRad);
  const { P, dP, maxDegree } = t;

  P[0] = 1;
  dP[0] = 0;

  for (let d = 1; d <= maxDegree; d++) {
    for (let m = 0; m <= d; m++) {
      const i = triIndex(d, m);
      if (d === m) {
        const prev = triIndex(d - 1, d - 1);
        const k = t.sectoral[i];
        P[i] = st * k * P[prev];
        dP[i] = k * (st * dP[prev] + ct * P[prev]);
      } else {
        const prev = triIndex(d - 1, m);
        const has2 = d - 2 >= m;
        const prev2 = has2 ? triIndex(d - 2, m) : 0;
        const p2 = has2 ? P[prev2] : 0;
        const d2 = has2 ? dP[prev2] : 0;
        P[i] = (t.c1[i] * ct * P[prev] - t.c2[i] * p2) * t.invDen[i];
        dP[i] = (t.c1[i] * (ct * dP[prev] - st * P[prev]) - t.c2[i] * d2) * t.invDen[i];
      }
    }
  }

  for (let k = 0; k < t.n; k++) {
    const i = triIndex(t.degreeOf[k], t.orderOf[k]);
    t.p[k] = P[i];
    t.dp[k] = dP[i];
  }
}

/**
 * cos(m * lon) and sin(m * lon) for every order at once, by angle addition.
 *
 * The first version called Math.cos and Math.sin inside the (n, m) loop, which
 * is about 180 trig calls per point and was the single largest cost in the whole
 * tab: the world map took 1.7 seconds. Two trig calls and a recursion give the
 * same numbers to the last few bits, and the frozen reference values in the test
 * file are what proves that rather than an assurance here.
 */
function azimuthInto(t: DegreeTables, lonRad: number): void {
  const c = Math.cos(lonRad);
  const s = Math.sin(lonRad);
  t.cosM[0] = 1;
  t.sinM[0] = 0;
  if (t.maxDegree >= 1) {
    t.cosM[1] = c;
    t.sinM[1] = s;
  }
  for (let m = 2; m <= t.maxDegree; m++) {
    // cos(m x) = cos((m-1)x) cos x - sin((m-1)x) sin x, and likewise for sin
    t.cosM[m] = t.cosM[m - 1] * c - t.sinM[m - 1] * s;
    t.sinM[m] = t.sinM[m - 1] * c + t.cosM[m - 1] * s;
  }
}

/** Geodetic latitude and altitude to geocentric radius and colatitude. */
function geodeticToGeocentric(
  latDeg: number,
  altKm: number
): { radiusKm: number; colatRad: number; sd: number; cd: number } {
  const gdColat = (90 - latDeg) * DEG;
  const a = WGS84_EQUATORIAL_KM;
  const b = a * (1 - WGS84_FLATTENING);
  const ct = Math.cos(gdColat);
  const st = Math.sin(gdColat);
  const a2 = a * a;
  const a4 = a2 * a2;
  const b2 = b * b;
  const b4 = b2 * b2;
  const c2 = ct * ct;
  const s2 = 1 - c2;
  const rho = Math.sqrt(a2 * s2 + b2 * c2);
  const radiusKm = Math.sqrt(altKm * (altKm + 2 * rho) + (a4 * s2 + b4 * c2) / (rho * rho));
  const cd = (altKm + rho) / radiusKm;
  const sd = ((a2 - b2) * ct * st) / (rho * radiusKm);
  const cthc = ct * cd - st * sd;
  return { radiusKm, colatRad: Math.acos(Math.max(-1, Math.min(1, cthc))), sd, cd };
}

/**
 * The field at a place and a date.
 *
 * Geodetic latitude and longitude in degrees, altitude in km above the WGS84
 * ellipsoid, decimal year. Returns null outside the model's validity window or
 * for nonsense coordinates, never a number it cannot stand behind.
 */
export function fieldAt(
  model: IgrfModel | null,
  latDeg: number,
  lonDeg: number,
  altKm: number,
  year: number
): MagneticField | null {
  if (!model) return null;
  const coeffs = coefficientsAt(model, year);
  if (!coeffs) return null;
  return fieldFromCoefficients(coeffs, model.maxDegree, latDeg, lonDeg, altKm);
}

/**
 * The same synthesis, from coefficients the caller already has.
 *
 * This exists for one reason: a map. Drawing declination over the whole world
 * means tens of thousands of syntheses at ONE date, and interpolating the 195
 * coefficients afresh inside every one of them is pure waste. fieldAt is this
 * function plus that one interpolation, so there is no second copy of the
 * physics.
 *
 * Worth recording what the measurements actually said, because the guess was
 * wrong. Hoisting the interpolation out was expected to be the win and bought
 * only about 15% (1716 ms to a whole-world pass of 28,800 points). The real cost
 * was trigonometry: roughly 180 calls to Math.cos and Math.sin per point inside
 * the order loop. Computing cos(m*lon) and sin(m*lon) once by angle addition,
 * caching the recursion constants, and building (a/r)^(n+2) incrementally took
 * the same pass to 552 ms. Profile before optimising, even when the allocation
 * is right there being obviously wasteful.
 */
export function fieldFromCoefficients(
  coeffs: readonly number[],
  maxDegree: number,
  latDeg: number,
  lonDeg: number,
  altKm: number
): MagneticField | null {
  if (!Array.isArray(coeffs) && !(coeffs instanceof Float64Array)) return null;
  if (!finite(maxDegree) || maxDegree < 1) return null;
  if (coeffs.length !== coefficientCount(maxDegree)) return null;
  if (!finite(latDeg) || !finite(lonDeg) || !finite(altKm)) return null;
  if (latDeg < -90 || latDeg > 90) return null;
  if (altKm < -10 || altKm > 60000) return null;

  // The azimuthal component carries a 1/sin(colatitude), which is singular
  // exactly at the poles. Nudging by a millionth of a degree keeps the
  // arithmetic finite and is far below the accuracy of the model itself.
  const lat = Math.abs(latDeg) > 89.999999 ? Math.sign(latDeg) * 89.999999 : latDeg;

  const t = tablesFor(maxDegree);
  if (!t) return null;

  const { radiusKm, colatRad, sd, cd } = geodeticToGeocentric(lat, altKm);
  legendreInto(t, colatRad);
  azimuthInto(t, lonDeg * DEG);

  const st = Math.sin(colatRad);
  const ratio = IGRF_REFERENCE_RADIUS_KM / radiusKm;
  const { p, dp, cosM, sinM } = t;

  let br = 0;
  let bt = 0;
  let bp = 0;

  // (a/r)^(n+2), built up rather than raised to a power each degree
  let rn = ratio * ratio * ratio;

  let i = 0;
  for (let n = 1; n <= maxDegree; n++) {
    // m = 0: no h term, and no longitude dependence
    br += (n + 1) * rn * coeffs[i] * p[i];
    bt += -rn * coeffs[i] * dp[i];
    i++;
    for (let m = 1; m <= n; m++) {
      const g = coeffs[i];
      const h = coeffs[i + 1];
      const cosm = cosM[m];
      const sinm = sinM[m];
      const term = g * cosm + h * sinm;
      br += (n + 1) * rn * term * p[i];
      bt += -rn * term * dp[i];
      bp += (rn * m * (g * sinm - h * cosm) * p[i]) / st;
      i += 2;
    }
    rn *= ratio;
  }

  // geocentric spherical components to local north, east and down
  let x = -bt;
  const y = bp;
  let z = -br;
  // rotate back into the geodetic frame
  const xWas = x;
  x = x * cd + z * sd;
  z = z * cd - xWas * sd;

  const h = Math.sqrt(x * x + y * y);
  const f = Math.sqrt(h * h + z * z);

  return {
    x,
    y,
    z,
    h,
    f,
    declination: Math.atan2(y, x) / DEG,
    inclination: Math.atan2(z, h) / DEG,
  };
}

/**
 * How fast the field is changing at a place, per year.
 *
 * IGRF's coefficients are piecewise linear in time, so the rate is a constant
 * within each five-year block and jumps at the boundaries. This differences the
 * field half a year either side of the date, which reports the rate of the
 * block the date sits in, and refuses rather than straddling if either side
 * falls outside the model.
 */
export function annualChange(
  model: IgrfModel | null,
  latDeg: number,
  lonDeg: number,
  altKm: number,
  year: number
): { declination: number; inclination: number; f: number; h: number } | null {
  const a = fieldAt(model, latDeg, lonDeg, altKm, year - 0.5);
  const b = fieldAt(model, latDeg, lonDeg, altKm, year + 0.5);
  if (!a || !b) return null;
  // declination wraps: take the shorter way round
  let dd = b.declination - a.declination;
  if (dd > 180) dd -= 360;
  if (dd < -180) dd += 360;
  return {
    declination: dd,
    inclination: b.inclination - a.inclination,
    f: b.f - a.f,
    h: b.h - a.h,
  };
}

// ──────────────────────────────── the poles ──────────────────────────────────

export interface Pole {
  latDeg: number;
  lonDeg: number;
  year: number;
}

/**
 * The GEOMAGNETIC pole: where the axis of the best-fit central dipole meets the
 * surface. A closed form in the first three coefficients, and the pole the
 * auroral oval is centred on.
 *
 * Geocentric latitude, matching how NOAA quotes it.
 */
export function geomagneticPole(model: IgrfModel | null, year: number): Pole | null {
  const c = coefficientsAt(model, year);
  if (!c) return null;
  const [g10, g11, h11] = c;
  const m = Math.sqrt(g10 * g10 + g11 * g11 + h11 * h11);
  if (!(m > 0)) return null;
  // g10 is negative, so -g10/m is positive and the pole is northern.
  const colat = Math.acos(Math.max(-1, Math.min(1, -g10 / m))) / DEG;
  let lon = Math.atan2(h11, g11) / DEG;
  // The dipole axis points at the SOUTH geomagnetic pole in this convention, so
  // the northern end is the antipodal longitude.
  lon = lon <= 0 ? lon + 180 : lon - 180;
  return { latDeg: 90 - colat, lonDeg: lon, year };
}

/** The angle between the dipole axis and the rotation axis. */
export function dipoleTilt(model: IgrfModel | null, year: number): number | null {
  const p = geomagneticPole(model, year);
  return p ? 90 - p.latDeg : null;
}

/**
 * The dipole moment in units of 10^22 A m^2.
 *
 * This is the number behind "the field is weakening": it has fallen by about a
 * tenth since 1900, which is fast for a core process and slow for a headline.
 */
export function dipoleMoment(model: IgrfModel | null, year: number): number | null {
  const c = coefficientsAt(model, year);
  if (!c) return null;
  const [g10, g11, h11] = c;
  const m = Math.sqrt(g10 * g10 + g11 * g11 + h11 * h11); // nT
  const a = IGRF_REFERENCE_RADIUS_KM * 1000; // m
  const mu0 = 4e-7 * Math.PI;
  const moment = (4 * Math.PI * a * a * a * m * 1e-9) / mu0;
  return moment / 1e22;
}

/**
 * Move from a point by a distance in the local north and east directions.
 *
 * Done as a proper spherical offset rather than by adding degrees, because the
 * dip-pole search runs inside a few degrees of the geographic pole, where
 * "add 1 degree of longitude" means something different every step and walking
 * ACROSS the pole (which the search does) breaks a naive lat/lon update
 * outright.
 */
function offsetKm(
  latDeg: number,
  lonDeg: number,
  northKm: number,
  eastKm: number
): { latDeg: number; lonDeg: number } {
  const R = 6371.0088;
  const d = Math.hypot(northKm, eastKm);
  if (d === 0) return { latDeg, lonDeg };
  const bearing = Math.atan2(eastKm, northKm);
  const delta = d / R;
  const lat1 = latDeg * DEG;
  const lon1 = lonDeg * DEG;
  const sinLat2 =
    Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(bearing);
  const lat2 = Math.asin(Math.max(-1, Math.min(1, sinLat2)));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * sinLat2
    );
  return { latDeg: lat2 / DEG, lonDeg: wrapLon(lon2 / DEG) };
}

/**
 * The DIP pole: where the field is vertical, so the horizontal component is
 * zero and a compass needle has no direction left to point.
 *
 * Two stages, and the first one is not optional. A coarse sweep of the polar cap
 * brackets the zero, then a Newton search on (X, Y) = (0, 0) converges on it.
 * Starting Newton from the geomagnetic pole instead, which was the first thing
 * tried here, fails: in 2025 the two are about 700 km apart with the geographic
 * pole in between, and a linearised step that has to cross the pole is not a
 * step the linearisation describes.
 *
 * Returns null if the search does not converge, because a pole position that
 * has not converged is not a pole position.
 *
 * This needs all 195 coefficients, unlike the geomagnetic pole which needs
 * three. The dip poles are not antipodal and never have been: the northern one
 * is currently near 86 N and the southern near 64 S, which is by itself a
 * decent argument that "the Earth is a bar magnet" is a teaching aid rather
 * than a description.
 */
export function dipPole(
  model: IgrfModel | null,
  year: number,
  hemisphere: "north" | "south",
  seed?: Pole | null
): Pole | null {
  if (!model) return null;
  if (!coefficientsAt(model, year)) return null;

  const sign = hemisphere === "north" ? 1 : -1;
  let lat: number;
  let lon: number;

  if (seed && Math.sign(seed.latDeg) === sign) {
    // Walking a track: the previous epoch's pole is within a few hundred km.
    lat = seed.latDeg;
    lon = seed.lonDeg;
  } else {
    // Coarse sweep of the polar cap to bracket the zero in H.
    let bestH = Infinity;
    lat = sign * 80;
    lon = 0;
    for (let dLat = 50; dLat <= 89; dLat += 2) {
      for (let dLon = -180; dLon < 180; dLon += 5) {
        const f = fieldAt(model, sign * dLat, dLon, 0, year);
        if (f && f.h < bestH) {
          bestH = f.h;
          lat = sign * dLat;
          lon = dLon;
        }
      }
    }
    if (!Number.isFinite(bestH)) return null;
  }

  const step = 20; // km, for the finite-difference Jacobian

  for (let iter = 0; iter < 60; iter++) {
    const f0 = fieldAt(model, lat, lon, 0, year);
    if (!f0) return null;
    if (f0.h < 0.2) break; // a fifth of a nanotesla: converged by any standard

    const north = offsetKm(lat, lon, step, 0);
    const east = offsetKm(lat, lon, 0, step);
    const fN = fieldAt(model, north.latDeg, north.lonDeg, 0, year);
    const fE = fieldAt(model, east.latDeg, east.lonDeg, 0, year);
    if (!fN || !fE) return null;

    // Jacobian of (X, Y) with respect to (north km, east km)
    const j11 = (fN.x - f0.x) / step;
    const j12 = (fE.x - f0.x) / step;
    const j21 = (fN.y - f0.y) / step;
    const j22 = (fE.y - f0.y) / step;
    const det = j11 * j22 - j12 * j21;
    if (!finite(det) || Math.abs(det) < 1e-15) return null;

    let dn = (-f0.x * j22 + f0.y * j12) / det;
    let de = (-f0.y * j11 + f0.x * j21) / det;

    // A step longer than 600 km means the linearisation does not describe the
    // ground it would cover; shorten it rather than jumping across the planet.
    const len = Math.hypot(dn, de);
    if (!finite(len)) return null;
    if (len > 600) {
      dn *= 600 / len;
      de *= 600 / len;
    }

    const next = offsetKm(lat, lon, dn, de);
    lat = next.latDeg;
    lon = next.lonDeg;
  }

  const final = fieldAt(model, lat, lon, 0, year);
  if (!final || final.h > 2) return null; // did not converge
  // The northern dip pole must be in the northern hemisphere. If a search ever
  // walks over the top and settles on the other one, that is a bug, not a find.
  if (sign > 0 && lat < 45) return null;
  if (sign < 0 && lat > -45) return null;
  return { latDeg: lat, lonDeg: wrapLon(lon), year };
}

function clampLat(v: number): number {
  return Math.max(-89.99, Math.min(89.99, v));
}

function wrapLon(v: number): number {
  let x = v;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}

export interface PoleTrack {
  poles: Pole[];
  /** great-circle km between consecutive entries, divided by the years between */
  speedKmPerYear: Array<number | null>;
}

/**
 * The pole's path through a span of years, with its speed.
 *
 * The speed is the interesting part. The north dip pole crawled through the
 * Canadian Arctic for most of the 20th century and then accelerated to several
 * times that rate, heading for Siberia. That acceleration is in the data, not
 * in the commentary.
 */
export function poleTrack(
  model: IgrfModel | null,
  hemisphere: "north" | "south",
  stepYears = 5
): PoleTrack {
  if (!model || !finite(stepYears) || stepYears <= 0) {
    return { poles: [], speedKmPerYear: [] };
  }
  const poles: Pole[] = [];
  let seed: Pole | null = null;
  for (let y = model.validFrom; y <= model.validTo + 1e-9; y += stepYears) {
    // Each epoch starts from the last one: the pole moves tens of km a year, so
    // the previous position is a far better starting point than a fresh sweep,
    // and the answer is identical because Newton converges to the same zero.
    const p = dipPole(model, Math.min(y, model.validTo), hemisphere, seed);
    if (p) {
      poles.push(p);
      seed = p;
    }
  }
  const speedKmPerYear: Array<number | null> = poles.map((p, i) => {
    if (i === 0) return null;
    const prev = poles[i - 1];
    const dt = p.year - prev.year;
    if (!(dt > 0)) return null;
    return greatCircleKm(prev.latDeg, prev.lonDeg, p.latDeg, p.lonDeg) / dt;
  });
  return { poles, speedKmPerYear };
}

/** Great-circle distance on the mean-radius sphere, km. */
function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0088;
  const p1 = lat1 * DEG;
  const p2 = lat2 * DEG;
  const dp = p2 - p1;
  const dl = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// ───────────────────────────── the weak spot ─────────────────────────────────

export interface FieldExtreme {
  latDeg: number;
  lonDeg: number;
  /** total intensity there, nT */
  f: number;
  year: number;
}

/**
 * The weakest place in the field at the surface: the South Atlantic Anomaly.
 *
 * A coarse sweep to find the basin, then a local refinement. It is worth
 * computing rather than quoting, because the answer moves: the anomaly has been
 * deepening and drifting west, and satellites passing through it take more
 * radiation hits than anywhere else in low orbit. What it is NOT is a hole, a
 * crack, or evidence that a reversal is imminent.
 */
export function weakestField(
  model: IgrfModel | null,
  year: number,
  altKm = 0
): FieldExtreme | null {
  if (!model) return null;
  let best: FieldExtreme | null = null;

  const consider = (lat: number, lon: number) => {
    const f = fieldAt(model, lat, lon, altKm, year);
    if (!f) return;
    if (!best || f.f < best.f) best = { latDeg: lat, lonDeg: wrapLon(lon), f: f.f, year };
  };

  for (let lat = -85; lat <= 85; lat += 5) {
    for (let lon = -180; lon < 180; lon += 5) consider(lat, lon);
  }
  if (!best) return null;

  for (const stepDeg of [2, 0.5, 0.125]) {
    const b = best as FieldExtreme;
    for (let dLat = -2; dLat <= 2; dLat++) {
      for (let dLon = -2; dLon <= 2; dLon++) {
        consider(
          Math.max(-89, Math.min(89, b.latDeg + dLat * stepDeg)),
          b.lonDeg + dLon * stepDeg
        );
      }
    }
  }
  return best;
}

// ──────────────────────────── compass arithmetic ─────────────────────────────

/**
 * True bearing from a compass reading, which is the entire practical point of
 * declination: add it.
 *
 * A bearing walked without this correction drifts sideways by roughly its
 * declination in degrees, about 1.7% of the distance travelled per degree. Over
 * ten kilometres at 14 degrees west that is more than two kilometres off.
 */
export function trueBearing(compassBearing: number, declination: number): number | null {
  if (!finite(compassBearing) || !finite(declination)) return null;
  return ((((compassBearing + declination) % 360) + 360) % 360);
}

/** How far sideways an uncorrected bearing lands, km, after travelling km. */
export function driftKm(distanceKm: number, declination: number): number | null {
  if (!finite(distanceKm) || !finite(declination) || distanceKm < 0) return null;
  return 2 * distanceKm * Math.sin((Math.abs(declination) * DEG) / 2);
}

/** "14.0 degrees west" rather than "-14.0", because that is how charts read it. */
export function formatDeclination(declination: number | null): string {
  if (!finite(declination)) return "unknown";
  const a = Math.abs(declination);
  if (a < 0.05) return "0.0 degrees, true north";
  return `${a.toFixed(1)} degrees ${declination > 0 ? "east" : "west"}`;
}

// ─────────────────────────────── honesty copy ────────────────────────────────

export const MODEL_NOTE =
  "IGRF is a model, not a measurement of your street. It is fitted to satellite missions and about 150 ground observatories, then expressed as 195 numbers per epoch, which this page turns back into a field. Everything on this tab is computed from those numbers here in the browser: nothing is a lookup of a published answer.";

export const CRUSTAL_NOTE =
  "The limit that matters most: degree 13 means the shortest wavelength the model can describe is around 3,000 km, so the magnetised rock under your feet is not in it at all. Over volcanic ground the real declination can be several degrees away from this figure, and no amount of arithmetic here would reveal that. IGRF describes the field of the core, accurately, and is silent about the ground.";

export const THREE_POLES_NOTE =
  "There are three north poles and they are routinely confused. The geographic pole is where the rotation axis emerges. The geomagnetic pole is where the best-fit central dipole axis emerges, near 80.8 N, and it is the one the auroral oval is centred on. The dip pole is where the field is actually vertical, near 86 N, and it needs all 195 coefficients to find. Your compass points at none of them: it follows the local horizontal field along a curved field line.";

export const DAILY_VARIATION_NOTE =
  "This is a quiet-day average. The real field at a point wobbles by tens of nanotesla over a day as the ionosphere heats and cools, and by hundreds during a magnetic storm, which is the same disturbance the aurora tab is watching. A survey-grade compass bearing is taken with that in mind; IGRF cannot supply it.";

export const EXTRAPOLATION_NOTE =
  "Past the last epoch the model is a straight line by construction: the published secular variation carried forward at a constant rate. That is why a generation of IGRF is only valid for five years beyond its last epoch, and why asking this page about 2040 returns nothing instead of a number.";

export const NO_REVERSAL_NOTE =
  "The dipole has weakened by about a tenth since 1900, and that is genuinely fast for a core process. It is not a countdown. Reversals take thousands of years, the field has had excursions of this size before without reversing, and the present rate says nothing reliable about whether one is starting. This tab reports the measured decline and stops there.";

export const SAA_NOTE =
  "The South Atlantic Anomaly is the weakest region of the surface field, and it is a real operational problem: spacecraft crossing it absorb more radiation and some instruments are safed. It is not a hole in the field, not a crack, and not an opening. It is a broad patch where the total intensity is roughly a third below the global average.";

export const DIP_POLE_SPEED_NOTE =
  "The north dip pole spent most of the 20th century drifting slowly across the Canadian Arctic and then sped up sharply, crossing the date line and heading toward Siberia. The acceleration is in the coefficients, and this page computes the pole from them for every epoch rather than quoting a table of positions.";
