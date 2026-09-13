/**
 * Ozone: the one we acted on, and what acting looks like from the data.
 *
 * THE LOAD-BEARING IDEA of this tab is that the cause and the effect are on
 * completely different footings, and saying so is the honest version of a story
 * usually told as a clean success.
 *
 * THE CAUSE is unambiguous. NOAA measures ozone depleting gases in air at remote
 * sites and publishes an index that is 100 at their peak and 0 at their 1980
 * abundance. Over Antarctica that index has fallen from 100 in 2001 to the low
 * seventies. Methyl chloroform, banned and with a five year lifetime, is down 99
 * percent from its peak. That is a treaty visible in the atmosphere.
 *
 * THE EFFECT is not, yet, in the numbers people quote. The Antarctic hole area
 * and the minimum column are the two figures that make the news each October,
 * and over the modern record neither carries a statistically significant trend:
 * this module computes the slope and its standard error rather than asserting a
 * direction. The reason is meteorology. The size of the hole in any one year is
 * set mostly by how cold and how stable the polar vortex was, and that swings
 * far harder year to year than the chemicals move in a decade.
 *
 * The measured correlation between the halogen loading and the hole area, over
 * the thirty-odd years both series exist, is near zero and has the WRONG SIGN.
 * That does not mean the Montreal Protocol failed. It means the hole area is a
 * noisy detector, and published detections of healing use better chosen metrics.
 * The number is computed here and shown rather than hidden, because a page that
 * only showed the falling chemicals would be making a claim it had not checked.
 *
 * THE SECOND IDEA is that five ground stations settle the physics without a
 * model. Compare the springtime loss at the South Pole with the springtime loss
 * at Utqiagvik, which is as polar as the Arctic gets. Both sit under the same
 * global burden of chlorine. One lost about half its October ozone; the other
 * lost a few percent. Latitude and darkness are not the variable. The variable
 * is the polar vortex, which over Antarctica gets cold enough, for long enough,
 * to grow the clouds that turn inert chlorine into the form that destroys ozone.
 *
 * THE THIRD is that a Dobson Unit is a real thickness. One DU is a hundredth of
 * a millimetre of pure ozone at sea level pressure. The entire protective layer,
 * squashed down, is about three millimetres thick, and inside the hole it gets
 * to about one.
 *
 * Nothing here is modelled. Every number on the tab is a measurement, an
 * arithmetic consequence of one, or a published constant that says so.
 *
 * Sources
 *   NASA Ozone Watch, Goddard Space Flight Center: annual Antarctic hole area
 *     and minimum total column, 1979 onward.
 *   NOAA Global Monitoring Laboratory Ozone Depleting Gas Index: yearly global
 *     mean abundances, EESC and the index, Antarctic and mid-latitude.
 *   NOAA Global Monitoring Laboratory Dobson network: total column at five
 *     stations, individual observations from 1963, averaged here to months.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const numbers = (v: unknown): number[] | null =>
  Array.isArray(v) && v.every(finite) ? (v as number[]) : null;

/* ------------------------------------------------------------------ units */

/** One Dobson Unit is this many millimetres of pure ozone at 0 C and 1 atm. */
export const DU_MILLIMETRES = 0.01;

/** One Dobson Unit is this many ozone molecules per square centimetre. */
export const DU_MOLECULES_PER_CM2 = 2.69e16;

/** A typical whole-Earth column, in DU. Three millimetres of ozone. */
export const TYPICAL_COLUMN_DU = 300;

/** The column as an actual thickness, in millimetres. Null on bad input. */
export function dobsonToMillimetres(du: number): number | null {
  return finite(du) && du >= 0 ? du * DU_MILLIMETRES : null;
}

/** The column as molecules over every square centimetre. Null on bad input. */
export function dobsonToMolecules(du: number): number | null {
  return finite(du) && du >= 0 ? du * DU_MOLECULES_PER_CM2 : null;
}

/* ------------------------------------------------------------------ types */

export interface HoleRecord {
  years: number[];
  areaMillionKm2: number[];
  minimumDu: number[];
  /** Years inside the range with no satellite at all. 1995, and only 1995. */
  gapYears: number[];
  areaWindow: string;
  minimumWindow: string;
  thresholdDu: number;
}

