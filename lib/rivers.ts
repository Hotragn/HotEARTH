/**
 * Rivers: what a hundred year flood is, and what it is not.
 *
 * THE LOAD-BEARING IDEA is that "the hundred year flood" is a probability with a
 * badly chosen name. It means a flood with a one percent chance of being
 * exceeded in any given year. It does not mean once a century, it is not a
 * schedule, and a river that had one last year is exactly as likely to have one
 * this year.
 *
 * The arithmetic that follows from that is not intuitive and is not disputed.
 * The chance of seeing at least one such flood somewhere in a thirty year
 * mortgage is 26 percent. Over a hundred years it is 63 percent, not 100. Two of
 * them five years apart is a one in a thousand coincidence, which is unremarkable
 * across a continent of rivers and is reported every time as evidence that the
 * statistics are broken.
 *
 * THE SECOND IDEA is that the number itself is an extrapolation, and this module
 * measures how far. Every estimate here is fitted to a record of eighty five to
 * a hundred and sixty five annual peaks, and then asked about a flood rarer than
 * anything in it. Resampling the record says how much that costs: on the Middle
 * Fork Flathead, eighty five years of measurements put the one percent flood
 * somewhere between thirty nine and a hundred and twenty two thousand cubic feet
 * a second. The top of that range is three times the bottom. On the Mississippi
 * at St. Louis, with a hundred and sixty five years, the same interval is a
 * fifth as wide. Record length is the whole of the difference.
 *
 * THE THIRD IDEA is that the list of peaks is not one population, and USGS says
 * so in a column most people drop. Next to each peak is a flag: this one is a
 * daily average rather than an instantaneous peak, this one is an estimate, this
 * one was reconstructed from high water marks a century after the fact, this one
 * came down a regulated river. Glen Canyon Dam closed in 1963 and the Colorado at
 * Lees Ferry carries the regulation flag every year since. Fitting one curve
 * across that gives a one percent flood HIGHER than fitting either half, because
 * mixing two populations inflates the variance. The module computes all three
 * numbers rather than choosing.
 *
 * Nothing here is modelled. Every number is a measurement, a published constant,
 * or arithmetic on one.
 *
 * Method: log-Pearson Type III by method of moments on log10 discharge, with the
 * Wilson-Hilferty approximation to the frequency factor. That is the United
 * States federal standard for flood frequency, Bulletin 17C. The weighted
 * regional skew, low-outlier censoring and historical-period adjustments that
 * Bulletin 17C also specifies are NOT done here, and the tab says so: this is the
 * textbook fit, not an agency estimate, and the two will differ.
 *
 * Source
 *   USGS National Water Information System, annual peak streamflow, and the NWIS
 *   site service. Works of the United States Geological Survey are in the public
 *   domain.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/* ------------------------------------------------------------------ units */

/** One cubic foot per second, in cubic metres per second. Exact by definition. */
export const CFS_TO_CUMECS = 0.028316846592;

/** One square mile, in square kilometres. Exact by definition. */
export const SQMI_TO_SQKM = 2.589988110336;

export function cfsToCumecs(cfs: number): number | null {
  return finite(cfs) && cfs >= 0 ? cfs * CFS_TO_CUMECS : null;
}

/**
 * Discharge per unit of drainage area, in cubic feet per second per square mile.
 *
 * Worth having because flood peaks do not scale with basin size. A small steep
 * catchment delivers far more water per square mile than a continental basin,
 * whose tributaries peak on different days and never add up.
 */
export function unitDischarge(cfs: number, drainageSqMi: number | null): number | null {
  if (!finite(cfs) || !finite(drainageSqMi) || drainageSqMi <= 0) return null;
  return cfs / drainageSqMi;
}

/* ------------------------------------------------------------------ types */

/** USGS peak-discharge qualification codes, in their own words. */
export const PEAK_CODES: Record<string, string> = {
  "1": "a maximum daily average, not an instantaneous peak",
  "2": "the discharge is an estimate",
  "3": "affected by dam failure",
  "4": "less than the indicated value",
  "5": "affected to an unknown degree by regulation or diversion",
  "6": "affected by regulation or diversion",
  "7": "a historic peak, reconstructed rather than gauged",
  "8": "actually greater than the indicated value",
  "9": "snowmelt, hurricane, ice jam or debris dam",
  A: "the year of occurrence is not exact",
  B: "the month or day of occurrence is not exact",
  Bd: "the day of occurrence is not exact",
  Bm: "the month of occurrence is not exact",
  C: "affected by urbanisation, mining, channelisation or other change",
  D: "the base discharge changed during this year",
  E: "only the annual maximum peak is available for this year",
  R: "revised",
};

