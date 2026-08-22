/**
 * Sea level, measured two incompatible ways.
 *
 * THE LOAD-BEARING IDEA of this tab is that there is no single quantity called
 * "sea level", and the two instruments that measure it are answering different
 * questions.
 *
 * A SATELLITE ALTIMETER measures the height of the sea surface against the
 * centre of the Earth. It has covered almost the whole ocean since 1992 and the
 * global mean it reports is rising a little over 3 mm a year.
 *
 * A TIDE GAUGE measures the height of the sea against the land it is bolted to.
 * Some of those records reach back to 1807. And the land moves: Scandinavia is
 * still springing back from an ice sheet that left ten thousand years ago, while
 * Manila is sinking because the groundwater under it was pumped out. So the same
 * ocean, in the same decades, gives Skagway about MINUS 18 mm a year and Manila
 * about plus 13.
 *
 * Neither instrument is wrong. Almost every argument about local sea level is
 * really an argument about which of the two somebody meant, and a person asking
 * "will my street flood" wants the gauge, not the satellite.
 *
 * THE SECOND IDEA is that even the global number is a set of choices. NOAA
 * publishes the same measurements four ways: with the seasonal cycle removed or
 * retained, over 66S to 66N or over the reference missions' own coverage. Those
 * choices move the trend by two percent. And the number everyone quotes usually
 * carries a GLACIAL ISOSTATIC ADJUSTMENT of about +0.3 mm a year on top, because
 * the ocean basins themselves are still deepening; NOAA's published figure here
 * does not include it, and says so.
 *
 * THE THIRD is that the 33-year record is five satellites, and where two of them
 * flew at once they disagreed by one to two millimetres on the global mean. The
 * signal being measured is about 3 mm a year. This module computes that
 * disagreement rather than describing it.
 *
 * Sources
 *   NOAA Laboratory for Satellite Altimetry global mean sea level.
 *   Permanent Service for Mean Sea Level, Revised Local Reference annual means.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * The GIA correction commonly added to altimeter trends, mm/yr.
 *
 * Not applied here, on purpose. It is a model output rather than a measurement,
 * it answers a different question from the one the altimeter answers, and the
 * tab shows both numbers with the difference named.
 */
export const GIA_CORRECTION_MM_PER_YEAR = 0.3;

/** PSMSL values sit about this far above zero by construction, in mm. */
export const RLR_DATUM_OFFSET_MM = 7000;

export type VariantId = "free_all_66" | "keep_all_66" | "free_ref_90" | "keep_ref_90";

export interface GlobalVariant {
  id: VariantId;
  /** NOAA's own trend from the file header, mm/yr, without GIA */
  publishedTrendMmPerYear: number;
  /** "removed" or "retained" */
  seasonal: string;
  domain: string;
  missions: string[];
  /** merged series: the mean of whatever missions were reporting */
  time: number[];
  value: number[];
  /** per-mission series, for drawing the relay */
  perMission: Array<{ mission: string; time: number[]; value: number[] }>;
  overlaps: MissionOverlap[];
  gaps: Record<string, { gaps: number; largestGapDays: number }>;
}

export interface MissionOverlap {
  missions: [string, string];
  from: number;
  to: number;
  samples: number;
  meanAbsDifferenceMm: number;
  maxAbsDifferenceMm: number;
}

export interface Gauge {
  id: number;
  name: string;
  country: string;
  /** why this station is in the curated set */
  why: string;
  lat: number;
  lon: number;
  years: number[];
  /** mm about an arbitrary local datum; null for a missing year */
  value: Array<number | null>;
  firstYear: number;
  lastYear: number;
}

export interface SeaLevelData {
  global: Partial<Record<VariantId, GlobalVariant>>;
  gauges: Gauge[];
  generated: Date | null;
  credit: { altimetry: string; gauges: string };
}

const VARIANT_IDS: VariantId[] = ["free_all_66", "keep_all_66", "free_ref_90", "keep_ref_90"];