export interface GasIndex {
  label: string;
  years: number[];
  gasNames: string[];
  gases: Record<string, number[]>;
  eescPpt: number[];
  odgi: number[];
  peakYear: number;
  peakEescPpt: number;
  /** Solved from the published columns by the fetch script, not assumed. */
  benchmark1980Ppt: number;
  worstIndexResidual: number;
}

export interface Station {
  code: string;
  name: string;
  lat: number;
  lon: number;
  /** "YYYY-MM", ascending, with gaps where the station did not report. */
  months: string[];
  du: number[];
  obs: number[];
  kinds: Record<string, number>;
  /** Calendar month (as a string) to the count of observations made by moon. */
  moonMonths: Record<string, number>;
  /**
   * Calendar month to the median airmass of its observations: the length of the
   * light path through the atmosphere relative to straight up. It explains the
   * shape of the record. A Dobson reading at airmass seven is a reading through
   * seven atmospheres, which is why the South Pole has almost no March.
   */
  medianAirmass: Record<string, number>;
  observations: number;
}

export interface OzoneData {
  generated: string;
  hole: HoleRecord;
  odgi: { antarctic: GasIndex; midLatitude: GasIndex };
  stations: Station[];
}

/* ---------------------------------------------------------------- parsing */

function parseHole(raw: unknown): HoleRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const years = numbers(r.years);
  const area = numbers(r.areaMillionKm2);
  const minimum = numbers(r.minimumDu);
  if (!years || !area || !minimum) return null;
  if (years.length !== area.length || years.length !== minimum.length) return null;
  if (years.length === 0) return null;
  return {
    years,
    areaMillionKm2: area,
    minimumDu: minimum,
    gapYears: numbers(r.gapYears) ?? [],
    areaWindow: typeof r.areaWindow === "string" ? r.areaWindow : "",
    minimumWindow: typeof r.minimumWindow === "string" ? r.minimumWindow : "",
    thresholdDu: finite(r.thresholdDu) ? r.thresholdDu : 220,
  };
}

function parseIndex(raw: unknown): GasIndex | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const years = numbers(r.years);
  const eesc = numbers(r.eescPpt);
  const odgi = numbers(r.odgi);
  if (!years || !eesc || !odgi) return null;
  if (years.length !== eesc.length || years.length !== odgi.length) return null;
  if (!finite(r.peakYear) || !finite(r.peakEescPpt) || !finite(r.benchmark1980Ppt)) return null;

  const names = Array.isArray(r.gasNames) && r.gasNames.every((n) => typeof n === "string")
    ? (r.gasNames as string[])
    : [];
  const gases: Record<string, number[]> = {};
  const src = (r.gases ?? {}) as Record<string, unknown>;
  for (const name of names) {
    const series = numbers(src[name]);
    if (series && series.length === years.length) gases[name] = series;
  }

  return {
    label: typeof r.label === "string" ? r.label : "",
    years,
    gasNames: names.filter((n) => n in gases),
    gases,
    eescPpt: eesc,
    odgi,
    peakYear: r.peakYear,
    peakEescPpt: r.peakEescPpt,
    benchmark1980Ppt: r.benchmark1980Ppt,
    worstIndexResidual: finite(r.worstIndexResidual) ? r.worstIndexResidual : 0,
  };
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

function parseStation(raw: unknown): Station | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.code !== "string" || !finite(r.lat) || !finite(r.lon)) return null;
  const du = numbers(r.du);
  const obs = numbers(r.obs);
  const months =
    Array.isArray(r.months) && r.months.every((m) => typeof m === "string" && MONTH_KEY.test(m))
      ? (r.months as string[])
      : null;
  if (!du || !obs || !months) return null;
  if (months.length !== du.length || months.length !== obs.length) return null;

  const numberMap = (value: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (finite(v)) out[k] = v;
      }
    }
    return out;
  };
  const kinds = numberMap(r.kinds);
  const moonMonths = numberMap(r.moonMonths);
  const medianAirmass = numberMap(r.medianAirmass);
  return {
    code: r.code,
    name: typeof r.name === "string" ? r.name : r.code,
    lat: r.lat,
    lon: r.lon,
    months,
    du,
    obs,
    kinds,
    moonMonths,
    medianAirmass,
    observations: finite(r.observations) ? r.observations : du.length,
  };
}