/** The flag that says a dam is upstream. */
export const REGULATION_CODE = "6";
/** The flag that says the peak was reconstructed rather than measured. */
export const HISTORIC_CODE = "7";
/** The flag that says the number is a daily mean, so it understates the peak. */
export const DAILY_MEAN_CODE = "1";

export interface Peak {
  waterYear: number;
  date: string;
  monthKnown: boolean;
  dayKnown: boolean;
  cfs: number;
  gageHeightFt: number | null;
  codes: string[];
}

export interface Gauge {
  site: string;
  label: string;
  stationName: string;
  lat: number | null;
  lon: number | null;
  drainageAreaSqMi: number | null;
  peaks: Peak[];
  codeCounts: Record<string, number>;
}

export interface RiversData {
  generated: string;
  gauges: Gauge[];
}

/* ---------------------------------------------------------------- parsing */

function parsePeak(raw: unknown): Peak | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!finite(r.waterYear) || !finite(r.cfs) || r.cfs <= 0) return null;
  return {
    waterYear: r.waterYear,
    date: typeof r.date === "string" ? r.date : "",
    monthKnown: r.monthKnown !== false,
    dayKnown: r.dayKnown !== false,
    cfs: r.cfs,
    gageHeightFt: finite(r.gageHeightFt) ? r.gageHeightFt : null,
    codes:
      Array.isArray(r.codes) && r.codes.every((c) => typeof c === "string")
        ? (r.codes as string[])
        : [],
  };
}

function parseGauge(raw: unknown): Gauge | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.site !== "string") return null;
  const peaks = Array.isArray(r.peaks)
    ? r.peaks.map(parsePeak).filter((p): p is Peak => p !== null)
    : [];
  if (peaks.length === 0) return null;

  const counts: Record<string, number> = {};
  if (r.codeCounts && typeof r.codeCounts === "object") {
    for (const [k, v] of Object.entries(r.codeCounts as Record<string, unknown>)) {
      if (finite(v)) counts[k] = v;
    }
  }
  return {
    site: r.site,
    label: typeof r.label === "string" ? r.label : r.site,
    stationName: typeof r.stationName === "string" ? r.stationName : "",
    lat: finite(r.lat) ? r.lat : null,
    lon: finite(r.lon) ? r.lon : null,
    drainageAreaSqMi: finite(r.drainageAreaSqMi) ? r.drainageAreaSqMi : null,
    peaks,
    codeCounts: counts,
  };
}

/** Bad input gives null, never a throw. The contract the whole project uses. */
export function parseRivers(raw: unknown): RiversData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const gauges = Array.isArray(r.gauges)
    ? r.gauges.map(parseGauge).filter((g): g is Gauge => g !== null)
    : [];
  if (gauges.length === 0) return null;
  return {
    generated: typeof r.generated === "string" ? r.generated : "",
    gauges,
  };
}

/* -------------------------------------------------------- the distribution */

/**
 * Inverse of the standard normal CDF, by Acklam's rational approximation with
 * one Halley refinement.
 *
 * Written out rather than pulled in because the project ships no numerical
 * dependencies, and because every flood quantile on this tab passes through it:
 * if this is wrong by a percent, so is the hundred year flood. The tests pin it
 * against published z values.
 */
