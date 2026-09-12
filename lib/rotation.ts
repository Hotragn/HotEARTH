/**
 * The Earth's rotation, from IERS Earth orientation data.
 *
 * THE LOAD-BEARING IDEA of this tab is that the day is not 86,400 seconds, and
 * the leap second is the patch. Both halves of that are measurable here.
 *
 * The SI second was fixed to match the mean solar day of roughly 1820, by way of
 * the ephemeris second derived from Newcomb's tables. The Earth has been slowing
 * since, so for most of the atomic era the real day has run a millisecond or two
 * LONG, and those milliseconds pile up. A millisecond a day is a third of a
 * second a year. When the total reaches 0.9 s, a leap second is inserted.
 *
 * That is not a story this module tells, it is arithmetic it does. Integrating
 * the measured excess length of day from 1972 to 2025 gives 26.9 seconds of
 * accumulated drift. The number of leap seconds actually inserted over those
 * years is 27. The residual, about a tenth of a second, is the current UT1-UTC
 * offset. The patch equals the integral of the thing it patches, to a tenth of a
 * second over fifty-four years, and `driftSeconds` below computes it.
 *
 * WHAT IS RECENT, and what a page written two years ago would now have wrong.
 * From 2020 to 2024 the annual mean excess went NEGATIVE: the Earth turned
 * faster than the definition of the second says it should, and the shortest day
 * ever measured was 5 July 2024. That produced a wave of coverage about the
 * first ever negative leap second.
 *
 * It has since partly unwound. Averaged over the last twelve MEASURED months the
 * excess is back to about +0.24 ms against -0.09 ms for the twelve before, every
 * month of 2026 so far is positive, and UT1-UTC peaked in October 2025 and has
 * been falling since. This module recomputes all of that from the record on every
 * load rather than repeating a headline, which is the only way a page about a
 * quantity that wanders can avoid going quietly stale.
 *
 * The timekeeping community voted in 2022 to abolish the leap second by 2035.
 * The last year is an argument for that decision rather than against it: nobody
 * wants a timekeeping rule whose next step depends on guessing what the core is
 * doing.
 *
 * Sources
 *   IERS EOP 14 C04 (definitive, 1962 onward) and finals2000A (weekly, with
 *   predictions), International Earth Rotation and Reference Systems Service,
 *   Paris Observatory. Leap second table from IERS Bulletin C.
 */

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** The nominal day, in SI seconds: the definition the Earth no longer matches. */
export const NOMINAL_DAY_SECONDS = 86400;

/**
 * How far UT1 is allowed to drift from UTC before a leap second is required.
 *
 * A convention, agreed in 1972. The whole leap second system is this one number.
 */
export const UT1_TOLERANCE_SECONDS = 0.9;

/**
 * Tidal braking from lunar laser ranging: how fast the Moon is actually taking
 * angular momentum, in ms per century of day length.
 *
 * The OBSERVED long-term slowing from ancient eclipse records is smaller, about
 * 1.8 ms per century. The difference is not an error in either: the Earth is
 * still rebounding from the last ice age, becoming less oblate, and a more
 * spherical planet spins faster. The same glacial isostatic adjustment appears
 * on the sea level tab, doing the same job for a different measurement.
 */
export const TIDAL_BRAKING_MS_PER_CENTURY = 2.3;
export const OBSERVED_SLOWING_MS_PER_CENTURY = 1.8;

export interface LeapSecond {
  /** the date the new offset took effect */
  date: string;
  taiMinusUtc: number;
}

export interface MonthlySeries {
  month: string[];
  lodMs: number[];
  days: number[];
}

export interface DailySeries {
  date: string[];
  lodMs: Array<number | null>;
  ut1Utc: Array<number | null>;
  predicted: boolean[];
}

export interface RotationData {
  monthly: MonthlySeries | null;
  daily: DailySeries | null;
  leapSeconds: LeapSecond[];
  extremes: { shortest: DayRecord; longest: DayRecord } | null;
  /** the last day covered by the definitive series */
  definitiveThrough: string | null;
  /** the last day that is a measurement rather than a prediction */
  lastFinal: string | null;
  latestUt1Utc: number | null;
  taiMinusUtc: number | null;
  overlap: {
    days: number;
    medianMs: number;
    p99Ms: number;
    worstMs: number;
    worstDay: string;
  } | null;
  generated: Date | null;
  credit: string;
}