/** Bad input gives an empty record rather than a half-built one. */
export function parseSeaLevel(raw: unknown): SeaLevelData {
  const empty: SeaLevelData = {
    global: {},
    gauges: [],
    generated: null,
    credit: { altimetry: "", gauges: "" },
  };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;

  const time = Array.isArray(r.time) ? r.time.filter(finite) : [];
  if (time.length < 10) return empty;
  for (let i = 1; i < time.length; i++) if (!(time[i] > time[i - 1])) return empty;

  const missionIndex = (r.missionIndex ?? {}) as Record<string, unknown>;
  const missionOrder = Array.isArray(r.missionOrder)
    ? (r.missionOrder as unknown[]).filter((m): m is string => typeof m === "string")
    : [];

  const global: Partial<Record<VariantId, GlobalVariant>> = {};
  const rawGlobal = (r.global ?? {}) as Record<string, unknown>;
  for (const id of VARIANT_IDS) {
    const v = parseVariant(id, rawGlobal[id], time, missionIndex, missionOrder);
    if (v) global[id] = v;
  }

  const gauges: Gauge[] = [];
  if (Array.isArray(r.gauges)) {
    for (const g of r.gauges) {
      const parsed = parseGauge(g);
      if (parsed) gauges.push(parsed);
    }
  }

  const credit = (r.credit ?? {}) as Record<string, unknown>;

  return {
    global,
    gauges,
    generated:
      typeof r.generated === "string" && !Number.isNaN(Date.parse(r.generated))
        ? new Date(r.generated)
        : null,
    credit: {
      altimetry: typeof credit.altimetry === "string" ? credit.altimetry : "",
      gauges: typeof credit.gauges === "string" ? credit.gauges : "",
    },
  };
}

function parseVariant(
  id: VariantId,
  raw: unknown,
  time: number[],
  missionIndex: Record<string, unknown>,
  missionOrder: string[]
): GlobalVariant | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!finite(r.publishedTrendMmPerYear)) return null;

  const missionValue = (r.missionValue ?? {}) as Record<string, unknown>;
  const perMission: GlobalVariant["perMission"] = [];

  // Rebuild each mission's series from the shared index and its own values.
  for (const mission of missionOrder) {
    const idx = missionIndex[mission];
    const vals = missionValue[mission];
    if (!Array.isArray(idx) || !Array.isArray(vals)) continue;
    if (idx.length !== vals.length) return null;
    const t: number[] = [];
    const v: number[] = [];
    for (let i = 0; i < idx.length; i++) {
      const j = idx[i];
      if (!finite(j) || j < 0 || j >= time.length) return null;
      if (!finite(vals[i])) continue;
      t.push(time[j]);
      v.push(vals[i] as number);
    }
    if (t.length > 0) perMission.push({ mission, time: t, value: v });
  }
  if (perMission.length < 2) return null;

  // The merged series is the mean of whatever was reporting at each sample. Not
  // shipped in the payload, because it is these numbers a second time.
  const sums = new Float64Array(time.length);
  const counts = new Int32Array(time.length);
  for (const mission of missionOrder) {
    const idx = missionIndex[mission];
    const vals = missionValue[mission];
    if (!Array.isArray(idx) || !Array.isArray(vals)) continue;
    for (let i = 0; i < idx.length; i++) {
      const j = idx[i] as number;
      if (!finite(j) || !finite(vals[i])) continue;
      sums[j] += vals[i] as number;
      counts[j] += 1;
    }
  }
  const mergedTime: number[] = [];
  const mergedValue: number[] = [];
  for (let j = 0; j < time.length; j++) {
    if (counts[j] === 0) continue;
    mergedTime.push(time[j]);
    mergedValue.push(sums[j] / counts[j]);
  }
  if (mergedTime.length < 10) return null;

  const overlaps: MissionOverlap[] = [];
  if (Array.isArray(r.overlaps)) {
    for (const o of r.overlaps) {
      if (!o || typeof o !== "object") continue;
      const x = o as Record<string, unknown>;
      if (!Array.isArray(x.missions) || x.missions.length !== 2) continue;
      if (!finite(x.meanAbsDifferenceMm) || !finite(x.from) || !finite(x.to)) continue;
      overlaps.push({
        missions: [String(x.missions[0]), String(x.missions[1])],
        from: x.from,
        to: x.to,
        samples: finite(x.samples) ? x.samples : 0,
        meanAbsDifferenceMm: x.meanAbsDifferenceMm,
        maxAbsDifferenceMm: finite(x.maxAbsDifferenceMm) ? x.maxAbsDifferenceMm : 0,
      });
    }
  }

  const gaps: GlobalVariant["gaps"] = {};
  const rawGaps = (r.missionGaps ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(rawGaps)) {
    if (!v || typeof v !== "object") continue;
    const x = v as Record<string, unknown>;
    gaps[k] = {
      gaps: finite(x.gaps) ? x.gaps : 0,
      largestGapDays: finite(x.largestGapDays) ? x.largestGapDays : 0,
    };
  }

  return {
    id,
    publishedTrendMmPerYear: r.publishedTrendMmPerYear,
    seasonal: typeof r.seasonal === "string" ? r.seasonal : "",
    domain: typeof r.domain === "string" ? r.domain : "",
    missions: Array.isArray(r.missions)
      ? (r.missions as unknown[]).map(String)
      : perMission.map((p) => p.mission),
    time: mergedTime,
    value: mergedValue,
    perMission,
    overlaps,
    gaps,
  };
}

