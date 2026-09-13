import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  NOMINAL_DAY_SECONDS,
  OBSERVED_SLOWING_MS_PER_CENTURY,
  TIDAL_BRAKING_MS_PER_CENTURY,
  UT1_TOLERANCE_SECONDS,
  annualMean,
  annualMeans,
  driftPerYearSeconds,
  driftSeconds,
  firstNegativeYear,
  leapGap,
  leapSecondCount,
  leapSecondsBetween,
  parseRotation,
  seasonalCycle,
  trailingMeans,
  yearsToNegativeLeap,
} from "./rotation";

/**
 * Validated against published values, never against a previous run.
 *
 * Anchors:
 *   - TAI-UTC is 37 seconds, and 27 leap seconds have been inserted since 1972.
 *     The IERS table has 28 rows because the first is the initial 10-second
 *     offset rather than a leap second.
 *   - The last leap second took effect on 1 January 2017 and there has been none
 *     since, which is now the longest gap in the system's history.
 *   - UT1-UTC is held inside 0.9 s by definition.
 *   - Lunar laser ranging gives tidal braking of about 2.3 ms per century;
 *     ancient eclipse records give an observed slowing of about 1.8. The gap is
 *     post-glacial rebound, and both figures are published.
 *
 * The strongest check here is not a published number at all. Leap seconds should
 * equal the integral of the excess length of day, because that is what they are
 * for. Integrating the record from 1972 to 2025 and comparing against the count
 * of leap seconds actually inserted tests the measurement, the units, the sign
 * convention and the arithmetic in one assertion.
 *
 * The real mirror is read from public/data, so a bad fetch fails the suite
 * rather than shipping.
 */

const DATA = parseRotation(
  JSON.parse(readFileSync(join(process.cwd(), "public/data/rotation/rotation.json"), "utf8"))
);
const MONTHLY = DATA.monthly!;
const DAILY = DATA.daily!;

describe("the committed IERS mirror", () => {
  it("parses monthly, daily and the leap second table", () => {
    expect(MONTHLY.month.length).toBeGreaterThan(700);
    expect(MONTHLY.month[0]).toBe("1962-01");
    expect(DAILY.date.length).toBeGreaterThan(1000);
    expect(DATA.leapSeconds.length).toBeGreaterThan(25);
  });

  it("keeps predictions flagged rather than mixed in", () => {
    const predicted = DAILY.predicted.filter(Boolean).length;
    const measured = DAILY.predicted.filter((p) => !p).length;
    expect(measured).toBeGreaterThan(1000);
    // There should be some prediction, since finals2000A runs about a year ahead.
    expect(predicted).toBeGreaterThan(50);
    // and the predictions must all be at the END of the series
    const firstPredicted = DAILY.predicted.indexOf(true);
    if (firstPredicted >= 0) {
      expect(DAILY.predicted.slice(firstPredicted).every(Boolean)).toBe(true);
    }
  });

  it("agrees between the two IERS products it splices", () => {
    // The definitive series and the weekly one are the same measurement in
    // different units, seconds against milliseconds. The overlap statistics are
    // what license the join, and a bad unit conversion would blow them up.
    const o = DATA.overlap!;
    expect(o.days).toBeGreaterThan(15000);
    expect(o.medianMs).toBeLessThan(0.05);
    expect(o.p99Ms).toBeLessThan(0.3);
  });

  it("refuses malformed input instead of half-parsing it", () => {
    expect(parseRotation(null).monthly).toBeNull();
    expect(parseRotation({}).monthly).toBeNull();
    // months out of order are fatal
    expect(
      parseRotation({
        monthly: { month: ["2000-02", "2000-01"], lodMs: [1, 1], days: [28, 31] },
      }).monthly
    ).toBeNull();
    // a bad month format is fatal
    expect(
      parseRotation({ monthly: { month: ["2000"], lodMs: [1], days: [31] } }).monthly
    ).toBeNull();
  });
});