export function normalQuantile(p: number): number | null {
  if (!finite(p) || p <= 0 || p >= 1) return null;

  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416];

  const lo = 0.02425;
  let x: number;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    x =
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - lo) {
    const q = p - 0.5;
    const r = q * q;
    x =
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x =
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // One Halley step, which takes the approximation from about 1e-9 to machine
  // precision. erfc is not in the standard library either, so the CDF is built
  // from the same series the refinement needs.
  const e = 0.5 * erfc(-x / Math.SQRT2) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** Complementary error function, Numerical Recipes' Chebyshev fit. */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;
  const cof = [-1.3026537197817094, 6.4196979235649026e-1, 1.9476473204185836e-2,
    -9.561514786808631e-3, -9.46595344482036e-4, 3.66839497852761e-4,
    4.2523324806907e-5, -2.0278578112534e-5, -1.624290004647e-6,
    1.303655835580e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11,
    2.394038e-12, -6.886027e-12, 8.94487e-13, 3.13092e-13, -1.12708e-13,
    3.81e-16, 7.106e-15];
  let d = 0;
  let dd = 0;
  for (let j = cof.length - 1; j > 0; j--) {
    const tmp = d;
    d = ty * d - dd + cof[j];
    dd = tmp;
  }
  const ans = t * Math.exp(-z * z + 0.5 * (cof[0] + ty * d) - dd);
  return x >= 0 ? ans : 2 - ans;
}

/**
 * The Pearson III frequency factor, by the Wilson-Hilferty approximation.
 *
 * With zero skew it must reduce exactly to the normal quantile, and the tests
 * check that it does, because a silent sign error here would move every flood
 * number on the tab in the same direction and look plausible.
 */
export function frequencyFactor(skew: number, probability: number): number | null {
  const z = normalQuantile(probability);
  if (z === null || !finite(skew)) return null;
  if (Math.abs(skew) < 1e-9) return z;
  const k = skew / 6;
  return (2 / skew) * ((z - k) * k + 1) ** 3 - 2 / skew;
}

/* --------------------------------------------------------- the flood curve */

export interface Fit {
  /** Mean of log10 discharge. */
  meanLog: number;
  /** Sample standard deviation of log10 discharge. */
  sdLog: number;
  /** Sample skew of log10 discharge, unbiased. */
  skew: number;
  n: number;
  firstYear: number;
  lastYear: number;
}

/**
 * Log-Pearson Type III by method of moments, the Bulletin 17C distribution.
 *
 * Fewer than ten peaks gives null. A skew computed from a handful of numbers is
 * mostly noise, and a curve drawn from it would look exactly as confident as one
 * drawn from a century.
 */
export function logPearson3(peaks: readonly Peak[]): Fit | null {
  const usable = peaks.filter((p) => finite(p.cfs) && p.cfs > 0);
  const n = usable.length;
  if (n < 10) return null;

  const logs = usable.map((p) => Math.log10(p.cfs));
  const mean = logs.reduce((a, b) => a + b, 0) / n;
  let m2 = 0;
  let m3 = 0;
  for (const x of logs) {
    m2 += (x - mean) ** 2;
    m3 += (x - mean) ** 3;
  }
  const sd = Math.sqrt(m2 / (n - 1));
  if (sd <= 0) return null;
  // The unbiased sample skew, matching what scipy and Bulletin 17C use.
  const skew = (n / ((n - 1) * (n - 2))) * (m3 / sd ** 3);

  const years = usable.map((p) => p.waterYear);
  return {
    meanLog: mean,
    sdLog: sd,
    skew,
    n,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  };
}

/** The discharge with a 1/T chance of being exceeded in any year, in cfs. */
export function dischargeFor(fit: Fit | null, returnYears: number): number | null {
  if (!fit || !finite(returnYears) || returnYears <= 1) return null;
  const k = frequencyFactor(fit.skew, 1 - 1 / returnYears);
  if (k === null) return null;
  const value = 10 ** (fit.meanLog + k * fit.sdLog);
  return finite(value) ? value : null;
}

/**
 * The return period the fitted curve assigns to a given discharge.
 *
 * Bisected in log space rather than inverted, because the Wilson-Hilferty form
 * does not invert in closed form for non-zero skew. Capped at a million years:
 * beyond that the answer is not a number about rivers, it is a statement that
 * the curve has left the data behind, and the tab says so instead of printing it.
 */
export const RETURN_PERIOD_CEILING = 1_000_000;

