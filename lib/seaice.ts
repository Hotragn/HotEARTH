/**
 * Sea ice, from the NSIDC Sea Ice Index.
 *
 * THE LOAD-BEARING IDEA of this tab is that "how much sea ice is there" has two
 * answers that differ by a third, and the difference is a decision made by
 * scientists rather than anything the ice is doing.
 *
 * EXTENT counts a grid cell as ice if at least 15% of it is ice. AREA adds up
 * the actual fractions. Extent is therefore always the bigger number, by about
 * a quarter to two fifths, and the 15% is a convention: it is the level at which
 * the passive microwave signal can be trusted, not a level at which the ocean
 * changes character. Almost every headline number is extent. This tab shows
 * both, and the gap between them, because the gap is the leads, the melt ponds
 * and the ragged edge of the pack.
 *
 * THE SECOND IDEA is that the Arctic and the Antarctic are not mirror images and
 * were never doing the same thing. The Arctic is an ocean surrounded by land, and
 * its September ice has fallen relentlessly: 0.76 million square km a decade,
 * thirteen times its own standard error. The Antarctic is land surrounded by
 * ocean, and its February ice ROSE by 0.13 a decade for the first thirty-five
 * years of the record, then fell by 0.92 a decade after 2014. Both of those are
 * about two sigma, so both are real, and the full-record trend that contains
 * them is 1.5 sigma, which is nothing at all.
 *
 * One series, then, holding a real rise, a real fall, and a total
 * indistinguishable from no change. That is not a paradox, it is what a change
 * of regime looks like, and it is why every slope on this tab is printed with
 * its window and its error bar instead of on its own.
 *
 * THE THIRD, stated because it is the most common error: sea ice is floating, so
 * melting it does not raise sea level. Floating ice already displaces its own
 * weight. Sea level rise comes from LAND ice, from Greenland and Antarctica, and
 * from the ocean expanding as it warms. None of that is in this dataset and none
 * of it is computed here.
 *
 * Sources
 *   NSIDC Sea Ice Index, Version 4, National Snow and Ice Data Center, Boulder.
 *   Monthly and daily extent and area, both hemispheres, from the passive
 *   microwave record that begins on 26 October 1978.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export type Hemisphere = "north" | "south";

/** The first complete year of the record. 1978 has only November and December. */
export const FIRST_FULL_YEAR = 1979;

/** The concentration threshold that defines extent. A convention, not a boundary. */
export const EXTENT_THRESHOLD_PERCENT = 15;

/** NSIDC's own reference period for the daily percentile band. */
export const CLIMATOLOGY_YEARS: readonly [number, number] = [1981, 2010];

export interface MonthlySeries {
  month: number;
  years: number[];
  /** millions of square km; null where the record has a gap */
  extent: Array<number | null>;
  area: Array<number | null>;
  /** years with no value at all, e.g. the satellite outage of 1987 to 1988 */
  missing: number[];
  /** which underlying product covered which years */
  sources: Record<string, [number, number]>;
}

export interface DailyYear {
  year: number;
  doy: number[];
  extent: number[];
}

export interface Climatology {
  doy: number[];
  average: number[];
  p10: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p90: number[];
}

export interface HemisphereData {
  hemisphere: Hemisphere;
  monthly: Record<number, MonthlySeries>;
  daily: Record<number, DailyYear>;
  climatology: Climatology | null;
  /** the month that carries the annual minimum: September north, February south */
  minimumMonth: number;
  recordMinimumYear: number | null;
}

export interface SeaIceData {
  north: HemisphereData | null;
  south: HemisphereData | null;
  generated: Date | null;
  credit: string;
}

// ─────────────────────────────────── parsing ─────────────────────────────────

/** Bad input gives null rather than a half-built record. */
export function parseSeaIce(raw: unknown): SeaIceData {
  const empty: SeaIceData = { north: null, south: null, generated: null, credit: "" };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;
  const hemis = r.hemispheres;
  if (!hemis || typeof hemis !== "object") return empty;

  const generated =
    typeof r.generated === "string" && !Number.isNaN(Date.parse(r.generated))
      ? new Date(r.generated)
      : null;

  return {
    north: parseHemisphere("north", (hemis as Record<string, unknown>).north),
    south: parseHemisphere("south", (hemis as Record<string, unknown>).south),
    generated,
    credit: typeof r.credit === "string" ? r.credit : "",
  };
}

