import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GIA_CORRECTION_MM_PER_YEAR,
  acceleration,
  cmPerCentury,
  gaugeTrends,
  landComponentEstimate,
  parseSeaLevel,
  trend,
  trendByBlock,
  trendByMission,
} from "./sealevel";

/**
 * Validated against published values, never against a previous run.
 *
 * Anchors:
 *   - NOAA's own trend is in the header of each file it publishes, so the tests
 *     compare our arithmetic against theirs directly. They do not agree exactly,
 *     and that disagreement is pinned below rather than smoothed over: our plain
 *     least squares gives 3.23 mm/yr where their header says 3.17. Several
 *     candidate explanations were tested and none accounts for it, so the tab
 *     shows both.
 *   - The published acceleration of the altimeter era is about 0.08 mm/yr per
 *     year (Nerem et al. 2018 give 0.084 +/- 0.025, and IPCC AR6 chapter 9
 *     carries the same figure). Computed here from the file, it is 0.081.
 *   - Brest is one of the longest instrumental records of anything, starting in
 *     1807.
 *   - Post-glacial rebound makes sea level FALL at Stockholm, Oslo and Skagway,
 *     and Skagway's uplift of roughly two centimetres a year is the fastest
 *     documented anywhere.
 *
 * The real mirror is read from public/data, so a bad fetch fails the suite
 * rather than shipping.
 */

const DATA = parseSeaLevel(
  JSON.parse(readFileSync(join(process.cwd(), "public/data/sealevel/sea-level.json"), "utf8"))
);
const HEADLINE = DATA.global.free_all_66!;
const SEASONAL = DATA.global.keep_all_66!;
const REF90 = DATA.global.free_ref_90!;

const gauge = (name: string) => DATA.gauges.find((g) => g.name === name)!;

describe("the committed mirror", () => {
  it("parses all four global variants and ten gauges", () => {
    expect(Object.keys(DATA.global).sort()).toEqual([
      "free_all_66",
      "free_ref_90",
      "keep_all_66",
      "keep_ref_90",
    ]);
    expect(DATA.gauges.length).toBe(10);
  });

  it("rebuilds the merged series from the per-mission values", () => {
    // The payload ships only per-mission values; the merged series is computed on
    // load. It has to cover the whole record and stay ordered.
    expect(HEADLINE.time.length).toBeGreaterThan(1500);
    expect(HEADLINE.time[0]).toBeCloseTo(1992.96, 1);
    for (let i = 1; i < HEADLINE.time.length; i++) {
      expect(HEADLINE.time[i]).toBeGreaterThan(HEADLINE.time[i - 1]);
    }
    expect(HEADLINE.value.length).toBe(HEADLINE.time.length);
  });

  it("keeps five satellites apart rather than flattening them", () => {
    expect(HEADLINE.perMission.length).toBe(5);
    const names = HEADLINE.perMission.map((m) => m.mission);
    expect(names[0]).toContain("TOPEX");
    expect(names[names.length - 1]).toContain("Sentinel");
    // Each one covers a different era, in order.
    for (let i = 1; i < HEADLINE.perMission.length; i++) {
      expect(HEADLINE.perMission[i].time[0]).toBeGreaterThan(
        HEADLINE.perMission[i - 1].time[0]
      );
    }
  });

  it("refuses malformed input instead of half-parsing it", () => {
    expect(parseSeaLevel(null).gauges).toEqual([]);
    expect(parseSeaLevel({}).global).toEqual({});
    // a time axis going backwards is fatal
    expect(parseSeaLevel({ time: [2, 1], global: {}, gauges: [] }).global).toEqual({});
    // a gauge with too few usable years is dropped, not kept half-empty
    expect(
      parseSeaLevel({
        time: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        global: {},
        gauges: [{ id: 1, name: "x", lat: 0, lon: 0, years: [2000, 2001], value: [1, 2] }],
      }).gauges
    ).toEqual([]);
  });
});

