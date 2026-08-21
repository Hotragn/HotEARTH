import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CLIMATOLOGY_YEARS,
  EXTENT_THRESHOLD_PERCENT,
  FIRST_FULL_YEAR,
  bandPosition,
  dailyExtremes,
  doyLabel,
  extentAreaGap,
  extremes,
  mean,
  parseSeaIce,
  rankLowest,
  trend,
  trendByMonth,
} from "./seaice";

/**
 * Validated against published values, never against a previous run.
 *
 * The anchors here are NSIDC's own published figures:
 *
 *   - September 2012 was the record low Arctic month at a monthly average of
 *     3.57 million square km.
 *   - The Arctic September decline is published as about 12.2 percent per decade
 *     relative to the 1981 to 2010 average. Reproducing that requires ending the
 *     window where NSIDC ended theirs, which is the point of the window test
 *     below: computed to 2024 it is 12.1 percent, and carrying on to 2025 gives
 *     11.9. The published number is not wrong and neither is ours; a trend
 *     depends on when you stop.
 *   - February 2023 was the record low Antarctic month.
 *   - The satellite record begins 26 October 1978, so November and December have
 *     one more year than the other ten months, and December 1987 and January
 *     1988 are missing entirely because the satellite failed.
 *
 * The real mirror is read from public/data, so a bad fetch fails the suite
 * rather than shipping.
 */

const DATA = parseSeaIce(
  JSON.parse(readFileSync(join(process.cwd(), "public/data/ice/sea-ice.json"), "utf8"))
);
const NORTH = DATA.north!;
const SOUTH = DATA.south!;
const SEPT = NORTH.monthly[9];
const MARCH = NORTH.monthly[3];
const FEB = SOUTH.monthly[2];