function parseHemisphere(hemisphere: Hemisphere, raw: unknown): HemisphereData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const monthly: Record<number, MonthlySeries> = {};
  const rawMonthly = r.monthly;
  if (rawMonthly && typeof rawMonthly === "object") {
    for (const [key, value] of Object.entries(rawMonthly as Record<string, unknown>)) {
      const month = Number(key);
      if (!finite(month) || month < 1 || month > 12) continue;
      const s = parseMonthly(month, value);
      if (s) monthly[month] = s;
    }
  }
  if (Object.keys(monthly).length === 0) return null;

  const daily: Record<number, DailyYear> = {};
  const rawDaily = r.daily;
  if (rawDaily && typeof rawDaily === "object") {
    for (const [key, value] of Object.entries(rawDaily as Record<string, unknown>)) {
      const year = Number(key);
      if (!finite(year)) continue;
      const d = parseDaily(year, value);
      if (d) daily[year] = d;
    }
  }

  const minimumMonth = finite(r.minimumMonth)
    ? r.minimumMonth
    : hemisphere === "north"
      ? 9
      : 2;

  return {
    hemisphere,
    monthly,
    daily,
    climatology: parseClimatology(r.climatology),
    minimumMonth,
    recordMinimumYear: finite(r.recordMinimumYear) ? r.recordMinimumYear : null,
  };
}

function parseMonthly(month: number, raw: unknown): MonthlySeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const years = r.years;
  const extent = r.extent;
  const area = r.area;
  if (!Array.isArray(years) || !Array.isArray(extent) || !Array.isArray(area)) return null;
  if (years.length === 0) return null;
  if (extent.length !== years.length || area.length !== years.length) return null;

  const outYears: number[] = [];
  const outExtent: Array<number | null> = [];
  const outArea: Array<number | null> = [];

  for (let i = 0; i < years.length; i++) {
    const y = years[i];
    if (!finite(y)) return null;
    // Years must be strictly increasing, or a trend fit is meaningless.
    if (outYears.length > 0 && y <= outYears[outYears.length - 1]) return null;
    const e = finite(extent[i]) ? (extent[i] as number) : null;
    const a = finite(area[i]) ? (area[i] as number) : null;
    // Extent counts partly covered cells in full, so it can never be smaller
    // than area. If it is, the columns are swapped and nothing below is safe.
    if (e !== null && a !== null && a > e) return null;
    outYears.push(y);
    outExtent.push(e);
    outArea.push(a);
  }

  const sources: Record<string, [number, number]> = {};
  if (r.sources && typeof r.sources === "object") {
    for (const [k, v] of Object.entries(r.sources as Record<string, unknown>)) {
      if (Array.isArray(v) && v.length === 2 && finite(v[0]) && finite(v[1])) {
        sources[k] = [v[0], v[1]];
      }
    }
  }

  return {
    month,
    years: outYears,
    extent: outExtent,
    area: outArea,
    missing: outYears.filter((_, i) => outExtent[i] === null),
    sources,
  };
}

function parseDaily(year: number, raw: unknown): DailyYear | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.doy) || !Array.isArray(r.extent)) return null;
  if (r.doy.length !== r.extent.length || r.doy.length === 0) return null;
  const doy: number[] = [];
  const extent: number[] = [];
  for (let i = 0; i < r.doy.length; i++) {
    if (!finite(r.doy[i]) || !finite(r.extent[i])) continue;
    doy.push(r.doy[i] as number);
    extent.push(r.extent[i] as number);
  }
  if (doy.length === 0) return null;
  return { year, doy, extent };
}