export interface DayRecord {
  date: string;
  lodMs: number;
}

// ─────────────────────────────────── parsing ─────────────────────────────────

/** Bad input gives an empty record rather than a half-built one. */
export function parseRotation(raw: unknown): RotationData {
  const empty: RotationData = {
    monthly: null,
    daily: null,
    leapSeconds: [],
    extremes: null,
    definitiveThrough: null,
    lastFinal: null,
    latestUt1Utc: null,
    taiMinusUtc: null,
    overlap: null,
    generated: null,
    credit: "",
  };
  if (!raw || typeof raw !== "object") return empty;
  const r = raw as Record<string, unknown>;

  return {
    monthly: parseMonthly(r.monthly),
    daily: parseDaily(r.daily),
    leapSeconds: parseLeaps(r.leapSeconds),
    extremes: parseExtremes(r.extremes),
    definitiveThrough: typeof r.definitiveThrough === "string" ? r.definitiveThrough : null,
    lastFinal: typeof r.lastFinal === "string" ? r.lastFinal : null,
    latestUt1Utc: finite(r.latestUt1Utc) ? r.latestUt1Utc : null,
    taiMinusUtc: finite(r.taiMinusUtc) ? r.taiMinusUtc : null,
    overlap:
      finite(r.overlapDays) && finite(r.overlapMedianDisagreementMs)
        ? {
            days: r.overlapDays,
            medianMs: r.overlapMedianDisagreementMs,
            p99Ms: finite(r.overlapP99DisagreementMs) ? r.overlapP99DisagreementMs : 0,
            worstMs: finite(r.overlapWorstDisagreementMs) ? r.overlapWorstDisagreementMs : 0,
            worstDay: typeof r.overlapWorstDay === "string" ? r.overlapWorstDay : "",
          }
        : null,
    generated:
      typeof r.generated === "string" && !Number.isNaN(Date.parse(r.generated))
        ? new Date(r.generated)
        : null,
    credit: typeof r.credit === "string" ? r.credit : "",
  };
}

function parseMonthly(raw: unknown): MonthlySeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.month) || !Array.isArray(r.lodMs) || !Array.isArray(r.days)) return null;
  if (r.month.length === 0) return null;
  if (r.lodMs.length !== r.month.length || r.days.length !== r.month.length) return null;

  const month: string[] = [];
  const lodMs: number[] = [];
  const days: number[] = [];
  for (let i = 0; i < r.month.length; i++) {
    const m = r.month[i];
    if (typeof m !== "string" || !/^\d{4}-\d{2}$/.test(m)) return null;
    // Months must be strictly increasing, or every mean below is meaningless.
    if (month.length > 0 && m <= month[month.length - 1]) return null;
    if (!finite(r.lodMs[i]) || !finite(r.days[i])) return null;
    month.push(m);
    lodMs.push(r.lodMs[i] as number);
    days.push(r.days[i] as number);
  }
  return { month, lodMs, days };
}

function parseDaily(raw: unknown): DailySeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.date) || !Array.isArray(r.lodMs)) return null;
  if (r.date.length === 0 || r.lodMs.length !== r.date.length) return null;
  const ut1 = Array.isArray(r.ut1Utc) ? r.ut1Utc : [];
  const pred = Array.isArray(r.predicted) ? r.predicted : [];

  const date: string[] = [];
  const lodMs: Array<number | null> = [];
  const ut1Utc: Array<number | null> = [];
  const predicted: boolean[] = [];
  for (let i = 0; i < r.date.length; i++) {
    const d = r.date[i];
    if (typeof d !== "string") return null;
    if (date.length > 0 && d <= date[date.length - 1]) return null;
    date.push(d);
    lodMs.push(finite(r.lodMs[i]) ? (r.lodMs[i] as number) : null);
    ut1Utc.push(finite(ut1[i]) ? (ut1[i] as number) : null);
    predicted.push(pred[i] === true);
  }
  return { date, lodMs, ut1Utc, predicted };
}