function parseGauge(raw: unknown): Gauge | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!finite(r.id) || typeof r.name !== "string") return null;
  if (!Array.isArray(r.years) || !Array.isArray(r.value)) return null;
  if (r.years.length !== r.value.length || r.years.length === 0) return null;
  if (!finite(r.lat) || !finite(r.lon)) return null;

  const years: number[] = [];
  const value: Array<number | null> = [];
  for (let i = 0; i < r.years.length; i++) {
    const y = r.years[i];
    if (!finite(y)) return null;
    if (years.length > 0 && y <= years[years.length - 1]) return null;
    years.push(y);
    value.push(finite(r.value[i]) ? (r.value[i] as number) : null);
  }
  if (value.filter((v) => v !== null).length < 20) return null;

  return {
    id: r.id,
    name: r.name,
    country: typeof r.country === "string" ? r.country : "",
    why: typeof r.why === "string" ? r.why : "",
    lat: r.lat,
    lon: r.lon,
    years,
    value,
    firstYear: years[0],
    lastYear: years[years.length - 1],
  };
}

// ─────────────────────────────────── trends ──────────────────────────────────

export interface Trend {
  /** mm per year */
  mmPerYear: number;
  stdErr: number;
  from: number;
  to: number;
  n: number;
}

/**
 * Least squares slope in mm per year, with its standard error.
 *
 * Refuses a window shorter than ten years, the same rule the climate and ice
 * tabs use. Sea level is noisy at the interannual scale, mostly because El Nino
 * moves water between the ocean and the land, and a five-year slope can be made
 * to say almost anything.
 */
export function trend(
  xs: readonly number[] | null,
  ys: readonly (number | null)[] | null,
  from = -Infinity,
  to = Infinity
): Trend | null {
  if (!xs || !ys || xs.length !== ys.length) return null;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const t = xs[i];
    const v = ys[i];
    if (!finite(t) || v === null || !finite(v)) continue;
    if (t < from || t > to) continue;
    x.push(t);
    y.push(v);
  }
  if (x.length < 10) return null;
  if (x[x.length - 1] - x[0] < 9.5) return null;

  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) * (x[i] - mx);
    sxy += (x[i] - mx) * (y[i] - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const r = y[i] - (intercept + slope * x[i]);
    ss += r * r;
  }
  return {
    mmPerYear: slope,
    stdErr: Math.sqrt(ss / (n - 2)) / Math.sqrt(sxx),
    from: x[0],
    to: x[x.length - 1],
    n,
  };
}

export interface Acceleration {
  /** mm per year per year */
  mmPerYearPerYear: number;
  /** the fitted rate at the start of the window, mm/yr */
  rateAtStart: number;
  /** the fitted rate at the end, mm/yr */
  rateAtEnd: number;
  from: number;
  to: number;
  n: number;
}

/**
 * A quadratic fit, whose curvature is the acceleration.
 *
 * This is the number that makes a single rate misleading. The altimeter record
 * is not a straight line: the rate at the start of it is about half the rate now,
 * so "3.2 mm a year" is the average of something that has roughly doubled, and
 * is already out of date as a description of today.
 *
 * Refuses windows under twenty years. Curvature needs a long lever; fitting a
 * parabola to a decade of a noisy series produces a confident number about
 * nothing.
 */
export function acceleration(
  xs: readonly number[] | null,
  ys: readonly (number | null)[] | null
): Acceleration | null {
  if (!xs || !ys || xs.length !== ys.length) return null;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    if (!finite(xs[i])) continue;
    const v = ys[i];
    if (v === null || !finite(v)) continue;
    x.push(xs[i]);
    y.push(v);
  }
  if (x.length < 20) return null;
  const span = x[x.length - 1] - x[0];
  if (span < 20) return null;

  // Centred on the mean epoch so the normal equations stay well conditioned.
  const t0 = x.reduce((a, b) => a + b, 0) / x.length;
  const A = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const B = [0, 0, 0];
  for (let i = 0; i < x.length; i++) {
    const d = x[i] - t0;
    const basis = [1, d, d * d];
    for (let r = 0; r < 3; r++) {
      B[r] += basis[r] * y[i];
      for (let c = 0; c < 3; c++) A[r][c] += basis[r] * basis[c];
    }
  }
  const sol = solve3(A, B);
  if (!sol) return null;
  const [, b1, b2] = sol;
  const accel = 2 * b2;
  return {
    mmPerYearPerYear: accel,
    rateAtStart: b1 + 2 * b2 * (x[0] - t0),
    rateAtEnd: b1 + 2 * b2 * (x[x.length - 1] - t0),
    from: x[0],
    to: x[x.length - 1],
    n: x.length,
  };
}