function parseClimatology(raw: unknown): Climatology | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const keys = ["doy", "average", "p10", "p25", "p50", "p75", "p90"] as const;
  for (const k of keys) if (!Array.isArray(r[k])) return null;
  const n = (r.doy as unknown[]).length;
  if (n === 0) return null;
  for (const k of keys) if ((r[k] as unknown[]).length !== n) return null;
  const out = {} as Climatology;
  for (const k of keys) {
    const arr = (r[k] as unknown[]).map((v) => (finite(v) ? v : NaN));
    if (arr.some((v) => Number.isNaN(v))) return null;
    (out as unknown as Record<string, number[]>)[k] = arr;
  }
  // The percentiles must be ordered on every day, or a column was misread.
  for (let i = 0; i < n; i++) {
    if (!(out.p10[i] <= out.p25[i] && out.p25[i] <= out.p50[i])) return null;
    if (!(out.p50[i] <= out.p75[i] && out.p75[i] <= out.p90[i])) return null;
  }
  return out;
}

// ─────────────────────────────────── trends ──────────────────────────────────

export interface Trend {
  /** millions of square km per decade */
  perDecade: number;
  stdErrPerDecade: number;
  /** as a percentage of the reference-period mean, which is how NSIDC quotes it */
  percentPerDecade: number | null;
  /** the mean the percentage is relative to */
  referenceMean: number | null;
  referenceYears: readonly [number, number];
  from: number;
  to: number;
  /** how many years actually contributed */
  n: number;
}

/**
 * Least squares trend over a window, with its standard error.
 *
 * Refuses windows shorter than ten years, for the same reason the climate tab
 * does: sea ice is noisy year to year, a short window can be made to say almost
 * anything, and a slope without an error bar is a rhetorical device rather than
 * a measurement.
 *
 * The percentage is expressed against a REFERENCE MEAN rather than against the
 * first year, because dividing by one noisy year is how a trend gets inflated.
 * NSIDC uses the 1981 to 2010 average and so does this.
 */
export function trend(
  series: MonthlySeries | null,
  from: number,
  to: number,
  field: "extent" | "area" = "extent",
  referenceYears: readonly [number, number] = CLIMATOLOGY_YEARS
): Trend | null {
  if (!series || !finite(from) || !finite(to)) return null;
  if (to - from < 9) return null; // ten years inclusive

  const values = field === "extent" ? series.extent : series.area;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < series.years.length; i++) {
    const y = series.years[i];
    const v = values[i];
    if (y < from || y > to) continue;
    if (v === null) continue; // a gap is skipped, never filled in
    xs.push(y);
    ys.push(v);
  }
  if (xs.length < 10) return null;

  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) * (xs[i] - mx);
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;

  let ss = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (intercept + slope * xs[i]);
    ss += r * r;
  }
  const stdErr = Math.sqrt(ss / (n - 2)) / Math.sqrt(sxx);

  const refMean = mean(series, referenceYears[0], referenceYears[1], field);

  return {
    perDecade: slope * 10,
    stdErrPerDecade: stdErr * 10,
    percentPerDecade: refMean !== null && refMean > 0 ? ((slope * 10) / refMean) * 100 : null,
    referenceMean: refMean,
    referenceYears,
    from: xs[0],
    to: xs[n - 1],
    n,
  };
}