/** Bad input gives null, never a throw. The contract the whole project uses. */
export function parseOzone(raw: unknown): OzoneData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const hole = parseHole(r.hole);
  if (!hole) return null;

  const odgiRaw = (r.odgi ?? {}) as Record<string, unknown>;
  const antarctic = parseIndex(odgiRaw.antarctic);
  const midLatitude = parseIndex(odgiRaw.midLatitude);
  if (!antarctic || !midLatitude) return null;

  const stations = Array.isArray(r.stations)
    ? r.stations.map(parseStation).filter((s): s is Station => s !== null)
    : [];
  if (stations.length === 0) return null;

  return {
    generated: typeof r.generated === "string" ? r.generated : "",
    hole,
    odgi: { antarctic, midLatitude },
    stations,
  };
}

/* ----------------------------------------------------------- fitting lines */

export interface Trend {
  /** Units of y per year. */
  slope: number;
  intercept: number;
  /** Standard error of the slope, same units. */
  stderr: number;
  /** |slope| / stderr. Under 2 means the line is not telling you anything. */
  sigma: number;
  /** Scatter of the points about the line, in units of y. */
  residualSd: number;
  n: number;
  firstYear: number;
  lastYear: number;
  /** How far the line itself moves across the window, in units of y. */
  span: number;
}

/**
 * Ordinary least squares with the slope's standard error.
 *
 * The standard error is the point. A trend without one invites the reader to
 * believe a line drawn through noise, which is exactly the mistake this tab is
 * about. Fewer than four points, or a window with no spread in x, gives null.
 */
export function trend(
  xs: readonly number[],
  ys: readonly number[],
  from?: number,
  to?: number
): Trend | null {
  if (xs.length !== ys.length) return null;
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const xi = xs[i];
    const yi = ys[i];
    if (!finite(xi) || !finite(yi)) continue;
    if (from !== undefined && xi < from) continue;
    if (to !== undefined && xi > to) continue;
    x.push(xi);
    y.push(yi);
  }
  const n = x.length;
  if (n < 4) return null;

  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
  }
  if (sxx <= 0) return null;

  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (y[i] - (slope * x[i] + intercept)) ** 2;
  const variance = ss / (n - 2);
  const stderr = Math.sqrt(variance / sxx);
  const first = Math.min(...x);
  const last = Math.max(...x);

  return {
    slope,
    intercept,
    stderr,
    sigma: stderr > 0 ? Math.abs(slope) / stderr : 0,
    residualSd: Math.sqrt(variance),
    n,
    firstYear: first,
    lastYear: last,
    span: slope * (last - first),
  };
}

/**
 * Pearson correlation of two series, matched on a shared x axis.
 *
 * Returns the coefficient, the count, and nothing else: no p value, because a
 * p value on 30 autocorrelated annual points would be more confident than the
 * data deserves.
 */
export function correlate(
  xKeys: readonly number[],
  xs: readonly number[],
  yKeys: readonly number[],
  ys: readonly number[],
  exclude: readonly number[] = []
): { r: number; n: number } | null {
  if (xKeys.length !== xs.length || yKeys.length !== ys.length) return null;
  const skip = new Set(exclude);
  const lookup = new Map<number, number>();
  for (let i = 0; i < yKeys.length; i++) {
    if (finite(ys[i])) lookup.set(yKeys[i], ys[i]);
  }
  const a: number[] = [];
  const b: number[] = [];
  for (let i = 0; i < xKeys.length; i++) {
    const key = xKeys[i];
    if (skip.has(key) || !finite(xs[i])) continue;
    const match = lookup.get(key);
    if (match === undefined) continue;
    a.push(xs[i]);
    b.push(match);
  }
  const n = a.length;
  if (n < 4) return null;

  const ma = a.reduce((p, q) => p + q, 0) / n;
  const mb = b.reduce((p, q) => p + q, 0) / n;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  for (let i = 0; i < n; i++) {
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
    sab += (a[i] - ma) * (b[i] - mb);
  }
  if (saa <= 0 || sbb <= 0) return null;
  return { r: sab / Math.sqrt(saa * sbb), n };
}

/* ----------------------------------------------------------- the ODGI itself */

/**
 * The index, recomputed from its definition.
 *
 * NOAA defines the ODGI as 100 at the peak halogen abundance and 0 at the 1980
 * abundance. That makes it an affine function of the EESC column published
 * beside it, so the index can be rebuilt from the two endpoints. This exists so
 * the tab can show that the rebuild matches the published column, rather than
 * asking the reader to take the index on faith.
 */