export function returnPeriodFor(fit: Fit | null, cfs: number): number | null {
  if (!fit || !finite(cfs) || cfs <= 0) return null;
  let lo = 1.0001;
  let hi = RETURN_PERIOD_CEILING;
  const at = (t: number) => dischargeFor(fit, t);
  const qLo = at(lo);
  const qHi = at(hi);
  if (qLo === null || qHi === null) return null;
  if (cfs <= qLo) return lo;
  if (cfs >= qHi) return RETURN_PERIOD_CEILING;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi);
    const q = at(mid);
    if (q === null) return null;
    if (q < cfs) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/**
 * The chance of at least one exceedance of a T-year flood in a window of years.
 *
 * The single most useful line on the tab, and the one that surprises people:
 * a hundred year flood has a 26 percent chance of turning up inside a thirty
 * year mortgage, and a 63 percent chance inside a century, not a certainty.
 */
export function exceedanceProbability(
  returnYears: number,
  windowYears: number
): number | null {
  if (!finite(returnYears) || returnYears <= 1) return null;
  if (!finite(windowYears) || windowYears < 0) return null;
  return 1 - (1 - 1 / returnYears) ** windowYears;
}

/** The chance of at least `k` exceedances in a window. Two in five years is famous. */
export function multipleExceedanceProbability(
  returnYears: number,
  windowYears: number,
  atLeast: number
): number | null {
  if (!finite(returnYears) || returnYears <= 1) return null;
  if (!Number.isInteger(windowYears) || windowYears < 0) return null;
  if (!Number.isInteger(atLeast) || atLeast < 0) return null;
  if (atLeast > windowYears) return 0;
  const p = 1 / returnYears;
  let below = 0;
  for (let k = 0; k < atLeast; k++) {
    below += binomial(windowYears, k) * p ** k * (1 - p) ** (windowYears - k);
  }
  return Math.min(1, Math.max(0, 1 - below));
}

function binomial(n: number, k: number): number {
  let out = 1;
  for (let i = 0; i < k; i++) out = (out * (n - i)) / (i + 1);
  return out;
}

export interface PlottedPeak {
  peak: Peak;
  /** Rank 1 is the largest peak in the record. */
  rank: number;
  /** Weibull plotting position: the record's own estimate of how rare it was. */
  empiricalReturnYears: number;
}

/**
 * The record plotted against itself, by the Weibull position (n+1)/rank.
 *
 * This is the honest half of the figure. The fitted curve is a model; these
 * points are what actually happened, and the largest flood on record sits at
 * n+1 years by construction, however rare a fitted curve later calls it.
 */
export function plottingPositions(peaks: readonly Peak[]): PlottedPeak[] {
  const usable = peaks.filter((p) => finite(p.cfs) && p.cfs > 0);
  const n = usable.length;
  if (n === 0) return [];
  return [...usable]
    .sort((a, b) => b.cfs - a.cfs)
    .map((peak, i) => ({
      peak,
      rank: i + 1,
      empiricalReturnYears: (n + 1) / (i + 1),
    }));
}

/* ------------------------------------------------- how much it is not known */

/** Deterministic PRNG, so a confidence interval is the same on every load. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Interval {
  estimate: number;
  low: number;
  high: number;
  /** high / low. How many times wider the top of the range is than the bottom. */
  ratio: number;
  iterations: number;
  confidence: number;
}

/**
 * How much of the hundred year flood is the record, and how much is the fit.
 *
 * Resamples the peaks with replacement, refits, and reports the middle of the
 * resulting spread. This is not a substitute for the confidence limits Bulletin
 * 17C specifies, and does not pretend to be: it is the plainest possible
 * demonstration that a number extrapolated past the end of its own record has a
 * range, and how wide that range is.
 *
 * Deterministic by construction. A confidence interval that moved every time the
 * page loaded would be the least trustworthy thing on it.
 */
export function bootstrapInterval(
  peaks: readonly Peak[],
  returnYears: number,
  options: { iterations?: number; seed?: number; confidence?: number } = {}
): Interval | null {
  const usable = peaks.filter((p) => finite(p.cfs) && p.cfs > 0);
  const n = usable.length;
  if (n < 10) return null;

  const estimate = dischargeFor(logPearson3(usable), returnYears);
  if (estimate === null) return null;

  const iterations = options.iterations ?? 1200;
  const confidence = options.confidence ?? 0.9;
  const random = mulberry32(options.seed ?? 20260913);

  const draws: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sample: Peak[] = [];
    for (let j = 0; j < n; j++) sample.push(usable[Math.floor(random() * n)]);
    const q = dischargeFor(logPearson3(sample), returnYears);
    if (q !== null && q > 0) draws.push(q);
  }
  if (draws.length < iterations / 2) return null;

  draws.sort((a, b) => a - b);
  const tail = (1 - confidence) / 2;
  const at = (f: number) => draws[Math.min(draws.length - 1, Math.max(0, Math.round(f * (draws.length - 1))))];
  const low = at(tail);
  const high = at(1 - tail);
  return { estimate, low, high, ratio: low > 0 ? high / low : Infinity, iterations, confidence };
}