describe("leap seconds are the integral of the length of day", () => {
  it("counts 27 leap seconds, not 28 rows", () => {
    // The first row of the IERS table is the initial 10-second offset set on
    // 1 January 1972, which was not a leap second. Counting rows is the obvious
    // way to get this wrong and would give 28.
    expect(DATA.leapSeconds.length).toBe(28);
    expect(leapSecondCount(DATA.leapSeconds)).toBe(27);
    expect(DATA.leapSeconds[0].taiMinusUtc).toBe(10);
    expect(DATA.taiMinusUtc).toBe(37);
    expect(DATA.leapSeconds[0].taiMinusUtc + leapSecondCount(DATA.leapSeconds)).toBe(37);
  });

  it("matches the integrated drift to within a fifth of a second over 54 years", () => {
    // The load-bearing test of the whole module. If the units, the sign or the
    // arithmetic were wrong anywhere, these two numbers would not land on each
    // other.
    const drift = driftSeconds(MONTHLY, "1972-01", "2025-12")!;
    const inserted = leapSecondsBetween(DATA.leapSeconds, "1972-01", "2025-12");
    expect(drift.months).toBeGreaterThan(600);
    expect(drift.seconds).toBeGreaterThan(25);
    expect(drift.seconds).toBeLessThan(29);
    expect(inserted).toBe(27);
    expect(Math.abs(drift.seconds - inserted)).toBeLessThan(0.2);
  });

  it("leaves a residual that is the standing UT1-UTC offset", () => {
    // What is left over after the leap seconds have cancelled the drift is,
    // physically, the offset still on the books today.
    const drift = driftSeconds(MONTHLY, "1972-01", "2025-12")!;
    const inserted = leapSecondsBetween(DATA.leapSeconds, "1972-01", "2025-12");
    const residual = drift.seconds - inserted;
    expect(Math.abs(residual)).toBeLessThan(UT1_TOLERANCE_SECONDS);
    // and it should have the same sign as, and be comparable to, the real offset
    expect(Math.abs(residual - DATA.latestUt1Utc!)).toBeLessThan(0.35);
  });

  it("has gone longer without a leap second than ever before", () => {
    const gap = leapGap(DATA.leapSeconds, new Date("2026-09-12T00:00:00Z"))!;
    expect(gap.lastDate).toBe("2017-01-01");
    expect(gap.yearsSinceLast).toBeGreaterThan(9);
    expect(gap.previousLongestYears).toBeGreaterThan(6);
    expect(gap.previousLongestYears).toBeLessThan(7.5);
    expect(gap.isRecord).toBe(true);
  });

  it("refuses to compute a gap without a real date", () => {
    expect(leapGap(DATA.leapSeconds, new Date("nonsense"))).toBeNull();
    expect(leapGap([], new Date())).toBeNull();
    expect(driftSeconds(null)).toBeNull();
    expect(leapSecondsBetween([], "1972-01", "2025-12")).toBe(0);
  });
});

describe("the length of day itself", () => {
  it("names 86,400 seconds as the definition, not the measurement", () => {
    expect(NOMINAL_DAY_SECONDS).toBe(86400);
  });

  it("has the shortest day on record in July 2024 and the longest in 1972", () => {
    const e = DATA.extremes!;
    expect(e.shortest.date).toBe("2024-07-05");
    expect(e.shortest.lodMs).toBeLessThan(-1.5);
    expect(e.longest.lodMs).toBeGreaterThan(4);
    expect(e.longest.date.startsWith("1972")).toBe(true);
    // Both extremes are tiny next to a day: a millisecond in 86,400 seconds.
    expect(Math.abs(e.shortest.lodMs) / (NOMINAL_DAY_SECONDS * 1000)).toBeLessThan(1e-7);
  });

  it("ran long for most of the record and went negative around 2020", () => {
    const years = annualMeans(MONTHLY);
    expect(years.length).toBeGreaterThan(55);
    const seventies = years.filter((y) => y.year >= 1970 && y.year < 1980);
    expect(seventies.every((y) => y.lodMs > 1)).toBe(true);
    const first = firstNegativeYear(MONTHLY);
    expect(first).not.toBeNull();
    expect(first!).toBeGreaterThanOrEqual(2020);
    expect(first!).toBeLessThanOrEqual(2021);
  });

  it("has partly reversed in the last year, which is the current state", () => {
    // The finding that corrected the copy. A page written during the 2024
    // coverage would say the Earth is speeding up; measured over the last twelve
    // MEASURED months the excess is positive again and larger than the year
    // before, so the page has to recompute rather than repeat.
    const t = trailingMeans(DAILY, 365)!;
    expect(t.recent.days).toBe(365);
    expect(t.previous.days).toBe(365);
    expect(t.recent.lodMs).toBeGreaterThan(t.previous.lodMs);
    expect(t.recent.lodMs).toBeGreaterThan(0);
  });

  it("excludes predictions from any statement about what the Earth did", () => {
    const t = trailingMeans(DAILY, 365)!;
    const lastMeasured = DATA.lastFinal!;
    expect(t.recent.to <= lastMeasured).toBe(true);
  });

  it("refuses an annual mean from a partial year", () => {
    const years = annualMeans(MONTHLY);
    const last = MONTHLY.month[MONTHLY.month.length - 1];
    const partialYear = Number(last.slice(0, 4));
    // The final year of the record is incomplete, so it must not appear.
    if (last.slice(5, 7) !== "12") {
      expect(years.some((y) => y.year === partialYear)).toBe(false);
      expect(annualMean(MONTHLY, partialYear)).toBeNull();
    }
    expect(annualMean(MONTHLY, 1800)).toBeNull();
    expect(annualMean(null, 2000)).toBeNull();
  });
});