/** Gaussian elimination with partial pivoting. Null if singular. */
function solve3(A: number[][], B: number[]): [number, number, number] | null {
  const M = A.map((row, i) => [...row, B[i]]);
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    if (Math.abs(M[p][i]) < 1e-12) return null;
    [M[i], M[p]] = [M[p], M[i]];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = M[r][i] / M[i][i];
      for (let c = i; c < 4; c++) M[r][c] -= f * M[i][c];
    }
  }
  return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

/**
 * The trend each satellite measured on its own.
 *
 * Worth computing because the answers are so unalike: the two early missions see
 * about 2.5 mm a year and the recent ones about 4. That is not five instruments
 * disagreeing, it is one accelerating ocean sampled in five different decades,
 * and it is the acceleration made visible without fitting a curve to anything.
 */
export function trendByMission(
  variant: GlobalVariant | null
): Array<{ mission: string; trend: Trend | null; from: number; to: number }> {
  if (!variant) return [];
  return variant.perMission.map((m) => ({
    mission: m.mission,
    trend: trend(m.time, m.value),
    from: m.time[0],
    to: m.time[m.time.length - 1],
  }));
}

/**
 * The trend over fixed spans of the merged record, which is the acceleration as
 * a staircase rather than as a curve.
 *
 * Ten-year blocks, because that is the shortest window this module will fit at
 * all. The obvious version of this exhibit was one trend per SATELLITE, and it
 * had to be abandoned: three of the five have flown for under ten years, so
 * fitting them would mean this module breaking its own rule to make a nicer
 * picture. Sentinel-6 has four years of data and no sea level trend can be got
 * out of that, however much one would like a number per instrument.
 *
 * Blocks also attribute the acceleration to the right thing. It is the ocean
 * accelerating, not the instruments differing.
 */
export function trendByBlock(
  variant: GlobalVariant | null,
  blockYears = 10
): Array<{ from: number; to: number; trend: Trend | null }> {
  if (!variant || !finite(blockYears) || blockYears < 10) return [];
  const first = Math.ceil(variant.time[0]);
  const last = variant.time[variant.time.length - 1];
  const out: Array<{ from: number; to: number; trend: Trend | null }> = [];
  // Blocks are half-open. The obvious loop shares each boundary year between two
  // consecutive blocks, which double-counts it and makes the labels lie about
  // what was fitted; with ten-day sampling the effect on the slope is negligible
  // and the label is wrong regardless.
  const EPS = 1e-6;
  for (let start = first; start < last; start += blockYears) {
    const end = Math.min(start + blockYears, last);
    // A final stub shorter than the block is folded into the previous one rather
    // than shown as a thin, noisy bar of its own.
    if (end - start < blockYears && out.length > 0) {
      const prev = out[out.length - 1];
      out[out.length - 1] = {
        from: prev.from,
        to: end,
        trend: trend(variant.time, variant.value, prev.from, end),
      };
      break;
    }
    out.push({
      from: start,
      to: end,
      trend: trend(variant.time, variant.value, start, end - EPS),
    });
  }
  return out;
}

/** The trend at a gauge, over its whole record and over the altimeter era. */
export interface GaugeTrends {
  gauge: Gauge;
  whole: Trend | null;
  sinceAltimetry: Trend | null;
  /** how the whole-record rate compares with the global altimeter rate */
  differenceFromGlobal: number | null;
}

export function gaugeTrends(
  gauge: Gauge | null,
  globalMmPerYear: number | null,
  altimetryStart = 1993
): GaugeTrends | null {
  if (!gauge) return null;
  const whole = trend(gauge.years, gauge.value);
  const since = trend(gauge.years, gauge.value, altimetryStart);
  return {
    gauge,
    whole,
    sinceAltimetry: since,
    differenceFromGlobal:
      since && finite(globalMmPerYear) ? since.mmPerYear - globalMmPerYear : null,
  };
}