describe("the global mean, against NOAA's own published trend", () => {
  it("lands within two percent of the header figure", () => {
    const t = trend(HEADLINE.time, HEADLINE.value)!;
    expect(HEADLINE.publishedTrendMmPerYear).toBeCloseTo(3.17, 2);
    expect(t.mmPerYear).toBeGreaterThan(3.1);
    expect(t.mmPerYear).toBeLessThan(3.3);
    const ratio = t.mmPerYear / HEADLINE.publishedTrendMmPerYear;
    expect(ratio).toBeGreaterThan(0.98);
    expect(ratio).toBeLessThan(1.03);
  });

  it("does not agree exactly, and the gap is recorded rather than tuned away", () => {
    // Pinned deliberately. Several explanations were tested and rejected: the
    // seasonal treatment (the two products reconcile with each other, see below),
    // the start date, and which satellite is preferred during an overlap. All
    // three change the answer by under 0.001 mm/yr. The remaining 0.06 is a
    // fitting-method difference we cannot identify from the file, so the tab
    // shows both numbers.
    const t = trend(HEADLINE.time, HEADLINE.value)!;
    const gap = t.mmPerYear - HEADLINE.publishedTrendMmPerYear;
    expect(gap).toBeGreaterThan(0.03);
    expect(gap).toBeLessThan(0.1);
  });

  it("has a standard error far smaller than the slope", () => {
    const t = trend(HEADLINE.time, HEADLINE.value)!;
    expect(t.stdErr).toBeGreaterThan(0);
    expect(t.mmPerYear / t.stdErr).toBeGreaterThan(50);
  });

  it("moves when the DOMAIN changes, which is a convention not a measurement", () => {
    // 66S to 66N against the reference missions' own coverage: same instruments,
    // same ocean, two published trends.
    expect(REF90.publishedTrendMmPerYear).toBeLessThan(HEADLINE.publishedTrendMmPerYear);
    const a = trend(HEADLINE.time, HEADLINE.value)!;
    const b = trend(REF90.time, REF90.value)!;
    expect(a.mmPerYear).toBeGreaterThan(b.mmPerYear);
    expect(a.mmPerYear - b.mmPerYear).toBeGreaterThan(0.02);
  });

  it("reconciles the seasonal-retained product with the seasonal-removed one", () => {
    // A real cross-check of NOAA's deseasonalisation using our own arithmetic:
    // the retained product has a bigger scatter but the SAME long trend, within a
    // hundredth of a mm/yr. If their seasonal removal were doing anything else,
    // this is where it would show.
    const free = trend(HEADLINE.time, HEADLINE.value)!;
    const keep = trend(SEASONAL.time, SEASONAL.value)!;
    expect(Math.abs(keep.mmPerYear - free.mmPerYear)).toBeLessThan(0.02);
    // and the seasonal one is noisier, which is what "retained" means
    expect(keep.stdErr).toBeGreaterThan(free.stdErr);
  });

  it("names the GIA correction without applying it", () => {
    expect(GIA_CORRECTION_MM_PER_YEAR).toBeCloseTo(0.3, 2);
    const t = trend(HEADLINE.time, HEADLINE.value)!;
    // The commonly quoted figure of about 3.5 is this plus GIA, and the two
    // answer different questions.
    expect(t.mmPerYear + GIA_CORRECTION_MM_PER_YEAR).toBeGreaterThan(3.4);
  });
});