/* ----------------------------------------------------- one river, two rivers */

export interface RegulationSplit {
  /** The first water year USGS flags as regulated. Read from the data. */
  firstRegulatedYear: number;
  before: Fit | null;
  after: Fit | null;
  /** The one percent flood from each half, and from the two mixed together. */
  beforeDischarge: number | null;
  afterDischarge: number | null;
  combinedDischarge: number | null;
  beforeCount: number;
  afterCount: number;
}

/**
 * Split a record at the year the dam shows up, and fit both halves.
 *
 * The split year is NOT hardcoded. It is the first water year carrying the USGS
 * regulation flag, so the tab is quoting the agency that keeps the gauge rather
 * than a date somebody remembered.
 *
 * Returns null for a river that was never flagged, and for one that was flagged
 * from its first year: the Sacramento at Verona has been regulated for all
 * ninety six years of its record, so there is no unregulated half to compare
 * against and the honest answer is that this comparison cannot be made.
 */
export function splitByRegulation(
  gauge: Gauge,
  returnYears = 100
): RegulationSplit | null {
  const flagged = gauge.peaks.filter((p) => p.codes.includes(REGULATION_CODE));
  if (flagged.length === 0) return null;
  const firstRegulatedYear = Math.min(...flagged.map((p) => p.waterYear));

  const before = gauge.peaks.filter((p) => p.waterYear < firstRegulatedYear);
  const after = gauge.peaks.filter((p) => p.waterYear >= firstRegulatedYear);
  if (before.length < 10 || after.length < 10) return null;

  const beforeFit = logPearson3(before);
  const afterFit = logPearson3(after);
  return {
    firstRegulatedYear,
    before: beforeFit,
    after: afterFit,
    beforeDischarge: dischargeFor(beforeFit, returnYears),
    afterDischarge: dischargeFor(afterFit, returnYears),
    combinedDischarge: dischargeFor(logPearson3(gauge.peaks), returnYears),
    beforeCount: before.length,
    afterCount: after.length,
  };
}

export interface HistoricReach {
  /** How many peaks were reconstructed rather than gauged. */
  count: number;
  /** How many of those sit inside the largest `count` peaks on the record. */
  amongLargest: number;
  /** True when every reconstructed peak is also one of the largest. */
  dominatesTheTail: boolean;
}

/**
 * Whether the reconstructed peaks are the ones setting the answer.
 *
 * A historic peak is an inference from high water marks or a newspaper account
 * rather than a gauge reading, which is worth knowing anywhere and is worth
 * knowing most when those peaks are the largest in the record, because the far
 * end of a frequency curve is fitted almost entirely to them. On the Willamette
 * all three reconstructions are the three largest floods on the river.
 *
 * Computed per gauge rather than described, so a card headed with one river's
 * name cannot end up carrying a sentence about a different one.
 */
export function historicReach(gauge: Gauge): HistoricReach {
  const historic = gauge.peaks.filter((p) => p.codes.includes(HISTORIC_CODE));
  if (historic.length === 0) {
    return { count: 0, amongLargest: 0, dominatesTheTail: false };
  }
  const largest = new Set(
    [...gauge.peaks]
      .sort((a, b) => b.cfs - a.cfs)
      .slice(0, historic.length)
      .map((p) => p.waterYear)
  );
  const amongLargest = historic.filter((p) => largest.has(p.waterYear)).length;
  return {
    count: historic.length,
    amongLargest,
    dominatesTheTail: amongLargest === historic.length,
  };
}

