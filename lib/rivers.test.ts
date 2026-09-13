import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CFS_TO_CUMECS,
  DAILY_MEAN_CODE,
  EXTRAPOLATION_NOTE,
  HISTORIC_CODE,
  NAME_IS_THE_PROBLEM_NOTE,
  NEVER_NATURAL_NOTE,
  PEAK_CODES,
  REGULATION_CODE,
  RETURN_PERIOD_CEILING,
  WATER_YEAR_NOTE,
  bootstrapInterval,
  cfsToCumecs,
  dischargeFor,
  exceedanceProbability,
  frequencyFactor,
  historicReach,
  logPearson3,
  multipleExceedanceProbability,
  normalQuantile,
  parseRivers,
  plottingPositions,
  returnPeriodFor,
  splitByRegulation,
  summarise,
  unitDischarge,
  type Gauge,
} from "./rivers";

/**
 * Validated against published values and against exact mathematics, never
 * against a previous run.
 *
 * Anchors:
 *   - THE NORMAL QUANTILE against the standard published z values: 1.644854 at
 *     95 percent, 1.959964 at 97.5, 2.326348 at 99, 3.090232 at 99.9.
 *   - THE FREQUENCY FACTOR against EXACT Pearson III quantiles, derived in this
 *     file rather than quoted. When 4/skew^2 is a whole number the Pearson III
 *     distribution is an Erlang, whose CDF is a finite sum, so the exact
 *     quantile can be bisected to machine precision with no special functions
 *     and no table. That gives four independent check points across the useful
 *     range of skew and measures the Wilson-Hilferty error directly.
 *   - THE EXCEEDANCE ARITHMETIC against the figure FEMA and USGS both publish:
 *     a one percent flood has a 26 percent chance of occurring at least once in
 *     thirty years.
 *   - THE WATER YEAR RULE against the data: applying it turns 883 peaks with
 *     duplicate years on every one of eight gauges into 883 with none.
 *   - THE REGULATION FLAG against USGS itself, which marks the Colorado at Lees
 *     Ferry as regulated from the water year Glen Canyon Dam closed.
 *
 * The real mirror is read from public/data, so a bad fetch fails the suite
 * rather than shipping.
 */

const DATA = parseRivers(
  JSON.parse(readFileSync(join(process.cwd(), "public/data/rivers/rivers.json"), "utf8"))
)!;

const byLabel = (label: string): Gauge =>
  DATA.gauges.find((g) => g.label === label)!;

const FLATHEAD = byLabel("Middle Fork Flathead");
const WILLAMETTE = byLabel("Willamette");
const SACRAMENTO = byLabel("Sacramento");
const LEES_FERRY = byLabel("Colorado at Lees Ferry");
const MISSISSIPPI = byLabel("Mississippi at St. Louis");
const POTOMAC = byLabel("Potomac");

/**
 * Exact Pearson III frequency factor, for skews where 4/skew^2 is an integer.
 *
 * Pearson III standardised is (Y - a) / sqrt(a) for Y drawn from a gamma of
 * shape a, with skew 2/sqrt(a). An integer shape makes that gamma an Erlang,
 * whose CDF is exp(-y) times a finite series, so this needs nothing but a loop
 * and a bisection. It exists so the approximation the module ships can be
 * checked against the thing it approximates.
 */
function exactFrequencyFactor(shape: number, probability: number): number {
  const cdf = (y: number) => {
    let term = 1;
    let sum = 1;
    for (let k = 1; k < shape; k++) {
      term *= y / k;
      sum += term;
    }
    return 1 - Math.exp(-y) * sum;
  };
  let lo = 0;
  let hi = 1e4;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(mid) < probability) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2 - shape) / Math.sqrt(shape);
}