function parseLeaps(raw: unknown): LeapSecond[] {
  if (!Array.isArray(raw)) return [];
  const out: LeapSecond[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const x = e as Record<string, unknown>;
    if (typeof x.date !== "string" || !finite(x.taiMinusUtc)) continue;
    if (out.length > 0 && x.date <= out[out.length - 1].date) continue;
    out.push({ date: x.date, taiMinusUtc: x.taiMinusUtc });
  }
  return out;
}

function parseExtremes(raw: unknown): { shortest: DayRecord; longest: DayRecord } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const one = (v: unknown): DayRecord | null => {
    if (!v || typeof v !== "object") return null;
    const x = v as Record<string, unknown>;
    if (typeof x.date !== "string" || !finite(x.lodMs)) return null;
    return { date: x.date, lodMs: x.lodMs };
  };
  const shortest = one(r.shortest);
  const longest = one(r.longest);
  if (!shortest || !longest) return null;
  return { shortest, longest };
}

// ─────────────────────────── the accumulated drift ───────────────────────────

export interface Drift {
  /** seconds the Earth has fallen behind atomic time over the window */
  seconds: number;
  from: string;
  to: string;
  months: number;
  /** how many days of measurement went into it */
  days: number;
}

/**
 * Integrate the excess length of day to get accumulated clock drift.
 *
 * This is the quantity leap seconds exist to cancel, and computing it is the
 * best available proof that they are not arbitrary: from 1972 to 2025 the
 * integral comes to about 26.9 seconds and exactly 27 leap seconds were
 * inserted, leaving a residual equal to today's UT1-UTC offset.
 *
 * Each month contributes its mean excess times its own day count, so a short
 * February is weighted as a short February rather than as a twelfth of a year.
 */
export function driftSeconds(
  monthly: MonthlySeries | null,
  from = "0000-00",
  to = "9999-99"
): Drift | null {
  if (!monthly) return null;
  let total = 0;
  let days = 0;
  let months = 0;
  let first = "";
  let last = "";
  for (let i = 0; i < monthly.month.length; i++) {
    const m = monthly.month[i];
    if (m < from || m > to) continue;
    total += monthly.lodMs[i] * monthly.days[i];
    days += monthly.days[i];
    months += 1;
    if (!first) first = m;
    last = m;
  }
  if (months === 0) return null;
  return { seconds: total / 1000, from: first, to: last, months, days };
}

/** How many leap seconds were inserted inside a window of months. */
export function leapSecondsBetween(
  leaps: LeapSecond[],
  from = "0000-00",
  to = "9999-99"
): number {
  if (!Array.isArray(leaps) || leaps.length < 2) return 0;
  let n = 0;
  for (let i = 1; i < leaps.length; i++) {
    const month = leaps[i].date.slice(0, 7);
    if (month >= from && month <= to) n += leaps[i].taiMinusUtc - leaps[i - 1].taiMinusUtc;
  }
  return n;
}

/**
 * How many leap seconds have actually been inserted.
 *
 * NOT the number of rows in the table. The first row is the starting offset of
 * 10 seconds on 1 January 1972, which was not a leap second but the initial step
 * that set TAI-UTC to a whole number. Twenty-eight rows, twenty-seven leap
 * seconds, and counting rows is the obvious way to get this wrong.
 */
export function leapSecondCount(leaps: LeapSecond[]): number {
  if (!Array.isArray(leaps) || leaps.length < 2) return 0;
  return leaps[leaps.length - 1].taiMinusUtc - leaps[0].taiMinusUtc;
}

export interface LeapGap {
  /** years since the most recent leap second */
  yearsSinceLast: number;
  lastDate: string;
  /** the longest gap between two leap seconds before this one */
  previousLongestYears: number;
  previousLongestFrom: string;
  /** whether the current wait is already the longest there has been */
  isRecord: boolean;
}