describe("the committed Sea Ice Index mirror", () => {
  it("parses both hemispheres with all twelve months", () => {
    expect(NORTH).not.toBeNull();
    expect(SOUTH).not.toBeNull();
    for (let m = 1; m <= 12; m++) {
      expect(NORTH.monthly[m]).toBeDefined();
      expect(SOUTH.monthly[m]).toBeDefined();
    }
  });

  it("starts in 1979, except November and December which start in 1978", () => {
    // The record begins 26 October 1978. October 1978 has no monthly value at
    // all, because six days is not a month, and NSIDC declines to average one.
    for (let m = 1; m <= 10; m++) {
      expect(NORTH.monthly[m].years[0]).toBe(FIRST_FULL_YEAR);
    }
    expect(NORTH.monthly[11].years[0]).toBe(1978);
    expect(NORTH.monthly[12].years[0]).toBe(1978);
    expect(NORTH.monthly[10].years[0]).toBe(1979);
  });

  it("leaves the 1987 to 1988 satellite outage empty rather than filled", () => {
    expect(NORTH.monthly[12].missing).toContain(1987);
    expect(NORTH.monthly[1].missing).toContain(1988);
    expect(SOUTH.monthly[12].missing).toContain(1987);
    expect(SOUTH.monthly[1].missing).toContain(1988);
    // And the gap is a null, not a zero: a zero would drag a trend line down.
    const i = NORTH.monthly[12].years.indexOf(1987);
    expect(NORTH.monthly[12].extent[i]).toBeNull();
  });

  it("never has area exceeding extent, in any month of either hemisphere", () => {
    // Extent counts a partly covered cell in full, so area <= extent is a
    // structural fact. If it ever fails, the columns have been swapped and
    // nothing else on the page can be trusted.
    let checked = 0;
    for (const hemi of [NORTH, SOUTH]) {
      for (let m = 1; m <= 12; m++) {
        const s = hemi.monthly[m];
        for (let i = 0; i < s.years.length; i++) {
          const e = s.extent[i];
          const a = s.area[i];
          if (e === null || a === null) continue;
          expect(a).toBeLessThanOrEqual(e);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });

  it("records which instrument covered which years", () => {
    // The product changes under the trend line and a reader is entitled to know.
    const sources = Object.keys(SEPT.sources);
    expect(sources.length).toBeGreaterThanOrEqual(1);
    expect(sources.join(" ")).toMatch(/NSIDC-\d+/);
  });

  it("refuses malformed input instead of half-parsing it", () => {
    expect(parseSeaIce(null).north).toBeNull();
    expect(parseSeaIce({}).north).toBeNull();
    expect(parseSeaIce({ hemispheres: {} }).north).toBeNull();
    // area greater than extent is rejected outright
    expect(
      parseSeaIce({
        hemispheres: {
          north: {
            monthly: { 9: { years: [2000], extent: [4], area: [5] } },
          },
        },
      }).north
    ).toBeNull();
    // years out of order
    expect(
      parseSeaIce({
        hemispheres: {
          north: {
            monthly: { 9: { years: [2001, 2000], extent: [4, 4], area: [3, 3] } },
          },
        },
      }).north
    ).toBeNull();
  });
});

describe("the Arctic, against NSIDC's published figures", () => {
  it("puts the record low September in 2012 at 3.57 million square km", () => {
    const e = extremes(SEPT)!;
    expect(e.lowest.year).toBe(2012);
    expect(e.lowest.value).toBeCloseTo(3.57, 2);
  });

  it("reproduces the published 12.2 percent per decade when it ends where NSIDC ended", () => {
    const to2024 = trend(SEPT, FIRST_FULL_YEAR, 2024)!;
    expect(to2024.percentPerDecade!).toBeLessThan(-11.9);
    expect(to2024.percentPerDecade!).toBeGreaterThan(-12.4);
    // and the absolute slope, about three quarters of a million square km per
    // decade of September ice
    expect(to2024.perDecade).toBeCloseTo(-0.78, 1);
  });

  it("gets shallower as more years are added, which is the window effect", () => {
    // Ending on the record low year is what makes a trend look steepest. This is
    // the sea ice counterpart of the climate tab's baseline point, except here
    // the number really does change, and the honest response is to print the
    // window beside it rather than to pick one.
    const to2012 = trend(SEPT, FIRST_FULL_YEAR, 2012)!;
    const toNow = trend(SEPT, FIRST_FULL_YEAR, 3000)!;
    expect(to2012.percentPerDecade!).toBeLessThan(-13);
    expect(toNow.percentPerDecade!).toBeGreaterThan(to2012.percentPerDecade!);
    expect(toNow.percentPerDecade!).toBeLessThan(-11);
  });

  it("quotes the trend against the 1981 to 2010 mean, as NSIDC does", () => {
    const t = trend(SEPT, FIRST_FULL_YEAR, 3000)!;
    expect(t.referenceYears).toEqual(CLIMATOLOGY_YEARS);
    // The September mean over that period is about 6.4 million square km.
    expect(t.referenceMean!).toBeCloseTo(6.4, 1);
    expect(t.percentPerDecade!).toBeCloseTo((t.perDecade / t.referenceMean!) * 100, 9);
  });

  it("carries a standard error, and it is small next to the slope", () => {
    const t = trend(SEPT, FIRST_FULL_YEAR, 3000)!;
    expect(t.stdErrPerDecade).toBeGreaterThan(0);
    // The Arctic September decline is many times its own error bar, which is why
    // it is not seriously disputed.
    expect(Math.abs(t.perDecade) / t.stdErrPerDecade).toBeGreaterThan(8);
  });

  it("loses summer ice several times faster than winter ice", () => {
    // The single most important thing a one-number annual figure hides.
    const byMonth = trendByMonth(NORTH);
    const sept = byMonth.find((b) => b.month === 9)!.trend!;
    const jan = byMonth.find((b) => b.month === 1)!.trend!;
    expect(sept.percentPerDecade!).toBeLessThan(-10);
    expect(jan.percentPerDecade!).toBeGreaterThan(-4);
    expect(sept.percentPerDecade! / jan.percentPerDecade!).toBeGreaterThan(3);

    // and September is the steepest month of all twelve
    const steepest = byMonth
      .filter((b) => b.trend?.percentPerDecade != null)
      .reduce((a, b) => (b.trend!.percentPerDecade! < a.trend!.percentPerDecade! ? b : a));
    expect(steepest.month).toBe(9);
  });

  it("has every month of the year in decline", () => {
    for (const { trend: t } of trendByMonth(NORTH)) {
      expect(t).not.toBeNull();
      expect(t!.perDecade).toBeLessThan(0);
    }
  });

  it("ranks a year among the whole record", () => {
    const r = rankLowest(SEPT, 2012)!;
    expect(r.rank).toBe(1);
    expect(r.outOf).toBeGreaterThan(40);
    expect(rankLowest(SEPT, 1900)).toBeNull();
  });

  it("has the lowest March maximum in the last two years of the record", () => {
    // Worth pinning because it is current and checkable: the winter maximum has
    // its two lowest values at the end of the record, not scattered through it.
    const e = extremes(MARCH)!;
    expect(e.lowest.year).toBeGreaterThan(2020);
    const r = rankLowest(MARCH, e.latest.year)!;
    expect(r.rank).toBeLessThanOrEqual(3);
  });
});

describe("the Antarctic, which is not the Arctic", () => {
  it("puts the record low February in 2023", () => {
    const e = extremes(FEB)!;
    expect(e.lowest.year).toBe(2023);
    expect(e.lowest.value).toBeLessThan(2.1);
  });

  it("changes SIGN depending on the window, unlike the Arctic", () => {
    // The whole point of this hemisphere. Up to 2014 the trend is positive; from
    // 2014 onward it is sharply negative. Both windows are honest arithmetic on
    // the same file, which is how one dataset came to be quoted on both sides of
    // an argument.
    const early = trend(FEB, FIRST_FULL_YEAR, 2014)!;
    const late = trend(FEB, 2014, 3000)!;
    expect(early.perDecade).toBeGreaterThan(0);
    expect(late.perDecade).toBeLessThan(-0.5);
  });

  it("holds two significant trends of opposite sign inside one flat record", () => {
    // The finding that corrected an assumption made while writing this file. The
    // guess was that the early Antarctic increase had never been significant and
    // was only ever noise. Measured, it is 2.3 times its own standard error, and
    // the winter maximum's early rise is 4 times its error: both are real at the
    // conventional level. The reversal after 2014 is real too, and about seven
    // times steeper.
    //
    // What is NOT significant is the full-record trend, at 1.5 sigma. So this one
    // series contains a real rise, a real fall, and a total that is
    // indistinguishable from no change at all. That is not a contradiction, it is
    // what happens when a system changes regime, and it is the reason this tab
    // prints windows and error bars beside every slope instead of one number.
    const early = trend(FEB, FIRST_FULL_YEAR, 2014)!;
    const late = trend(FEB, 2014, 3000)!;
    const whole = trend(FEB, FIRST_FULL_YEAR, 3000)!;

    expect(Math.abs(early.perDecade) / early.stdErrPerDecade).toBeGreaterThan(2);
    expect(Math.abs(late.perDecade) / late.stdErrPerDecade).toBeGreaterThan(2);
    expect(Math.abs(whole.perDecade) / whole.stdErrPerDecade).toBeLessThan(2);
    expect(Math.abs(late.perDecade) / Math.abs(early.perDecade)).toBeGreaterThan(4);
  });

  it("is nothing like as certain as the Arctic, and the error bars say so", () => {
    // The Arctic September decline is 13 times its standard error. The Antarctic
    // full-record trend is 1.5 times. Quoting the two as comparable claims, which
    // happens constantly, is a statement about error bars nobody printed.
    const arctic = trend(SEPT, FIRST_FULL_YEAR, 3000)!;
    const antarctic = trend(FEB, FIRST_FULL_YEAR, 3000)!;
    const arcticSigma = Math.abs(arctic.perDecade) / arctic.stdErrPerDecade;
    const antarcticSigma = Math.abs(antarctic.perDecade) / antarctic.stdErrPerDecade;
    expect(arcticSigma).toBeGreaterThan(8);
    expect(antarcticSigma).toBeLessThan(2);
  });

  it("shows the same reversal in the winter maximum", () => {
    const sept = SOUTH.monthly[9];
    const early = trend(sept, FIRST_FULL_YEAR, 2014)!;
    const late = trend(sept, 2014, 3000)!;
    expect(early.perDecade).toBeGreaterThan(0);
    expect(late.perDecade).toBeLessThan(-1);
  });

  it("is far larger at maximum than the Arctic is", () => {
    // The Antarctic maximum is about 18.5 million square km against the Arctic's
    // 15.4: the ice grows outward into open ocean with nothing to stop it.
    const antarcticMax = mean(SOUTH.monthly[9], 1981, 2010)!;
    const arcticMax = mean(MARCH, 1981, 2010)!;
    expect(antarcticMax).toBeGreaterThan(arcticMax);
  });
});

describe("extent against area, the convention made visible", () => {
  it("has extent larger than area in every year", () => {
    for (const y of SEPT.years) {
      const g = extentAreaGap(SEPT, y);
      if (!g) continue;
      expect(g.gap).toBeGreaterThan(0);
    }
  });

  it("makes the gap a quarter to a half of the headline number", () => {
    // Not a rounding correction. At the September minimum a third of the ice
    // "extent" is water, by the 15 percent rule's own arithmetic.
    for (const y of [1979, 2012, SEPT.years[SEPT.years.length - 1]]) {
      const g = extentAreaGap(SEPT, y);
      if (!g) continue;
      expect(g.fraction).toBeGreaterThan(0.2);
      expect(g.fraction).toBeLessThan(0.5);
    }
  });

  it("does not have a constant gap, so it cannot be a fixed correction", () => {
    const a = extentAreaGap(SEPT, 1996)!;
    const b = extentAreaGap(SEPT, 2012)!;
    expect(Math.abs(a.fraction - b.fraction)).toBeGreaterThan(0.02);
  });

  it("names the threshold rather than hiding it", () => {
    expect(EXTENT_THRESHOLD_PERCENT).toBe(15);
  });

  it("returns nothing for a year it does not have", () => {
    expect(extentAreaGap(SEPT, 1850)).toBeNull();
    expect(extentAreaGap(null, 2012)).toBeNull();
  });
});

describe("the daily curve", () => {
  it("finds the 2012 Arctic minimum in the middle of September", () => {
    const d = dailyExtremes(NORTH.daily[2012])!;
    expect(d.minimum.extent).toBeLessThan(3.5);
    // day 260 is 16 September
    expect(d.minimum.doy).toBeGreaterThan(250);
    expect(d.minimum.doy).toBeLessThan(270);
    expect(d.complete).toBe(true);
  });

  it("finds the Arctic maximum in late February or March", () => {
    const d = dailyExtremes(NORTH.daily[2024])!;
    expect(d.maximum.doy).toBeGreaterThan(50);
    expect(d.maximum.doy).toBeLessThan(100);
  });

  it("puts the Antarctic minimum in February, opposite the Arctic", () => {
    const d = dailyExtremes(SOUTH.daily[2023])!;
    expect(d.minimum.doy).toBeLessThan(80);
    expect(d.minimum.extent).toBeLessThan(2.0);
  });

  it("says when a year is still in progress instead of calling it a minimum", () => {
    const years = Object.keys(NORTH.daily).map(Number).sort();
    const current = NORTH.daily[years[years.length - 1]];
    const d = dailyExtremes(current)!;
    // The current year cannot have had its minimum yet if the record stops
    // before the end of December, and the flag has to say so.
    if (current.doy[current.doy.length - 1] < 365) {
      expect(d.complete).toBe(false);
    }
  });

  it("places a day inside NSIDC's own percentile band", () => {
    const clim = NORTH.climatology!;
    expect(clim.doy.length).toBeGreaterThan(360);
    const b = bandPosition(clim, 250, 4.0)!;
    expect(b.p10).toBeLessThanOrEqual(b.p50);
    expect(b.p50).toBeLessThanOrEqual(b.p90);
    // 4.0 million square km in mid September is far below anything 1981 to 2010
    expect(b.label).toContain("below the 10th percentile");
    // and something typical of that era lands in the middle
    expect(bandPosition(clim, 250, b.p50)!.label).toContain("middle half");
  });

  it("refuses a day it has no climatology for", () => {
    expect(bandPosition(NORTH.climatology, 400, 5)).toBeNull();
    expect(bandPosition(null, 250, 5)).toBeNull();
  });

  it("labels day numbers as dates", () => {
    expect(doyLabel(1)).toContain("Jan");
    expect(doyLabel(260)).toContain("Sep");
    expect(doyLabel(0)).toBe("unknown");
    expect(doyLabel(400)).toBe("unknown");
  });
});

describe("what the module refuses to do", () => {
  it("will not fit a trend to fewer than ten years", () => {
    expect(trend(SEPT, 2020, 2025)).toBeNull();
    expect(trend(SEPT, 2020, 2028)).toBeNull();
    expect(trend(SEPT, 2016, 2025)).not.toBeNull();
  });

  it("will not average fewer than three years", () => {
    expect(mean(SEPT, 2024, 2025)).toBeNull();
    expect(mean(SEPT, 2023, 2025)).not.toBeNull();
  });

  it("returns null rather than guessing, for every entry point", () => {
    expect(trend(null, 1979, 2020)).toBeNull();
    expect(mean(null, 1979, 2020)).toBeNull();
    expect(extremes(null)).toBeNull();
    expect(rankLowest(null, 2012)).toBeNull();
    expect(dailyExtremes(null)).toBeNull();
    expect(trendByMonth(null)).toEqual([]);
    expect(trend(SEPT, NaN, 2020)).toBeNull();
  });
});