export interface GaugeSummary {
  gauge: Gauge;
  fit: Fit | null;
  /** The one percent flood, in cfs. */
  hundredYear: number | null;
  interval: Interval | null;
  largest: Peak | null;
  /** Where the record puts its own largest flood: n+1 years, by construction. */
  largestEmpiricalReturn: number | null;
  /** Where the fitted curve puts the same flood. The gap is the point. */
  largestFittedReturn: number | null;
  regulatedCount: number;
  historicCount: number;
  dailyMeanCount: number;
  historic: HistoricReach;
  split: RegulationSplit | null;
}

/** Everything the tab shows for one river, in one pass. */
export function summarise(gauge: Gauge, returnYears = 100): GaugeSummary {
  const fit = logPearson3(gauge.peaks);
  const largest = gauge.peaks.reduce<Peak | null>(
    (best, p) => (best === null || p.cfs > best.cfs ? p : best),
    null
  );
  const positions = plottingPositions(gauge.peaks);
  const count = (code: string) => gauge.peaks.filter((p) => p.codes.includes(code)).length;

  return {
    gauge,
    fit,
    hundredYear: dischargeFor(fit, returnYears),
    interval: bootstrapInterval(gauge.peaks, returnYears),
    largest,
    largestEmpiricalReturn: positions[0]?.empiricalReturnYears ?? null,
    largestFittedReturn: largest ? returnPeriodFor(fit, largest.cfs) : null,
    regulatedCount: count(REGULATION_CODE),
    historicCount: count(HISTORIC_CODE),
    dailyMeanCount: count(DAILY_MEAN_CODE),
    historic: historicReach(gauge),
    split: splitByRegulation(gauge, returnYears),
  };
}

/* ----------------------------------------------------------- what is claimed */

export const NAME_IS_THE_PROBLEM_NOTE =
  "A hundred year flood is a flood with a one percent chance of being exceeded in any given year. The name says century and the definition says probability, and almost every argument about flood statistics comes from the gap between the two. It is not a schedule, it does not reset, and a river that had one last year is exactly as likely to have one this year. Two of them five years apart is a one in a thousand coincidence at one gauge, which across a continent of rivers is something that happens constantly and gets reported every time as proof the statistics are broken.";

export const EXTRAPOLATION_NOTE =
  "Every one percent flood on this page is an extrapolation. The longest record here is a hundred and sixty five years and the shortest is eighty five, and each is being asked about a flood rarer than anything in it. Resampling each record says what that costs, and the answer is not small: the gauge with the shortest record puts its hundred year flood inside a range whose top is three times its bottom. The gauge with the longest record is five times tighter. Record length is the whole of the difference, and no method fixes it.";

export const CURVE_VERSUS_RECORD_NOTE =
  "The largest flood in a record sits at n plus one years by construction, whatever a fitted curve later calls it. Where the two agree the distribution is describing the river. Where they diverge by a factor of ten, the curve has been asked for something the record cannot support, and the tab prints both numbers rather than the one that sounds more authoritative.";

export const REGULATION_NOTE =
  "Glen Canyon Dam closed in 1963 and the Colorado at Lees Ferry has carried the USGS regulation flag every year since. The peaks before and the peaks after are not samples of the same river. Fitting one curve across the join gives a one percent flood higher than fitting either half on its own, because mixing two populations inflates the spread more than it moves the middle. All three numbers are computed here. The split year is read out of the USGS flag rather than remembered, so it is the agency that keeps the gauge saying when the river changed.";

export const NEVER_NATURAL_NOTE =
  "One gauge here has no unregulated half at all. The Sacramento at Verona is flagged as regulated in all ninety six years of its record, so there is nothing to compare a managed river against, and the comparison returns nothing instead of a number. Its fitted curve is also the one that misbehaves worst: flood control clips the peaks, the spread of the logs collapses, and the curve starts calling ordinary floods impossibly rare. That is what a frequency curve does when it is fitted to an operating rule instead of a climate.";

/**
 * About the Willamette specifically, and shown only on the Willamette. The
 * general version is RECONSTRUCTED_PEAKS_GENERAL, which any gauge can carry.
 */
export const RECONSTRUCTED_PEAKS_NOTE =
  "The three largest floods in the Willamette record are all flagged historic, which means they were reconstructed from high water marks and newspaper accounts rather than gauged. The December 1861 flood, the largest on the river, is an estimate made long afterwards. That is not a reason to throw it away, and it is a reason to know which points at the far end of a curve are measurements and which are inferences, because those are the points that set the answer.";