describe("the seasonal cycle, which is the atmosphere", () => {
  it("makes the day longest in spring and shortest in July", () => {
    const c = seasonalCycle(MONTHLY, 1990)!;
    expect(c.years).toBeGreaterThan(25);
    expect(c.shortestMonth).toBe(7);
    expect([3, 4]).toContain(c.longestMonth);
  });

  it("swings about a millisecond, which dwarfs the annual trend", () => {
    const c = seasonalCycle(MONTHLY, 1990)!;
    expect(c.amplitude).toBeGreaterThan(0.8);
    expect(c.amplitude).toBeLessThan(1.6);
    // The seasonal swing is larger than the change in annual means across the
    // whole satellite era, which is why a single month's figure says little.
    const years = annualMeans(MONTHLY).filter((y) => y.year >= 1990);
    const spread = Math.max(...years.map((y) => y.lodMs)) - Math.min(...years.map((y) => y.lodMs));
    expect(c.amplitude).toBeGreaterThan(spread * 0.3);
  });

  it("has departures that sum to about zero, which is what departure means", () => {
    const c = seasonalCycle(MONTHLY, 1990)!;
    const sum = c.byMonth.reduce((a: number, b) => a + (b ?? 0), 0);
    expect(Math.abs(sum)).toBeLessThan(0.02);
  });

  it("refuses a window too short to average", () => {
    expect(seasonalCycle(MONTHLY, 2025)).toBeNull();
    expect(seasonalCycle(null)).toBeNull();
  });
});

describe("the negative leap second, as arithmetic and not a forecast", () => {
  it("refuses to project one while the Earth is running slow", () => {
    // A positive excess drives UT1-UTC toward -0.9 and a POSITIVE leap second,
    // so asking when a negative one is due is a malformed question.
    expect(yearsToNegativeLeap(0, 0.5)).toBeNull();
    expect(yearsToNegativeLeap(0, 0)).toBeNull();
  });

  it("gives a plain division when the Earth is running fast", () => {
    // -0.5 ms a day is 0.18 s a year, so 0.9 s takes about five years.
    const e = yearsToNegativeLeap(0, -0.5)!;
    expect(e.years).toBeGreaterThan(4);
    expect(e.years).toBeLessThan(6);
    // and starting from an offset already part way there takes less
    const closer = yearsToNegativeLeap(0.45, -0.5)!;
    expect(closer.years).toBeLessThan(e.years / 1.9);
  });

  it("refuses once the tolerance is already passed", () => {
    expect(yearsToNegativeLeap(1.0, -0.5)).toBeNull();
    expect(yearsToNegativeLeap(NaN, -0.5)).toBeNull();
  });

  it("converts a daily excess into a yearly drift", () => {
    // One millisecond a day is about a third of a second a year: the sentence
    // that makes leap seconds intuitive, as arithmetic.
    const perYear = driftPerYearSeconds(1)!;
    expect(perYear).toBeGreaterThan(0.36);
    expect(perYear).toBeLessThan(0.37);
    expect(driftPerYearSeconds(null)).toBeNull();
  });
});

describe("the long-term slowing", () => {
  it("keeps the two published rates apart rather than averaging them", () => {
    // Lunar laser ranging and ancient eclipses give different numbers, and the
    // difference is post-glacial rebound rather than an error. Splitting the
    // difference would destroy the only interesting thing about the pair.
    expect(TIDAL_BRAKING_MS_PER_CENTURY).toBeGreaterThan(OBSERVED_SLOWING_MS_PER_CENTURY);
    const gap = TIDAL_BRAKING_MS_PER_CENTURY - OBSERVED_SLOWING_MS_PER_CENTURY;
    expect(gap).toBeGreaterThan(0.3);
    expect(gap).toBeLessThan(0.8);
  });

  it("is far smaller than the decadal wandering sitting on top of it", () => {
    // A century of tidal braking is about 2 ms. The record swings that much in a
    // few years, which is why no trend can be read off sixty years of this.
    const years = annualMeans(MONTHLY);
    const spread = Math.max(...years.map((y) => y.lodMs)) - Math.min(...years.map((y) => y.lodMs));
    expect(spread).toBeGreaterThan(TIDAL_BRAKING_MS_PER_CENTURY);
  });
});