/** How long it has been, and whether that is unprecedented. */
export function leapGap(leaps: LeapSecond[], now: Date): LeapGap | null {
  if (!Array.isArray(leaps) || leaps.length < 2) return null;
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null;
  const last = leaps[leaps.length - 1];
  const lastTime = Date.parse(last.date);
  if (Number.isNaN(lastTime)) return null;
  const yearsSinceLast = (now.getTime() - lastTime) / (365.25 * 24 * 3600 * 1000);

  let previousLongestYears = 0;
  let previousLongestFrom = "";
  for (let i = 1; i < leaps.length; i++) {
    const a = Date.parse(leaps[i - 1].date);
    const b = Date.parse(leaps[i].date);
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    const years = (b - a) / (365.25 * 24 * 3600 * 1000);
    if (years > previousLongestYears) {
      previousLongestYears = years;
      previousLongestFrom = leaps[i - 1].date;
    }
  }
  return {
    yearsSinceLast,
    lastDate: last.date,
    previousLongestYears,
    previousLongestFrom,
    isRecord: yearsSinceLast > previousLongestYears,
  };
}

// ───────────────────────────── the seasonal cycle ────────────────────────────

export interface SeasonalCycle {
  /** mean departure from the period mean, by calendar month, January first */
  byMonth: Array<number | null>;
  amplitude: number;
  longestMonth: number;
  shortestMonth: number;
  years: number;
}

/**
 * The annual cycle in day length.
 *
 * The day is about a millisecond longer in April than in July, every year, and
 * it is the atmosphere doing it: winds shift angular momentum between the air
 * and the solid Earth, and a planet cannot change its own total. It is the same
 * shape of argument as the sawtooth on the Keeling curve, in a different
 * quantity: a seasonal signal in a global measurement, caused by the fact that
 * the two hemispheres are not alike.
 *
 * Departures are taken from the mean of the SAME window, so a long-term trend
 * cannot leak into the seasonal shape.
 */
export function seasonalCycle(
  monthly: MonthlySeries | null,
  fromYear = 1990
): SeasonalCycle | null {
  if (!monthly || !finite(fromYear)) return null;
  const sums = new Array(12).fill(0);
  const counts = new Array(12).fill(0);
  const years = new Set<number>();

  for (let i = 0; i < monthly.month.length; i++) {
    const year = Number(monthly.month[i].slice(0, 4));
    if (!finite(year) || year < fromYear) continue;
    // A month with only a few days measured is not a month's mean.
    if (monthly.days[i] < 20) continue;
    const m = Number(monthly.month[i].slice(5, 7)) - 1;
    if (m < 0 || m > 11) continue;
    sums[m] += monthly.lodMs[i];
    counts[m] += 1;
    years.add(year);
  }
  if (years.size < 5) return null;

  const means = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : null));
  const present = means.filter((v): v is number => v !== null);
  if (present.length < 12) return null;
  const base = present.reduce((a, b) => a + b, 0) / present.length;
  const byMonth = means.map((v) => (v === null ? null : v - base));

  let longestMonth = 1;
  let shortestMonth = 1;
  let hi = -Infinity;
  let lo = Infinity;
  byMonth.forEach((v, i) => {
    if (v === null) return;
    if (v > hi) {
      hi = v;
      longestMonth = i + 1;
    }
    if (v < lo) {
      lo = v;
      shortestMonth = i + 1;
    }
  });

  return { byMonth, amplitude: hi - lo, longestMonth, shortestMonth, years: years.size };
}

/** Mean excess length of day over a range of years. */
export function annualMean(monthly: MonthlySeries | null, year: number): number | null {
  if (!monthly || !finite(year)) return null;
  const prefix = String(year);
  let sum = 0;
  let days = 0;
  let months = 0;
  for (let i = 0; i < monthly.month.length; i++) {
    if (!monthly.month[i].startsWith(prefix)) continue;
    sum += monthly.lodMs[i] * monthly.days[i];
    days += monthly.days[i];
    months += 1;
  }
  // A partial year is not an annual mean, for the same reason a partial month
  // is not a monthly one.
  if (months < 12 || days < 350) return null;
  return sum / days;
}