export function odgiFrom(eesc: number, peak: number, benchmark: number): number | null {
  if (!finite(eesc) || !finite(peak) || !finite(benchmark)) return null;
  if (peak === benchmark) return null;
  return (100 * (eesc - benchmark)) / (peak - benchmark);
}

export interface IndexCheck {
  /** Worst disagreement between the rebuild and NOAA's column, index points. */
  worst: number;
  mean: number;
  n: number;
}

/** Rebuild every year of the index and measure the disagreement. */
export function checkIndex(g: GasIndex): IndexCheck | null {
  if (g.years.length === 0) return null;
  let worst = 0;
  let total = 0;
  let n = 0;
  for (let i = 0; i < g.years.length; i++) {
    const rebuilt = odgiFrom(g.eescPpt[i], g.peakEescPpt, g.benchmark1980Ppt);
    if (rebuilt === null || !finite(g.odgi[i])) continue;
    const err = Math.abs(rebuilt - g.odgi[i]);
    worst = Math.max(worst, err);
    total += err;
    n++;
  }
  return n === 0 ? null : { worst, mean: total / n, n };
}

/**
 * How far the halogen loading has come back from its peak toward 1980, as a
 * percentage. This is just 100 minus the index, and it is worth naming because
 * the index is easy to read backwards.
 */
export function percentRecovered(g: GasIndex): number | null {
  const latest = g.odgi.at(-1);
  return finite(latest) ? 100 - latest : null;
}

/**
 * Where a straight line through the recent index would cross zero.
 *
 * ARITHMETIC, NOT A FORECAST, and the tab says so next to the number. The decay
 * is not linear: each gas is leaving on its own timescale and the long-lived
 * ones increasingly dominate what is left, which bends the curve. Published
 * assessments run a model with those timescales in it and get an earlier date
 * than this line does. The gap between the two is the honest measure of how
 * much a straight line is worth here.
 */
export function yearsToBenchmark(g: GasIndex, window = 10): number | null {
  const fit = trend(g.years, g.odgi, (g.years.at(-1) ?? 0) - window + 1);
  if (!fit || fit.slope >= 0) return null;
  return -fit.intercept / fit.slope;
}

/* -------------------------------------------------------------- the gases */

/**
 * Published steady-state atmospheric lifetimes, in years.
 *
 * WMO Scientific Assessment of Ozone Depletion 2022, Table A-1. Carried here as
 * constants because a lifetime cannot be measured from an abundance series: the
 * observed decline is the lifetime only if emissions have stopped, and for most
 * of these they have not. The tab shows the published lifetime and the measured
 * decline side by side precisely so the gap between them can be read.
 *
 * The aggregates are null. "Halons" adds up H-1211, H-1301 and H-2402, whose
 * lifetimes differ by a factor of four, and "HCFCs" adds up three compounds
 * between nine and eighteen years. A single number for a sum of unlike things
 * would be an invention.
 */
export const PUBLISHED_LIFETIME_YEARS: Record<string, number | null> = {
  "CFC-12": 102,
  "CFC-11": 52,
  "CFC-113": 93,
  CCl4: 32,
  CH3CCl3: 5.0,
  CH3Cl: 0.9,
  CH3Br: 0.8,
  halons: null,
  HCFCs: null,
  "WMO Minor": null,
};

/**
 * Gases with a large natural source, which the Montreal Protocol cannot touch.
 *
 * Methyl chloride comes mostly from the ocean and from burning vegetation;
 * methyl bromide has big oceanic and biomass sources on top of the fumigant use
 * that was phased out. Their burdens can never fall to zero, so a percentage
 * from peak understates the phase-out and their apparent decay time is not a
 * lifetime. The index counts them anyway, because the stratosphere does not care
 * where a halogen atom came from.
 */
export const LARGELY_NATURAL = new Set(["CH3Cl", "CH3Br"]);