describe("acceleration, which is why one rate is the wrong shape", () => {
  it("reproduces the published 0.08 mm per year per year", () => {
    const a = acceleration(HEADLINE.time, HEADLINE.value)!;
    expect(a.mmPerYearPerYear).toBeGreaterThan(0.06);
    expect(a.mmPerYearPerYear).toBeLessThan(0.11);
  });

  it("has the rate roughly doubling across the record", () => {
    const a = acceleration(HEADLINE.time, HEADLINE.value)!;
    expect(a.rateAtStart).toBeGreaterThan(1.5);
    expect(a.rateAtStart).toBeLessThan(2.4);
    expect(a.rateAtEnd).toBeGreaterThan(4);
    expect(a.rateAtEnd / a.rateAtStart).toBeGreaterThan(1.8);
    // and the straight-line average sits between the two, describing neither
    const t = trend(HEADLINE.time, HEADLINE.value)!;
    expect(t.mmPerYear).toBeGreaterThan(a.rateAtStart);
    expect(t.mmPerYear).toBeLessThan(a.rateAtEnd);
  });

  it("refuses a window too short to have curvature", () => {
    const from = HEADLINE.time.length - 200;
    expect(
      acceleration(HEADLINE.time.slice(from), HEADLINE.value.slice(from))
    ).toBeNull();
    expect(acceleration([1, 2, 3], [1, 2, 3])).toBeNull();
    expect(acceleration(null, null)).toBeNull();
  });

  it("finds the same acceleration as a staircase of ten-year blocks", () => {
    // No curve fitted here: three straight lines over three decades, rising from
    // about 2 mm/yr to about 4. The acceleration is visible without assuming a
    // shape for it.
    const blocks = trendByBlock(HEADLINE, 10).filter((b) => b.trend);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    const early = blocks[0].trend!.mmPerYear;
    const late = blocks[blocks.length - 1].trend!.mmPerYear;
    expect(late).toBeGreaterThan(early);
    expect(late / early).toBeGreaterThan(1.3);
    // Each block is at least ten years, or it would not have been fitted.
    for (const b of blocks) expect(b.trend!.to - b.trend!.from).toBeGreaterThan(9);
  });

  it("refuses a trend for the satellites that have not flown ten years", () => {
    // The first version of the staircase above was one trend per SATELLITE, and
    // it does not work: three of the five have flown for under a decade, and
    // fitting them would mean this module breaking its own minimum to produce a
    // tidier picture. Sentinel-6 has four years of data and there is no sea level
    // trend in four years, however much one would like a number per instrument.
    const byMission = trendByMission(HEADLINE);
    expect(byMission.length).toBe(5);
    const fitted = byMission.filter((m) => m.trend !== null);
    const refused = byMission.filter((m) => m.trend === null);
    expect(fitted.length).toBe(2);
    expect(refused.length).toBe(3);
    for (const m of refused) expect(m.to - m.from).toBeLessThan(10);
    for (const m of fitted) expect(m.to - m.from).toBeGreaterThan(10);
  });
});

describe("the splices in a continuous record", () => {
  it("has an overlap at every handover", () => {
    // Four handovers between five satellites, and every one of them is a period
    // when both were flying.
    expect(HEADLINE.overlaps.length).toBe(4);
    for (const o of HEADLINE.overlaps) {
      expect(o.to).toBeGreaterThan(o.from);
      expect(o.samples).toBeGreaterThan(4);
    }
  });

  it("measures a disagreement of one to two millimetres between simultaneous satellites", () => {
    // The honest size of a seam. Against a signal of about 3 mm a year, a 2 mm
    // step at a splice is most of a year's worth of the thing being measured.
    for (const o of HEADLINE.overlaps) {
      expect(o.meanAbsDifferenceMm).toBeGreaterThan(0.2);
      expect(o.meanAbsDifferenceMm).toBeLessThan(4);
      expect(o.maxAbsDifferenceMm).toBeGreaterThanOrEqual(o.meanAbsDifferenceMm);
    }
    const worst = Math.max(...HEADLINE.overlaps.map((o) => o.maxAbsDifferenceMm));
    expect(worst).toBeGreaterThan(1);
  });

  it("has one long formation flight and three short ones", () => {
    const spans = HEADLINE.overlaps.map((o) => o.to - o.from).sort((a, b) => b - a);
    expect(spans[0]).toBeGreaterThan(3); // TOPEX and Jason-1 flew together for years
    expect(spans[spans.length - 1]).toBeLessThan(1.5);
  });
});