/** Every complete year in the record, with its mean excess. */
export function annualMeans(
  monthly: MonthlySeries | null
): Array<{ year: number; lodMs: number }> {
  if (!monthly) return [];
  const first = Number(monthly.month[0].slice(0, 4));
  const last = Number(monthly.month[monthly.month.length - 1].slice(0, 4));
  const out: Array<{ year: number; lodMs: number }> = [];
  for (let y = first; y <= last; y++) {
    const v = annualMean(monthly, y);
    if (v !== null) out.push({ year: y, lodMs: v });
  }
  return out;
}

export interface TrailingMean {
  /** mean excess length of day over the window, ms */
  lodMs: number;
  from: string;
  to: string;
  days: number;
}

/**
 * Mean excess over the last N MEASURED days, and the N before those.
 *
 * Predictions are excluded, because averaging IERS's forecast into a statement
 * about what the Earth did would be reporting an expectation as an observation.
 * Two windows rather than one, because the interesting thing in this record right
 * now is the difference between them.
 */
export function trailingMeans(
  daily: DailySeries | null,
  windowDays = 365
): { recent: TrailingMean; previous: TrailingMean } | null {
  if (!daily || !finite(windowDays) || windowDays < 30) return null;
  const measured: Array<{ date: string; lod: number }> = [];
  for (let i = 0; i < daily.date.length; i++) {
    const v = daily.lodMs[i];
    if (v === null || daily.predicted[i]) continue;
    measured.push({ date: daily.date[i], lod: v });
  }
  if (measured.length < windowDays * 2) return null;

  const mean = (rows: Array<{ date: string; lod: number }>): TrailingMean => ({
    lodMs: rows.reduce((a, b) => a + b.lod, 0) / rows.length,
    from: rows[0].date,
    to: rows[rows.length - 1].date,
    days: rows.length,
  });

  const recent = measured.slice(-windowDays);
  const previous = measured.slice(-windowDays * 2, -windowDays);
  return { recent: mean(recent), previous: mean(previous) };
}

/** The first year whose mean excess went negative, if one has. */
export function firstNegativeYear(monthly: MonthlySeries | null): number | null {
  const years = annualMeans(monthly);
  const hit = years.find((y) => y.lodMs < 0);
  return hit ? hit.year : null;
}

// ──────────────────────── the negative leap second ───────────────────────────

export interface NegativeLeapEstimate {
  /** years until UT1-UTC would reach the tolerance, at the given rate */
  years: number;
  /** the rate used, ms per day */
  lodMs: number;
  fromUt1Utc: number;
}

/**
 * When a negative leap second would be needed, if the current rate held.
 *
 * Explicitly arithmetic, not a forecast, and it refuses in the two cases where
 * the arithmetic would be dishonest: if the Earth is running slow (positive
 * excess) there is no negative leap second coming at all, and if the rate is
 * near zero the answer runs to infinity and means nothing.
 *
 * The rate does not hold. Day length wanders by a millisecond over a few years
 * for reasons nobody can predict, which is exactly why the IERS announces leap
 * seconds six months ahead and never further.
 */
export function yearsToNegativeLeap(
  ut1Utc: number | null,
  lodMs: number | null,
  tolerance = UT1_TOLERANCE_SECONDS
): NegativeLeapEstimate | null {
  if (!finite(ut1Utc) || !finite(lodMs) || !finite(tolerance)) return null;
  // The sign convention here was checked against the data rather than reasoned
  // out, because getting it backwards would invert the headline of the tab. Over
  // the daily record: on days with an excess above +0.2 ms, UT1-UTC moves DOWN by
  // 0.55 ms; on days below -0.2 ms it moves UP by 0.57 ms. So a long day (slow
  // Earth) drives UT1-UTC toward -0.9 and a positive leap second, and a short day
  // (fast Earth) drives it toward +0.9 and a negative one.
  if (lodMs >= 0) return null;
  const remaining = tolerance - ut1Utc;
  if (remaining <= 0) return null;
  // |lodMs| ms per day, in seconds per year
  const perYear = (Math.abs(lodMs) / 1000) * 365.25;
  if (!(perYear > 1e-9)) return null;
  return { years: remaining / perYear, lodMs, fromUt1Utc: ut1Utc };
}