export interface GasResponse {
  name: string;
  peakYear: number;
  peakPpt: number;
  firstYear: number;
  firstPpt: number;
  latestYear: number;
  latestPpt: number;
  /** Negative means the abundance has fallen since its peak. */
  percentFromPeak: number;
  /** Published steady-state lifetime, or null for an aggregate. */
  lifetimeYears: number | null;
  /**
   * E-folding time of the actual decline since the peak, in years, from a fit
   * of log abundance against year. Null whenever the quantity would not mean
   * anything, with the reason in the field below.
   */
  measuredEfoldYears: number | null;
  /**
   * Why there is no measured decay, or null if there is one.
   *
   * THREE DIFFERENT NULLS, and collapsing them into one label was a bug worth
   * recording. HCFCs peaked in 2022 and cannot be fitted yet. Methyl chloride
   * peaked in 1999 and simply has not fallen, which is not the same statement.
   * And methyl bromide HAS fallen, but toward a large natural floor rather than
   * toward zero, so an exponential fit to it returns a number that looks like a
   * lifetime and is not one: 77 years against a published lifetime of 0.8. The
   * module refuses that number rather than printing it next to the other.
   */
  efoldUnavailable:
    | "peaked too recently to fit"
    | "no sustained decline"
    | "falls toward a large natural floor, so a decay time means nothing"
    | null;
  largelyNatural: boolean;
}

/** Every gas in one index table, ordered by how far it has fallen. */
export function gasResponses(g: GasIndex): GasResponse[] {
  const out: GasResponse[] = [];
  for (const name of g.gasNames) {
    const series = g.gases[name];
    if (!series || series.length !== g.years.length || series.length === 0) continue;

    let peakAt = 0;
    for (let i = 1; i < series.length; i++) if (series[i] > series[peakAt]) peakAt = i;
    const peak = series[peakAt];
    const latest = series[series.length - 1];
    if (peak <= 0) continue;

    // Fit the decline in log space, which turns exponential decay into a line.
    // Six points is the floor: HCFCs peaked in 2022 and cannot be fitted at all.
    let efold: number | null = null;
    let unavailable: GasResponse["efoldUnavailable"] = null;
    if (LARGELY_NATURAL.has(name)) {
      unavailable = "falls toward a large natural floor, so a decay time means nothing";
    } else if (series.length - peakAt < 6) {
      unavailable = "peaked too recently to fit";
    } else {
      const xs = g.years.slice(peakAt);
      const ys = series.slice(peakAt).map((v) => (v > 0 ? Math.log(v) : NaN));
      const fit = ys.every(finite) ? trend(xs, ys) : null;
      if (fit && fit.slope < 0) efold = -1 / fit.slope;
      else unavailable = "no sustained decline";
    }

    out.push({
      name,
      peakYear: g.years[peakAt],
      peakPpt: peak,
      firstYear: g.years[0],
      firstPpt: series[0],
      latestYear: g.years[g.years.length - 1],
      latestPpt: latest,
      percentFromPeak: (100 * (latest - peak)) / peak,
      lifetimeYears: PUBLISHED_LIFETIME_YEARS[name] ?? null,
      measuredEfoldYears: efold,
      efoldUnavailable: unavailable,
      largelyNatural: LARGELY_NATURAL.has(name),
    });
  }
  return out.sort((a, b) => a.percentFromPeak - b.percentFromPeak);
}

/**
 * Mean year-on-year change in one gas over a window, in ppt per year.
 *
 * This exists for CFC-11. Its decline slowed by a third between 2013 and 2018,
 * which is how somebody noticed that production had restarted somewhere in
 * breach of the treaty, and it snapped back once enforcement followed. Three
 * calls to this function put that episode on the screen as three numbers.
 */
export function meanChange(
  g: GasIndex,
  name: string,
  from: number,
  to: number
): { pptPerYear: number; n: number } | null {
  const series = g.gases[name];
  if (!series) return null;
  let total = 0;
  let n = 0;
  for (let i = 1; i < g.years.length; i++) {
    const year = g.years[i];
    if (year < from || year > to) continue;
    if (!finite(series[i]) || !finite(series[i - 1])) continue;
    total += series[i] - series[i - 1];
    n++;
  }
  return n === 0 ? null : { pptPerYear: total / n, n };
}

/* ----------------------------------------------------------- the stations */

/**
 * How many readings a month needs before its mean is used.
 *
 * A choice, and it lives here rather than in the fetch script so that it is
 * visible and can be changed by a test. The payload keeps the count beside
 * every mean for the same reason.
 */
export const MIN_OBSERVATIONS_PER_MONTH = 5;

export interface MonthSeries {
  month: number;
  years: number[];
  du: number[];
}