describe("the payload", () => {
  it("parses eight gauges", () => {
    expect(DATA).not.toBeNull();
    expect(DATA.gauges).toHaveLength(8);
    for (const g of DATA.gauges) expect(g.peaks.length).toBeGreaterThan(50);
  });

  it("derives the water year rather than reading the calendar year", () => {
    // A water year runs October to September and is named for the year it ends
    // in. Reading the calendar year out of the date is wrong for every autumn
    // flood, and it is wrong quietly: the result is still sorted and still looks
    // like one peak a year. This is the check that found it.
    for (const g of DATA.gauges) {
      const years = g.peaks.map((p) => p.waterYear);
      expect(new Set(years).size, `${g.label} has a repeated water year`).toBe(years.length);
      expect(years, `${g.label} is out of order`).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it("would have mislabelled a third of the Willamette without that rule", () => {
    // The gauge where the error would have done the most damage, because its
    // floods are winter storms.
    const autumn = WILLAMETTE.peaks.filter((p) => {
      const month = Number(p.date.slice(5, 7));
      return month >= 10;
    });
    expect(autumn.length).toBeGreaterThan(40);
    expect(autumn.length / WILLAMETTE.peaks.length).toBeGreaterThan(0.3);
    // And every one of them sits in the following water year.
    for (const p of autumn) expect(p.waterYear).toBe(Number(p.date.slice(0, 4)) + 1);
    // The largest flood on the river is December 1861, filed as water year 1862.
    const largest = WILLAMETTE.peaks.reduce((a, b) => (b.cfs > a.cfs ? b : a));
    expect(largest.date.startsWith("1861-12")).toBe(true);
    expect(largest.waterYear).toBe(1862);
  });

  it("keeps the qualification codes rather than dropping them", () => {
    const seen = new Set(DATA.gauges.flatMap((g) => Object.keys(g.codeCounts)));
    expect(seen.size).toBeGreaterThan(4);
    for (const code of seen) expect(PEAK_CODES[code], `no wording for code ${code}`).toBeTruthy();
  });
});

describe("the distribution, checked against exact mathematics", () => {
  it("matches the published normal quantiles", () => {
    expect(normalQuantile(0.95)!).toBeCloseTo(1.6448536, 6);
    expect(normalQuantile(0.975)!).toBeCloseTo(1.959964, 6);
    expect(normalQuantile(0.99)!).toBeCloseTo(2.3263479, 6);
    expect(normalQuantile(0.999)!).toBeCloseTo(3.0902323, 6);
    expect(normalQuantile(0.5)!).toBeCloseTo(0, 12);
    expect(normalQuantile(0.05)!).toBeCloseTo(-1.6448536, 6);
  });

  it("reduces exactly to the normal when the skew is zero", () => {
    // A sign error here would move every flood number on the tab in the same
    // direction and still look plausible.
    for (const p of [0.5, 0.8, 0.9, 0.99, 0.998]) {
      expect(frequencyFactor(0, p)!).toBeCloseTo(normalQuantile(p)!, 12);
    }
  });

  it("stays within a third of a percent of the exact Pearson III in the tail", () => {
    // Four skews where the exact answer is computable in closed form, checked at
    // the exceedance probabilities a flood estimate actually uses.
    for (const shape of [1, 4, 16, 100]) {
      const skew = 2 / Math.sqrt(shape);
      for (const p of [0.99, 0.98]) {
        const exact = exactFrequencyFactor(shape, p);
        const approx = frequencyFactor(skew, p)!;
        expect(Math.abs(approx - exact) / exact, `skew ${skew} at p=${p}`).toBeLessThan(0.006);
      }
    }
    // The one that pins the whole thing: skew 1.0 at the one percent level. The
    // exact value is 3.02256, derived above from the Erlang CDF and not quoted
    // from anywhere, and Wilson-Hilferty lands 0.008 high.
    expect(exactFrequencyFactor(4, 0.99)).toBeCloseTo(3.02256, 4);
    expect(Math.abs(frequencyFactor(1, 0.99)! - exactFrequencyFactor(4, 0.99))).toBeLessThan(0.01);
  });

  it("is a tail approximation and is worse in the middle, which is fine", () => {
    // Honest about where the approximation is poor. Nobody estimates a median
    // flood, and pretending the error is uniform would be a claim we can check
    // and it would be false.
    const skew = 2;
    const tail = Math.abs(frequencyFactor(skew, 0.99)! - exactFrequencyFactor(1, 0.99));
    const middle = Math.abs(frequencyFactor(skew, 0.5)! - exactFrequencyFactor(1, 0.5));
    expect(middle).toBeGreaterThan(tail);
    expect(middle).toBeLessThan(0.05);
  });

  it("refuses impossible probabilities instead of returning nonsense", () => {
    for (const p of [0, 1, -1, 2, NaN, Infinity]) expect(normalQuantile(p)).toBeNull();
    expect(frequencyFactor(NaN, 0.99)).toBeNull();
    expect(frequencyFactor(0.5, 1)).toBeNull();
  });
});

describe("the arithmetic nobody believes", () => {
  it("puts a one percent flood at 26 percent odds over a thirty year mortgage", () => {
    // The figure FEMA and USGS both publish, and the one that makes the name
    // "hundred year flood" actively misleading.
    expect(exceedanceProbability(100, 30)!).toBeCloseTo(0.2603, 4);
  });

  it("does not reach certainty over a century", () => {
    expect(exceedanceProbability(100, 100)!).toBeCloseTo(0.634, 3);
    expect(exceedanceProbability(100, 1)!).toBeCloseTo(0.01, 10);
    expect(exceedanceProbability(500, 30)!).toBeCloseTo(0.05829, 5);
  });

  it("makes two in five years a coincidence rather than a contradiction", () => {
    const p = multipleExceedanceProbability(100, 5, 2)!;
    expect(p).toBeCloseTo(0.00098, 5);
    // About one in a thousand at any one gauge, which across thousands of
    // gauges is something that happens somewhere every year.
    expect(1 / p).toBeGreaterThan(900);
    expect(1 / p).toBeLessThan(1100);
  });

  it("is monotone and bounded", () => {
    let previous = 0;
    for (const years of [1, 5, 10, 30, 100, 1000]) {
      const p = exceedanceProbability(100, years)!;
      expect(p).toBeGreaterThan(previous);
      expect(p).toBeLessThan(1);
      previous = p;
    }
    expect(exceedanceProbability(100, 0)!).toBe(0);
    expect(multipleExceedanceProbability(100, 3, 5)!).toBe(0);
  });

  it("refuses a return period that is not one", () => {
    expect(exceedanceProbability(1, 30)).toBeNull();
    expect(exceedanceProbability(0.5, 30)).toBeNull();
    expect(exceedanceProbability(100, -1)).toBeNull();
    expect(multipleExceedanceProbability(100, 5.5, 2)).toBeNull();
  });
});

describe("the record against the curve fitted to it", () => {
  it("puts the largest flood at n plus one years, by construction", () => {
    for (const g of DATA.gauges) {
      const positions = plottingPositions(g.peaks);
      expect(positions[0].rank).toBe(1);
      expect(positions[0].empiricalReturnYears).toBeCloseTo(g.peaks.length + 1, 6);
      expect(positions[0].peak.cfs).toBe(Math.max(...g.peaks.map((p) => p.cfs)));
      // Strictly decreasing return period down the ranks.
      for (let i = 1; i < positions.length; i++) {
        expect(positions[i].empiricalReturnYears).toBeLessThan(
          positions[i - 1].empiricalReturnYears
        );
      }
    }
  });

  it("agrees with itself on the longest, least managed record", () => {
    // A hundred and sixty five years on the Mississippi at St. Louis: the fitted
    // curve puts the 1993 flood within a few percent of where the record does.
    const s = summarise(MISSISSIPPI);
    expect(s.fit!.n).toBeGreaterThan(160);
    const ratio = s.largestFittedReturn! / s.largestEmpiricalReturn!;
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.25);
  });

  it("disagrees with itself badly on a short record with one outlier", () => {
    // The Middle Fork Flathead has eighty five years and a 1964 flood more than
    // twice the next largest. The record says that was a once in eighty six year
    // event because it is the largest of eighty five; the curve calls it far
    // rarer. Both statements come from the same numbers.
    const s = summarise(FLATHEAD);
    expect(s.largest!.waterYear).toBe(1964);
    expect(s.largestEmpiricalReturn!).toBeCloseTo(86, 0);
    expect(s.largestFittedReturn!).toBeGreaterThan(5 * s.largestEmpiricalReturn!);
    // And the flood that happened is nearly twice the hundred year estimate.
    expect(s.largest!.cfs / s.hundredYear!).toBeGreaterThan(1.5);
  });

  it("gives up rather than printing a number when the curve leaves the data", () => {
    // The Sacramento at Verona is flood-controlled in every year of its record.
    // Its peaks are clipped by an operating rule, the spread of the logs
    // collapses, and the curve starts calling ordinary floods impossible.
    const s = summarise(SACRAMENTO);
    expect(s.fit!.skew).toBeLessThan(-1);
    expect(s.largestFittedReturn!).toBe(RETURN_PERIOD_CEILING);
    expect(returnPeriodFor(s.fit, 1e9)!).toBe(RETURN_PERIOD_CEILING);
  });

  it("round-trips a discharge through its own return period", () => {
    const fit = logPearson3(MISSISSIPPI.peaks)!;
    for (const T of [2, 10, 50, 100, 500]) {
      const q = dischargeFor(fit, T)!;
      expect(returnPeriodFor(fit, q)!).toBeCloseTo(T, 3);
    }
  });

  it("refuses to fit a curve to a handful of peaks", () => {
    expect(logPearson3(FLATHEAD.peaks.slice(0, 9))).toBeNull();
    expect(logPearson3([])).toBeNull();
    expect(dischargeFor(null, 100)).toBeNull();
    expect(dischargeFor(logPearson3(FLATHEAD.peaks), 1)).toBeNull();
    expect(returnPeriodFor(null, 1000)).toBeNull();
    expect(returnPeriodFor(logPearson3(FLATHEAD.peaks), -5)).toBeNull();
  });
});

describe("how much of it is extrapolation", () => {
  it("is three times wider on eighty five years than on a hundred and sixty five", () => {
    const short = bootstrapInterval(FLATHEAD.peaks, 100)!;
    const long = bootstrapInterval(MISSISSIPPI.peaks, 100)!;
    expect(short.ratio).toBeGreaterThan(2.5);
    expect(long.ratio).toBeLessThan(1.3);
    expect(short.ratio / long.ratio).toBeGreaterThan(2);
    // The estimate sits inside its own interval, which is not free given the
    // resampling is of a skewed distribution.
    for (const i of [short, long]) {
      expect(i.estimate).toBeGreaterThan(i.low);
      expect(i.estimate).toBeLessThan(i.high);
    }
  });

  it("gives the same interval every time it is asked", () => {
    // A confidence interval that moved on every page load would be the least
    // trustworthy thing on the tab.
    const a = bootstrapInterval(WILLAMETTE.peaks, 100)!;
    const b = bootstrapInterval(WILLAMETTE.peaks, 100)!;
    expect(a).toEqual(b);
    const other = bootstrapInterval(WILLAMETTE.peaks, 100, { seed: 99 })!;
    expect(other.low).not.toBe(a.low);
    expect(other.ratio).toBeCloseTo(a.ratio, 0);
  });

  it("widens as the flood gets rarer", () => {
    const ten = bootstrapInterval(POTOMAC.peaks, 10)!;
    const five_hundred = bootstrapInterval(POTOMAC.peaks, 500)!;
    expect(five_hundred.ratio).toBeGreaterThan(ten.ratio);
  });

  it("refuses a record too short to resample", () => {
    expect(bootstrapInterval(FLATHEAD.peaks.slice(0, 5), 100)).toBeNull();
    expect(bootstrapInterval([], 100)).toBeNull();
  });
});

describe("one river, two rivers", () => {
  it("finds the dam from the USGS flag rather than from memory", () => {
    // Glen Canyon Dam closed in 1963 and the record has carried the regulation
    // code ever since. The split year is read out of the data, so it is the
    // agency that keeps the gauge saying when the river changed.
    const split = splitByRegulation(LEES_FERRY)!;
    expect(split.firstRegulatedYear).toBe(1963);
    expect(split.beforeCount).toBeGreaterThan(40);
    expect(split.afterCount).toBeGreaterThan(55);
    for (const p of LEES_FERRY.peaks) {
      if (p.waterYear >= 1963) expect(p.codes).toContain(REGULATION_CODE);
    }
  });

  it("halves the one percent flood once the dam is there", () => {
    const split = splitByRegulation(LEES_FERRY)!;
    expect(split.beforeDischarge! / split.afterDischarge!).toBeGreaterThan(2);
  });

  it("gets a bigger answer from the join than from either side of it", () => {
    // The counterintuitive one, and the reason this cannot be waved away as
    // conservatism. Mixing two populations inflates the spread more than it
    // moves the middle, so fitting across the dam gives a hundred year flood
    // LARGER than the undammed river ever had.
    const split = splitByRegulation(LEES_FERRY)!;
    expect(split.combinedDischarge!).toBeGreaterThan(split.beforeDischarge!);
    expect(split.combinedDischarge!).toBeGreaterThan(split.afterDischarge!);
  });

  it("splits the Willamette too, and lands the other way round", () => {
    // Willamette Valley Project reservoirs, not one dam, and the combined fit
    // falls between the halves rather than above them. Two regulated rivers,
    // two different failure modes, which is why the tab computes rather than
    // generalises.
    const split = splitByRegulation(WILLAMETTE)!;
    expect(split.firstRegulatedYear).toBeGreaterThan(1935);
    expect(split.firstRegulatedYear).toBeLessThan(1950);
    expect(split.beforeDischarge!).toBeGreaterThan(split.afterDischarge!);
    expect(split.combinedDischarge!).toBeLessThan(split.beforeDischarge!);
    expect(split.combinedDischarge!).toBeGreaterThan(split.afterDischarge!);
  });

  it("returns nothing for a river with no unregulated half", () => {
    // The Sacramento at Verona is flagged in all ninety six years of its
    // record. There is no natural half to compare against, and the honest
    // answer is that the comparison cannot be made.
    expect(SACRAMENTO.peaks.every((p) => p.codes.includes(REGULATION_CODE))).toBe(true);
    expect(splitByRegulation(SACRAMENTO)).toBeNull();
    // And for a river with no dam at all.
    expect(splitByRegulation(FLATHEAD)).toBeNull();
  });

  it("counts the reconstructed peaks that set the far end of the curve", () => {
    // The three largest floods on the Willamette are all flagged historic,
    // meaning high water marks and newspaper accounts rather than a gauge.
    const s = summarise(WILLAMETTE);
    expect(s.historicCount).toBe(3);
    const historic = WILLAMETTE.peaks
      .filter((p) => p.codes.includes(HISTORIC_CODE))
      .map((p) => p.cfs)
      .sort((a, b) => b - a);
    const biggest = WILLAMETTE.peaks.map((p) => p.cfs).sort((a, b) => b - a).slice(0, 3);
    expect(historic).toEqual(biggest);
  });

  it("knows whether the reconstructions are the peaks setting the answer", () => {
    // On the Willamette all three are the three largest floods on the river, so
    // the far end of the curve is fitted almost entirely to inferences. On the
    // Middle Fork Flathead the single reconstruction is not.
    const willamette = historicReach(WILLAMETTE);
    expect(willamette.count).toBe(3);
    expect(willamette.dominatesTheTail).toBe(true);

    const flathead = historicReach(FLATHEAD);
    expect(flathead.count).toBe(1);
    expect(flathead.dominatesTheTail).toBe(false);

    expect(historicReach(POTOMAC)).toEqual({
      count: 0,
      amongLargest: 0,
      dominatesTheTail: false,
    });
  });

  it("does not call three stray flags at the end of a record a regime change", () => {
    // The Mississippi carries the regulation code on three of a hundred and
    // sixty five years. That is not a dam closing, and splitByRegulation
    // refuses rather than fitting ten peaks against a hundred and fifty five.
    const s = summarise(MISSISSIPPI);
    expect(s.regulatedCount).toBeGreaterThan(0);
    expect(s.regulatedCount).toBeLessThan(10);
    expect(s.split).toBeNull();
  });

  it("counts the daily averages that are quietly not peaks", () => {
    // Forty of the Mississippi peaks are maximum daily averages, which are
    // always lower than the instantaneous peak inside that day.
    const s = summarise(MISSISSIPPI);
    expect(s.dailyMeanCount).toBe(40);
    expect(PEAK_CODES[DAILY_MEAN_CODE]).toMatch(/daily average/);
  });
});

describe("units and scale", () => {
  it("converts by the exact definitions", () => {
    expect(CFS_TO_CUMECS).toBe(0.028316846592);
    expect(cfsToCumecs(1000)!).toBeCloseTo(28.316846592, 9);
    // The Mississippi's record flood, in the units the rest of the site uses.
    const biggest = Math.max(...MISSISSIPPI.peaks.map((p) => p.cfs));
    expect(cfsToCumecs(biggest)!).toBeGreaterThan(30_000);
  });

  it("shows small basins delivering far more water per square mile", () => {
    // Flood peaks do not scale with basin size: a continental basin's
    // tributaries peak on different days and never add up.
    const small = summarise(FLATHEAD);
    const large = summarise(MISSISSIPPI);
    const unitSmall = unitDischarge(small.largest!.cfs, FLATHEAD.drainageAreaSqMi)!;
    const unitLarge = unitDischarge(large.largest!.cfs, MISSISSIPPI.drainageAreaSqMi)!;
    expect(FLATHEAD.drainageAreaSqMi!).toBeLessThan(MISSISSIPPI.drainageAreaSqMi! / 100);
    expect(unitSmall).toBeGreaterThan(50 * unitLarge);
  });

  it("returns null rather than dividing by a missing area", () => {
    expect(unitDischarge(1000, null)).toBeNull();
    expect(unitDischarge(1000, 0)).toBeNull();
    expect(cfsToCumecs(-1)).toBeNull();
    expect(cfsToCumecs(NaN)).toBeNull();
  });
});

describe("bad input gives null, never a throw", () => {
  it("refuses anything that is not the payload", () => {
    for (const junk of [null, undefined, 0, "", [], {}, { gauges: [] }, { gauges: 3 }]) {
      expect(parseRivers(junk)).toBeNull();
    }
  });

  it("drops a gauge with no usable peaks rather than shipping an empty curve", () => {
    expect(
      parseRivers({ gauges: [{ site: "X", peaks: [{ waterYear: 2000, cfs: 0 }] }] })
    ).toBeNull();
    const partial = parseRivers({
      gauges: [{ site: "X", peaks: [{ waterYear: 2000, cfs: -5 }] }, DATA.gauges[0]],
    })!;
    expect(partial.gauges).toHaveLength(1);
  });

  it("summarises a gauge too short to fit without throwing", () => {
    const stub: Gauge = { ...FLATHEAD, peaks: FLATHEAD.peaks.slice(0, 4) };
    const s = summarise(stub);
    expect(s.fit).toBeNull();
    expect(s.hundredYear).toBeNull();
    expect(s.interval).toBeNull();
    expect(s.largest).not.toBeNull();
    expect(s.largestFittedReturn).toBeNull();
  });
});

describe("what the tab says about itself", () => {
  const notes = [
    NAME_IS_THE_PROBLEM_NOTE,
    EXTRAPOLATION_NOTE,
    NEVER_NATURAL_NOTE,
    WATER_YEAR_NOTE,
  ];

  it("uses no em dashes anywhere in its copy", () => {
    for (const note of notes) expect(note).not.toMatch(/[\u2013\u2014]/);
  });

  it("never lets the name stand without the definition beside it", () => {
    expect(NAME_IS_THE_PROBLEM_NOTE).toMatch(/one percent chance/);
    expect(NAME_IS_THE_PROBLEM_NOTE).toMatch(/not a schedule/i);
    expect(EXTRAPOLATION_NOTE).toMatch(/extrapolation/i);
  });
});