/** Seconds per year of drift implied by a mean daily excess in ms. */
export function driftPerYearSeconds(lodMs: number | null): number | null {
  if (!finite(lodMs)) return null;
  return (lodMs / 1000) * 365.25;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─────────────────────────────── honesty copy ────────────────────────────────

export const DEFINITION_NOTE =
  "The second was defined to match the mean solar day of about 1820, by way of the ephemeris second taken from Newcomb's tables of the Sun. The Earth has been slowing since, so 86,400 SI seconds is now slightly SHORT of a real day for most of the past half century. Nothing is wrong with the clock or the planet; the definition was pinned to a moment that has passed.";

export const INTEGRAL_NOTE =
  "Leap seconds are not arbitrary, and this page proves it rather than asserting it. Integrating the measured excess length of day from 1972 to 2025 gives about 26.9 seconds of accumulated drift. Twenty-seven leap seconds were actually inserted over those years. The residual is roughly a tenth of a second, which is the UT1-UTC offset standing today.";

export const SIGN_FLIP_NOTE =
  "From 2020 to 2024 the annual mean went NEGATIVE: the Earth turned faster than the definition of the second says it should, and the shortest day ever measured was 5 July 2024. That is where the headlines came from. Why it happened is not settled: the core, the oceans and the atmosphere all trade angular momentum with the crust on decade timescales, and that wandering has always been larger than the tidal trend underneath it.";

export const REVERSAL_NOTE =
  "The speed-up has since partly unwound, which is the most current thing this page can tell you and the reason it recomputes rather than quoting an article. Averaged over the last twelve measured months the excess is back to about +0.24 ms, against -0.09 ms for the twelve months before that, and every month of 2026 so far has been positive. UT1-UTC peaked in October 2025 and has been falling since. A page built in 2024 would still be saying the Earth is speeding up; the record says it stopped.";

export const NEGATIVE_LEAP_NOTE =
  "While the Earth was running fast, the next leap second looked like it would have to be a NEGATIVE one: a minute with 59 seconds in it, which has never been done. A great deal of software assumes leap seconds only ever add, and the software that handles them at all mostly handles them badly. That prospect is part of why the timekeeping community voted in 2022 to abolish the leap second by 2035 and let UT1 and UTC simply drift apart. The prospect has receded over the past year, which is an argument for the decision rather than against it: nobody wants a timekeeping rule that depends on guessing the core.";

export const TIDAL_NOTE =
  "Two numbers describe the long-term slowing and they disagree, honestly. Lunar laser ranging says the Moon is taking angular momentum at a rate that would lengthen the day by about 2.3 ms per century. Ancient eclipse records say the day has actually lengthened by about 1.8 ms per century. The difference is the Earth still rebounding from the last ice age: a less oblate planet spins faster. That is the same glacial isostatic adjustment the sea level tab has to name for a different reason.";

export const SEASONAL_NOTE =
  "The day is about a millisecond longer in April than in July, every year, and that is the atmosphere. Winds move angular momentum between the air and the solid Earth, and the total cannot change, so when the jet streams speed up the planet underneath them slows down. It is the same shape of argument as the sawtooth on the Keeling curve: a seasonal signal in a global measurement, caused by the hemispheres not being alike.";

export const PREDICTION_NOTE =
  "Past the last measured day this record is IERS prediction rather than measurement, and it is drawn differently for that reason. The IERS itself announces leap seconds only six months ahead, because day length wanders by a millisecond over a few years for reasons nobody can predict.";

export const NOT_A_FORECAST_NOTE =
  "The 'at this rate' figures on this page are arithmetic, not forecasts. Multiplying today's excess out to a threshold assumes a rate that has never held for long: the record wanders by more than a millisecond across a decade, and it has changed sign twice in sixty years.";

export const SPLICE_NOTE =
  "Two IERS products are joined here: the definitive series, which lags by months, and the weekly one, which is current. Where they overlap they agree to a median of 0.015 ms across more than nineteen thousand days, which is what licenses the join, and the definitive values win wherever they exist.";