/** One calendar month of one station, as a year series. */
export function monthSeries(
  station: Station,
  month: number,
  minObs = MIN_OBSERVATIONS_PER_MONTH
): MonthSeries | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  const years: number[] = [];
  const du: number[] = [];
  for (let i = 0; i < station.months.length; i++) {
    const key = station.months[i];
    if (Number(key.slice(5, 7)) !== month) continue;
    if (station.obs[i] < minObs) continue;
    years.push(Number(key.slice(0, 4)));
    du.push(station.du[i]);
  }
  return years.length === 0 ? null : { month, years, du };
}

export interface EraChange {
  month: number;
  beforeDu: number;
  beforeYears: number;
  afterDu: number;
  afterYears: number;
  deltaDu: number;
  percent: number;
}

/**
 * Mean column in each of two eras, month by month.
 *
 * This is the whole physics argument of the tab in one table. At the South Pole
 * the loss is not spread across the year: January is down a few percent and
 * October is down about half. The depletion is a SEASON. Chlorine sits inert
 * through the polar winter, gets converted on the surfaces of stratospheric
 * clouds that only form in extreme cold, and is then set loose by the returning
 * sun over a few weeks of spring.
 *
 * A month needs at least `minYears` years in both eras, so a station that only
 * observed a month twice does not produce a confident-looking difference.
 */
export function eraChange(
  station: Station,
  before: [number, number],
  after: [number, number],
  minYears = 3,
  minObs = MIN_OBSERVATIONS_PER_MONTH
): EraChange[] {
  const out: EraChange[] = [];
  for (let month = 1; month <= 12; month++) {
    const series = monthSeries(station, month, minObs);
    if (!series) continue;
    const pick = (lo: number, hi: number) =>
      series.du.filter((_, i) => series.years[i] >= lo && series.years[i] <= hi);
    const a = pick(before[0], before[1]);
    const b = pick(after[0], after[1]);
    if (a.length < minYears || b.length < minYears) continue;
    const ma = a.reduce((p, q) => p + q, 0) / a.length;
    const mb = b.reduce((p, q) => p + q, 0) / b.length;
    if (ma <= 0) continue;
    out.push({
      month,
      beforeDu: ma,
      beforeYears: a.length,
      afterDu: mb,
      afterYears: b.length,
      deltaDu: mb - ma,
      percent: (100 * (mb - ma)) / ma,
    });
  }
  return out;
}

/** The month that lost the most, and how much. Null if nothing can be compared. */
export function worstMonth(changes: readonly EraChange[]): EraChange | null {
  let worst: EraChange | null = null;
  for (const c of changes) if (!worst || c.percent < worst.percent) worst = c;
  return worst;
}

export interface StationRung {
  station: Station;
  worst: EraChange | null;
  /** Every month compared, so the seasonal shape can be drawn. */
  changes: EraChange[];
}

/**
 * The latitude ladder, south to north.
 *
 * The comparison that settles it is the South Pole against Utqiagvik. Both are
 * polar, both spend months in darkness, both sit under the same global burden of
 * chlorine. One lost about half its October ozone and the other lost a few
 * percent, because only the Antarctic vortex gets cold enough for long enough.
 *
 * Lauder appears without a comparison: it started observing in 1987, after the
 * hole existed, so it has no before. Stating that is better than borrowing a
 * baseline from somewhere else.
 */
export function latitudeLadder(
  data: OzoneData,
  before: [number, number],
  after: [number, number]
): StationRung[] {
  return [...data.stations]
    .sort((a, b) => a.lat - b.lat)
    .map((station) => {
      const changes = eraChange(station, before, after);
      return { station, worst: worstMonth(changes), changes };
    });
}