/** Mean over a window, or null if the window has fewer than three usable years. */
export function mean(
  series: MonthlySeries | null,
  from: number,
  to: number,
  field: "extent" | "area" = "extent"
): number | null {
  if (!series || !finite(from) || !finite(to)) return null;
  const values = field === "extent" ? series.extent : series.area;
  const vals: number[] = [];
  for (let i = 0; i < series.years.length; i++) {
    const y = series.years[i];
    if (y < from || y > to) continue;
    const v = values[i];
    if (v !== null) vals.push(v);
  }
  if (vals.length < 3) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * The trend for every month of the year.
 *
 * This is where the Arctic story stops being one number. The September ice is
 * disappearing several times faster than the March ice, because what is going is
 * the ice that used to survive the summer. A single annual figure hides that
 * completely.
 */
export function trendByMonth(
  hemi: HemisphereData | null,
  from = FIRST_FULL_YEAR,
  to = 3000
): Array<{ month: number; trend: Trend | null }> {
  if (!hemi) return [];
  const out: Array<{ month: number; trend: Trend | null }> = [];
  for (let m = 1; m <= 12; m++) {
    out.push({ month: m, trend: trend(hemi.monthly[m] ?? null, from, to) });
  }
  return out;
}

// ────────────────────────────── records and ranks ────────────────────────────

export interface YearValue {
  year: number;
  value: number;
}

/** Lowest and highest years in a series, and the most recent value. */
export function extremes(
  series: MonthlySeries | null,
  field: "extent" | "area" = "extent"
): { lowest: YearValue; highest: YearValue; latest: YearValue } | null {
  if (!series) return null;
  const values = field === "extent" ? series.extent : series.area;
  const pairs: YearValue[] = [];
  for (let i = 0; i < series.years.length; i++) {
    const v = values[i];
    if (v !== null) pairs.push({ year: series.years[i], value: v });
  }
  if (pairs.length === 0) return null;
  let lowest = pairs[0];
  let highest = pairs[0];
  for (const p of pairs) {
    if (p.value < lowest.value) lowest = p;
    if (p.value > highest.value) highest = p;
  }
  return { lowest, highest, latest: pairs[pairs.length - 1] };
}

/**
 * Where a year ranks, counting from the lowest. 1 is the record low.
 *
 * Returns null for a year with no value rather than pretending it ranks last,
 * which is what happens if you sort nulls.
 */
export function rankLowest(
  series: MonthlySeries | null,
  year: number,
  field: "extent" | "area" = "extent"
): { rank: number; outOf: number } | null {
  if (!series || !finite(year)) return null;
  const values = field === "extent" ? series.extent : series.area;
  const i = series.years.indexOf(year);
  if (i < 0) return null;
  const target = values[i];
  if (target === null) return null;
  const usable = values.filter((v): v is number => v !== null);
  const below = usable.filter((v) => v < target).length;
  return { rank: below + 1, outOf: usable.length };
}

// ───────────────────────── the convention, made visible ──────────────────────

export interface ExtentAreaGap {
  year: number;
  extent: number;
  area: number;
  /** millions of square km counted as ice by extent but not by area */
  gap: number;
  /** that gap as a fraction of extent */
  fraction: number;
}

/**
 * The difference between the two ways of counting, for one year.
 *
 * Not a small correction: through the summer melt it runs at a third of the
 * headline number. Every cell between 15% and 100% ice contributes the part of
 * itself that is open water, and in the melt season that is most of the pack
 * edge, plus every lead and melt pond wide enough for the sensor to notice.
 */
export function extentAreaGap(
  series: MonthlySeries | null,
  year: number
): ExtentAreaGap | null {
  if (!series || !finite(year)) return null;
  const i = series.years.indexOf(year);
  if (i < 0) return null;
  const extent = series.extent[i];
  const area = series.area[i];
  if (extent === null || area === null || !(extent > 0)) return null;
  return { year, extent, area, gap: extent - area, fraction: (extent - area) / extent };
}

// ──────────────────────────────── the daily curve ────────────────────────────

/** The lowest and highest day of a year's daily curve. */
export function dailyExtremes(
  d: DailyYear | null
): { minimum: { doy: number; extent: number }; maximum: { doy: number; extent: number }; complete: boolean } | null {
  if (!d || d.doy.length === 0) return null;
  let lo = 0;
  let hi = 0;
  for (let i = 1; i < d.extent.length; i++) {
    if (d.extent[i] < d.extent[lo]) lo = i;
    if (d.extent[i] > d.extent[hi]) hi = i;
  }
  return {
    minimum: { doy: d.doy[lo], extent: d.extent[lo] },
    maximum: { doy: d.doy[hi], extent: d.extent[hi] },
    // A year still in progress has not had its minimum yet, and saying so
    // matters more than the number does.
    complete: d.doy[d.doy.length - 1] >= 365,
  };
}

export interface BandPosition {
  doy: number;
  extent: number;
  /** the 1981-2010 percentiles for that day */
  p10: number;
  p50: number;
  p90: number;
  /** plain-language placement, e.g. "below the 10th percentile" */
  label: string;
}

/**
 * Where a day's extent falls inside NSIDC's own 1981 to 2010 percentile band.
 *
 * The percentiles are theirs, not computed here, which matters: a percentile
 * needs the full daily record for thirty years, and this tab mirrors only a few
 * years of it. Reporting a band position from data you do not have would be
 * exactly the sort of quiet fabrication this project exists not to do.
 */
export function bandPosition(
  clim: Climatology | null,
  doy: number,
  extent: number
): BandPosition | null {
  if (!clim || !finite(doy) || !finite(extent)) return null;
  const i = clim.doy.indexOf(Math.round(doy));
  if (i < 0) return null;
  const label =
    extent < clim.p10[i]
      ? "below the 10th percentile of 1981 to 2010"
      : extent < clim.p25[i]
        ? "in the bottom quarter of 1981 to 2010"
        : extent < clim.p75[i]
          ? "inside the middle half of 1981 to 2010"
          : extent < clim.p90[i]
            ? "in the top quarter of 1981 to 2010"
            : "above the 90th percentile of 1981 to 2010";
  return { doy, extent, p10: clim.p10[i], p50: clim.p50[i], p90: clim.p90[i], label };
}

/** Calendar date of a day number, for labelling. Uses a non-leap year. */
export function doyLabel(doy: number): string {
  if (!finite(doy) || doy < 1 || doy > 366) return "unknown";
  const d = new Date(Date.UTC(2001, 0, 1));
  d.setUTCDate(doy);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─────────────────────────────── honesty copy ────────────────────────────────

export const THRESHOLD_NOTE =
  "Extent counts a grid cell as ice if at least 15 percent of it is ice; area adds up the actual fractions. Extent is therefore always the larger number, by roughly a quarter to two fifths, and the 15 percent is a convention: it is where the passive microwave signal becomes trustworthy, not a level at which the ocean changes character. Almost every headline number you have read is extent.";

export const POLE_HOLE_NOTE =
  "There is a hole in this data directly over the pole, because the satellites' orbits do not pass over it. For extent, that hole is ASSUMED to be ice-covered. It nearly always is, and it is still an assumption, and it has shrunk as instruments changed, so the assumption covers less area now than it did in 1979.";

export const TWO_POLES_NOTE =
  "The Arctic is an ocean ringed by land; the Antarctic is land ringed by ocean. They were never going to behave alike, and they have not. Arctic September ice has fallen without interruption. Antarctic February ice rose by 0.13 million square km a decade for the first thirty-five years of the satellite record, then fell by 0.92 a decade after 2014, seven times steeper in the opposite direction. Both are honest arithmetic on the same file, which is how one dataset came to be quoted on both sides of an argument.";

export const CERTAINTY_NOTE =
  "Two numbers that look alike can be nothing alike. The Arctic September decline is 13 times its own standard error; the Antarctic full-record trend is 1.5 times, which is not significant at all. Meanwhile the Antarctic rise to 2014 and the fall since are each about 2 sigma, so this one series holds a real rise, a real fall, and a total indistinguishable from no change. Every slope on this page is printed with its error bar and its window, because without those a trend is a rhetorical device.";

export const SEA_LEVEL_NOTE =
  "Melting sea ice does not raise sea level. It is already floating, and floating ice displaces its own weight. Sea level rise comes from LAND ice, from Greenland and Antarctica, and from the ocean expanding as it warms. None of that is in this dataset and none of it is computed here.";

export const VOLUME_NOTE =
  "This is area, not volume, and the volume has fallen further than the area has. Thickness cannot be measured by these instruments: it needs altimetry from ICESat-2 and CryoSat-2, or submarine sonar. Old thick ice being replaced by thin young ice is invisible in every number on this page.";

export const RECORD_START_NOTE =
  "The consistent satellite record begins on 26 October 1978, which is why nothing here reaches further back. October 1978 has no monthly value at all, because six days is not a month. Earlier ice charts exist, from ships and aircraft and coastal observers, and they are not comparable to this, so they are not spliced onto it.";

export const OUTAGE_NOTE =
  "December 1987 and January 1988 are missing from both hemispheres: the satellite failed. Those months are left empty rather than interpolated, and every trend here skips them instead of filling them in.";

export const INSTRUMENT_NOTE =
  "The instrument under the trend line changed more than once, and the Sea Ice Index is reprocessed as calibrations improve, so figures quoted from an older version of this record differ slightly from these. The product covering each stretch of years is listed on this page for exactly that reason.";

export const WINDOW_NOTE =
  "A trend depends on when you stop. The Arctic September decline reads 13.6 percent per decade if you end at 2012, the record low year, and 11.9 percent if you carry on to today. Neither is wrong. Ending a trend on a record is what makes it look steepest, which is why the window is printed next to every number here.";