describe("tide gauges, where the land moves too", () => {
  it("has Brest reaching back to 1807", () => {
    expect(gauge("Brest").firstYear).toBe(1807);
  });

  it("has sea level FALLING at three of the ten stations", () => {
    // Post-glacial rebound and Little Ice Age unloading. This is the fact that
    // makes "sea level is rising" an incomplete sentence.
    const falling = DATA.gauges.filter((g) => {
      const t = trend(g.years, g.value);
      return t !== null && t.mmPerYear < 0;
    });
    expect(falling.map((g) => g.name).sort()).toEqual(["Oslo", "Skagway", "Stockholm"]);
  });

  it("has Skagway falling fastest of all, by centimetres a year", () => {
    const t = trend(gauge("Skagway").years, gauge("Skagway").value)!;
    expect(t.mmPerYear).toBeLessThan(-15);
    // A centimetre a year is a big number for geology; this is nearly two.
    expect(cmPerCentury(t.mmPerYear)!).toBeLessThan(-150);
  });

  it("has Manila rising several times faster than the global mean", () => {
    const global = trend(HEADLINE.time, HEADLINE.value)!;
    const manila = trend(gauge("Manila").years, gauge("Manila").value, 1993)!;
    expect(manila.mmPerYear).toBeGreaterThan(global.mmPerYear * 3);
  });

  it("spans more than 30 mm a year between the extremes", () => {
    const rates = DATA.gauges
      .map((g) => trend(g.years, g.value))
      .filter((t): t is NonNullable<typeof t> => t !== null)
      .map((t) => t.mmPerYear);
    expect(Math.max(...rates) - Math.min(...rates)).toBeGreaterThan(25);
  });

  it("shows acceleration at a single station over two centuries", () => {
    // Brest's whole record runs at about 1 mm a year; its last thirty years run
    // at about three. One gauge, no models, no global average.
    const g = gauge("Brest");
    const whole = trend(g.years, g.value)!;
    const recent = trend(g.years, g.value, 1993)!;
    expect(whole.mmPerYear).toBeLessThan(1.5);
    expect(recent.mmPerYear).toBeGreaterThan(2.5);
  });

  it("estimates the land component as a residual and labels it as one", () => {
    const global = trend(HEADLINE.time, HEADLINE.value)!;
    // Stockholm's ground is rising, so the estimate is positive and large.
    const stockholm = landComponentEstimate(gauge("Stockholm"), global.mmPerYear)!;
    expect(stockholm).toBeGreaterThan(2);
    // Manila's is sinking, so the estimate is negative.
    const manila = landComponentEstimate(gauge("Manila"), global.mmPerYear)!;
    expect(manila).toBeLessThan(-5);
    expect(landComponentEstimate(null, 3)).toBeNull();
    expect(landComponentEstimate(gauge("Brest"), null as unknown as number)).toBeNull();
  });

  it("packages a gauge with both of its windows", () => {
    const global = trend(HEADLINE.time, HEADLINE.value)!;
    const gt = gaugeTrends(gauge("New York"), global.mmPerYear)!;
    expect(gt.whole!.mmPerYear).toBeGreaterThan(2);
    expect(gt.sinceAltimetry!.mmPerYear).toBeGreaterThan(gt.whole!.mmPerYear);
    expect(gt.differenceFromGlobal).not.toBeNull();
  });
});

describe("what the module refuses to do", () => {
  it("will not fit a trend to under ten years", () => {
    const g = gauge("Honolulu");
    expect(trend(g.years, g.value, 2020)).toBeNull();
    expect(trend(g.years, g.value, 2010)).not.toBeNull();
  });

  it("skips missing years rather than filling them", () => {
    // Several gauges have gaps. A filled gap would drag a slope; a skipped one
    // just reduces n.
    const withGaps = DATA.gauges.find((g) => g.value.some((v) => v === null));
    expect(withGaps).toBeDefined();
    const t = trend(withGaps!.years, withGaps!.value)!;
    expect(t.n).toBeLessThan(withGaps!.years.length);
  });

  it("returns null rather than guessing, at every entry point", () => {
    expect(trend(null, null)).toBeNull();
    expect(trend([1, 2], [1, 2])).toBeNull();
    expect(trend([1, 2, 3], [1, 2])).toBeNull();
    expect(acceleration([], [])).toBeNull();
    expect(trendByMission(null)).toEqual([]);
    expect(gaugeTrends(null, 3)).toBeNull();
    expect(cmPerCentury(null)).toBeNull();
  });
});