/** Which observation kinds this station used, commonest first. */
export function observationKinds(station: Station): Array<{ kind: string; count: number }> {
  return Object.entries(station.kinds)
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Months in which a station measured the column by moonlight.
 *
 * A Dobson spectrophotometer compares two ultraviolet wavelengths in a beam of
 * sunlight. At the South Pole the sun is below the horizon for half the year, so
 * the observers point it at the moon instead, which is why there is a winter at
 * all in a record that would otherwise stop every April.
 */
/**
 * Airmass by month, ascending by month.
 *
 * The equinox months at the South Pole sit at an airmass past seven, which is
 * the reason they are nearly absent from a record that otherwise runs from 1963.
 * The instrument is not broken and nobody went home: the sun is on the horizon
 * and the light has to come through seven atmospheres to reach it.
 */
export function airmassByMonth(station: Station): Array<{ month: number; mu: number }> {
  return Object.entries(station.medianAirmass)
    .map(([month, mu]) => ({ month: Number(month), mu }))
    .filter((m) => Number.isInteger(m.month) && m.month >= 1 && m.month <= 12)
    .sort((a, b) => a.month - b.month);
}

export function moonlightMonths(station: Station): Array<{ month: number; count: number }> {
  return Object.entries(station.moonMonths)
    .map(([month, count]) => ({ month: Number(month), count }))
    .filter((m) => Number.isInteger(m.month) && m.month >= 1 && m.month <= 12)
    .sort((a, b) => a.month - b.month);
}

/* ------------------------------------------------- one sky, two instruments */

export interface CrossCheck {
  /** Correlation between the ground station month and the satellite minimum. */
  r: number;
  n: number;
  firstYear: number;
  lastYear: number;
  stationCode: string;
  month: number;
}

/**
 * A ground spectrophotometer against a satellite.
 *
 * These are not the same quantity. The station number is a monthly mean of the
 * column directly over one hut at the South Pole; the satellite number is the
 * lowest column anywhere on the Antarctic cap in a three-week window. They are
 * measured by different instruments, in different decades, with no shared
 * calibration and no shared processing chain.
 *
 * They should still move together, and the size of the correlation is the
 * honest statement of how far the two records corroborate each other. Nothing
 * here is fitted to make them agree.
 */
export function crossCheck(
  data: OzoneData,
  stationCode = "SPO",
  month = 10
): CrossCheck | null {
  const station = data.stations.find((s) => s.code === stationCode);
  if (!station) return null;
  const series = monthSeries(station, month);
  if (!series) return null;
  const c = correlate(series.years, series.du, data.hole.years, data.hole.minimumDu);
  if (!c) return null;

  const shared = series.years.filter((y) => data.hole.years.includes(y));
  return {
    r: c.r,
    n: c.n,
    firstYear: Math.min(...shared),
    lastYear: Math.max(...shared),
    stationCode,
    month,
  };
}

/**
 * Does the measured chlorine explain the measured hole?
 *
 * Over the years both series exist, barely. This function is here so the tab
 * can print the number instead of implying an answer. See the module header.
 */
export function causeVersusEffect(
  data: OzoneData,
  exclude: readonly number[] = []
): { area: number; minimum: number; n: number } | null {
  const g = data.odgi.antarctic;
  const a = correlate(g.years, g.eescPpt, data.hole.years, data.hole.areaMillionKm2, exclude);
  const m = correlate(g.years, g.eescPpt, data.hole.years, data.hole.minimumDu, exclude);
  if (!a || !m) return null;
  return { area: a.r, minimum: m.r, n: a.n };
}

/**
 * The two years the Antarctic vortex fell apart early.
 *
 * In 2002 the vortex split in a sudden stratospheric warming, and in 2019 it
 * warmed sharply again. Both produced the smallest holes of the modern record,
 * and neither had anything to do with chlorine: the chemicals above Antarctica
 * in 2019 were barely different from 2018 or 2020, when the hole was twice the
 * size. These are named here so that a reader who remembers the 2019 headlines
 * can see what they were about.
 */
export const SUDDEN_WARMING_YEARS = [2002, 2019] as const;

/* ----------------------------------------------------------- what is claimed */

export const THRESHOLD_IS_A_CONVENTION_NOTE =
  "The edge of the hole is drawn at 220 Dobson Units, and that is a choice rather than a natural boundary. NASA picked it because column values below 220 had not been seen anywhere before 1979 and because an aircraft campaign showed that getting below 220 takes catalysed chlorine and bromine loss. It sits under two standard deviations below the pre-hole spring mean at the South Pole, so it is close to, not far from, what the atmosphere used to do on a bad year. Every hole area on this page is the area inside that line. A different line would give a different area and the same ozone.";

export const AREA_IS_A_NOISY_DETECTOR_NOTE =
  "The hole area and the minimum column are the two numbers reported every October, and they are the noisiest way to look at this. The size of the hole in a given year is set mostly by how cold and how stable the polar vortex was, which swings far harder from year to year than the chemicals move in a decade. The trend and its uncertainty are both computed here rather than described, and the slope is compared with its own standard error so the reader can see whether the line is worth drawing.";

export const WINDOW_CHANGES_THE_ANSWER_NOTE =
  "Fitting a straight line from 1979 says the hole is growing, and fitting one from 2000 says it is not doing anything. Both are true about straight lines and neither is the physics, because the first window contains the onset. The tab lets the window be changed for that reason, and reports the number of standard errors alongside every slope.";

export const CAUSE_AND_EFFECT_NOTE =
  "Correlating the measured halogen loading against the measured hole area, over the thirty-odd years both series exist, gives almost nothing, and what little there is points the wrong way. That is not an argument against the Montreal Protocol. The chemistry is not in doubt, and the chemicals are unambiguously falling. It means the hole area, over this window, is dominated by weather rather than by chemistry, and published detections of healing use metrics chosen to get around exactly that. A page that showed the falling chemicals and left this number out would be making a claim it had not checked.";

export const NO_ARCTIC_HOLE_NOTE =
  "There is no Arctic ozone hole, and the reason is not latitude or darkness. Utqiagvik at 71 North spends months without sun under the same global burden of chlorine as the South Pole, and lost a few percent of its March column while the South Pole lost about half of its October one. The Antarctic vortex is colder, more circular and better sealed, because the Southern Hemisphere has almost no mountains or land-sea contrast at those latitudes to launch the waves that stir a vortex up. Cold enough for long enough is what grows the clouds that make the chlorine dangerous, and only the south reliably gets there.";

export const NATURAL_SOURCES_NOTE =
  "Two of the ten gases in the index are mostly natural. Methyl chloride comes from the ocean and from burning vegetation, and methyl bromide has large oceanic and biomass sources under the fumigant use that was phased out. Their abundances can never fall to zero, so their distance from peak understates the phase-out. They are counted anyway, because a bromine atom destroys ozone without regard to where it came from.";

export const HCFC_TRADE_NOTE =
  "The replacements are in this table too. HCFCs were what the CFCs were swapped for, and they went up while everything else came down, peaking only in the last few years. They damage ozone far less per molecule and they are also potent greenhouse gases, which is why they in turn got a phase-down schedule. The index treats the trade honestly: it counts the replacement at its real, smaller weight rather than pretending the substitution was free.";

export const LIFETIME_NOTE =
  "The published lifetime and the measured decline are shown side by side, and for most of these gases they do not match. That gap is the information. A burden falls at its lifetime only once emissions have stopped: methyl chloroform, genuinely gone and with a five year lifetime, is the one that matches. The CFCs are still leaking out of old foam and old refrigerators, so they are leaving more slowly than their chemistry alone would take them.";

export const CFC11_NOTE =
  "CFC-11's decline slowed by about a third between 2013 and 2018 and then went back to its old rate. That slowdown is how the world found out that someone had restarted production in breach of the treaty; the abundance recovering its trend afterwards is what enforcement looks like in the global background air. It is visible in this table as three averages, which is roughly how it was found.";

export const SATELLITE_GAP_NOTE =
  "There is no 1995 in the satellite record. Nimbus-7 stopped working in 1993, Meteor-3 ended the following year, and the next mapping instrument did not fly until August 1996, so nobody measured the 1995 hole. The gap is carried as a missing year rather than closed up, because a series indexed by position instead of by year shifts everything after 1994 by one and nothing complains.";

export const MOONLIGHT_NOTE =
  "A Dobson spectrophotometer works by comparing two ultraviolet wavelengths in a beam of sunlight, and at the South Pole the sun is down for half the year. The observers point it at the moon instead. That is why the South Pole has a winter at all in a record that would otherwise stop every April, and the observation kind is kept in the data so the switch can be seen rather than described.";

export const SURFACE_OZONE_NOTE =
  "This is the same molecule the air tab scores as a pollutant, and both are right. Ozone at 25 km absorbs the ultraviolet that would otherwise reach the ground; ozone at head height is a lung irritant with a health limit attached. Roughly a tenth of the column is down in the troposphere. Good up there, bad down here, and the two tabs are measuring the same three millimetres from opposite ends.";

export const NOT_A_FORECAST_NOTE =
  "No recovery date is predicted here. The tab will extend the recent slope of the index to the axis if asked, and labels the result as arithmetic, because it is: the decay is not a straight line, since each gas is leaving on its own timescale and the long-lived ones take over what remains. Published assessments run a model with those timescales in it and get an earlier answer than this line does. The distance between the two is the honest measure of what a straight line is worth here.";