export const RECONSTRUCTED_PEAKS_GENERAL =
  "A historic peak is an inference from high water marks or a newspaper account rather than a gauge reading. That is not a reason to throw it away, and it is a reason to know which points at the far end of a curve are measurements and which are reconstructions, because those are the points that set the answer.";

/** About the Mississippi specifically, and shown only there. */
export const DAILY_MEAN_NOTE =
  "Forty of the Mississippi at St. Louis peaks are flagged as maximum daily averages rather than instantaneous peaks. A daily average is always lower than the peak inside that day, so those years are biased downward against the years beside them. On a big river with a slow flood wave the difference is small, and it is not zero, and it is in the record where anyone can see it.";

export const WATER_YEAR_NOTE =
  "A water year runs from the first of October to the thirtieth of September and is named for the year it ends in, so the flood of 4 December 1861 is the water year 1862 peak. Reading the calendar year straight out of the date is wrong for every autumn flood and quietly so, since the result is still in order and still looks like one peak a year. It matters most exactly where it would do the most damage: forty six of the Willamette's hundred and thirty six peaks fall between October and December, because its floods are winter storms.";

export const NOT_BULLETIN_17C_NOTE =
  "This is the textbook log-Pearson III fit, not an agency estimate. Bulletin 17C, the United States federal standard, also weights the station skew against a regional map, censors low outliers, and adjusts for historical periods outside the systematic record. None of that is done here, and the published regulatory numbers will differ. What is on this page is what the distribution says about the numbers in the file, which is the part a reader can check.";

export const NOT_A_FORECAST_NOTE =
  "Nothing here predicts a flood, and nothing here is a trend. A frequency curve assumes the record is a sample of one unchanging process, which is the assumption a changing climate puts under strain, and testing that properly needs more than eight gauges and a fitted line. The tab shows what the records contain and how much of the answer is extrapolation, and stops.";

/* ------------------------------------------------------------- the band */

export interface BandPoint {
  returnYears: number;
  estimate: number;
  low: number;
  high: number;
}

/**
 * The confidence band along the whole curve, from one resampling pass.
 *
 * Every resample is refitted once and then asked for all the return periods at
 * the same time, so drawing the band costs what drawing a single interval costs.
 * Doing it the other way round, a separate pass per return period, would also
 * let the band wobble non-monotonically from one x to the next, which would be
 * an artifact of the random draw rather than anything about the river.
 */
export function bootstrapBand(
  peaks: readonly Peak[],
  returnPeriods: readonly number[],
  options: { iterations?: number; seed?: number; confidence?: number } = {}
): BandPoint[] {
  const usable = peaks.filter((p) => finite(p.cfs) && p.cfs > 0);
  const n = usable.length;
  const wanted = returnPeriods.filter((t) => finite(t) && t > 1);
  if (n < 10 || wanted.length === 0) return [];

  const baseFit = logPearson3(usable);
  const iterations = options.iterations ?? 1000;
  const confidence = options.confidence ?? 0.9;
  const random = mulberry32(options.seed ?? 20260913);

  const columns: number[][] = wanted.map(() => []);
  const sample: Peak[] = new Array(n);
  for (let i = 0; i < iterations; i++) {
    for (let j = 0; j < n; j++) sample[j] = usable[Math.floor(random() * n)];
    const fit = logPearson3(sample);
    if (!fit) continue;
    for (let k = 0; k < wanted.length; k++) {
      const q = dischargeFor(fit, wanted[k]);
      if (q !== null && q > 0) columns[k].push(q);
    }
  }

  const tail = (1 - confidence) / 2;
  const out: BandPoint[] = [];
  for (let k = 0; k < wanted.length; k++) {
    const draws = columns[k];
    const estimate = dischargeFor(baseFit, wanted[k]);
    if (estimate === null || draws.length < iterations / 2) continue;
    draws.sort((a, b) => a - b);
    const at = (f: number) =>
      draws[Math.min(draws.length - 1, Math.max(0, Math.round(f * (draws.length - 1))))];
    out.push({ returnYears: wanted[k], estimate, low: at(tail), high: at(1 - tail) });
  }
  return out;
}