/**
 * How much of a gauge's rate is the land rather than the ocean.
 *
 * The subtraction is deliberately simple and deliberately labelled: gauge rate
 * minus global altimeter rate over the same years leaves the LOCAL part, which
 * is mostly vertical land motion plus regional ocean differences. It is an
 * estimate of a residual, not a measurement of land motion, and calling it one
 * would be overreaching. Measuring the land properly takes GPS at the gauge.
 */
export function landComponentEstimate(
  gauge: Gauge | null,
  globalMmPerYear: number | null,
  altimetryStart = 1993
): number | null {
  const t = trend(gauge?.years ?? null, gauge?.value ?? null, altimetryStart);
  if (!t || !finite(globalMmPerYear)) return null;
  // A gauge rising faster than the global mean implies the ground is going down,
  // so the sign is flipped to read as land motion.
  return -(t.mmPerYear - globalMmPerYear);
}

/** Millimetres to a friendlier unit for a century of rise. */
export function cmPerCentury(mmPerYear: number | null): number | null {
  if (!finite(mmPerYear)) return null;
  return (mmPerYear * 100) / 10;
}

// ─────────────────────────────── honesty copy ────────────────────────────────

export const TWO_INSTRUMENTS_NOTE =
  "There is no single measurement called sea level. A satellite altimeter measures the sea surface against the centre of the Earth. A tide gauge measures the sea against the land it is bolted to. When the land is rising or sinking, those two give different answers about the same ocean in the same year, and both are correct. Anyone asking whether their street will flood wants the gauge.";

export const DATUM_NOTE =
  "The gauge numbers are millimetres above an arbitrary local datum, offset so they stay positive. The absolute value means nothing at all; only the slope means anything. That is the same caveat the tides tab carries, and it is why these charts are never given a shared vertical axis.";

export const GIA_NOTE =
  "The global figure usually quoted carries a glacial isostatic adjustment of about +0.3 mm a year on top of what the altimeter sees, because the ocean floor itself is still sinking as the mantle relaxes from the last ice age, which makes the basin bigger. NOAA's published trend here does NOT include it and says so in the file. Same ocean, two defensible numbers, depending on whether you are asking how high the surface is or how much water is in the basin.";

export const CONVENTION_NOTE =
  "NOAA publishes these same measurements four ways: with the seasonal cycle removed or retained, and over 66 degrees of latitude or over the reference missions' own coverage. Those two choices move the trend by two percent. None of the four is the true one.";

export const RELAY_NOTE =
  "The record is five satellites, not one. Each new altimeter flies in formation with the old one for months or years before the old one is retired, and that overlap is how the splice is calibrated. Where two flew at once they disagreed by one to two millimetres in the global mean, against a signal of about three millimetres a year, which is the honest size of the seam in a continuous thirty-year measurement.";

export const ACCELERATION_NOTE =
  "A single rate is the wrong shape for this record. Fitting a curve rather than a line gives an acceleration of about 0.08 mm a year per year, which means the rise has roughly doubled since 1992. Quoting the average rate describes neither the start nor the present.";

export const NOT_A_TIDY_STAIRCASE_NOTE =
  "The decades are not a tidy climb. The first two are about the same as each other, within their error bars, and the most recent one is far faster than either. So the acceleration is real across the whole record and is NOT visible as each decade beating the last: the middle decade is if anything slower than the first, partly because a very large La Nina in 2010 and 2011 moved an enormous amount of water out of the ocean and onto land for a couple of years. Curvature over thirty years does not oblige a series to rise smoothly inside it.";

export const NOT_A_FORECAST_NOTE =
  "No projection. Extending a curve like this to 2100 needs ice sheet physics, ocean heat uptake and an emissions pathway, none of which is in these two files. The fitted acceleration describes what has happened, and a parabola carried forward is arithmetic pretending to be a model.";

export const NOT_FLOOD_RISK_NOTE =
  "This is mean sea level, and floods are not mean anything. What puts water in a street is a high tide plus a storm surge plus waves on top of a raised baseline, and the local defences. Mean sea level sets the baseline those events start from, which matters enormously and is not the same as a flood forecast.";

export const OUR_TREND_DIFFERS_NOTE =
  "Our own least squares on NOAA's own file gives about 3.23 mm a year where their header says 3.17, a difference of two percent. We could not reproduce their exact figure from the file alone: it is not the seasonal treatment, the start date, or which satellite is preferred during an overlap, all of which were tested. It is a fitting-method difference, and both numbers are shown rather than tuning ours until it agrees.";
