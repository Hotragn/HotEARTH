import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  METHANE_GWP,
  PREINDUSTRIAL_CH4_PPB,
  PREINDUSTRIAL_CO2_PPM,
  annualGrowth,
  annualMean,
  centredMovingAverage,
  compareAmplitude,
  growthByDecade,
  methaneGwp,
  parseCarbon,
  seasonalCycle,
  SEASONAL_COPY,
  timesPreindustrial,
} from "./carbon";

/**
 * Validation strategy: published values, and identities that must hold for any
 * correct implementation. Nothing is pinned to a previous run of this code.
 *
 * Published anchors used:
 *   - The Keeling record begins March 1958 at 315.71 ppm.
 *   - Mauna Loa CO2 is now above 420 ppm.
 *   - The Mauna Loa seasonal cycle peaks in MAY, just before northern leaf-out
 *     draws it down, and troughs in September or October.
 *   - Its peak-to-trough amplitude is roughly 6 ppm, and the globally
 *     averaged cycle is about a third smaller rather than cancelled, because
 *     most of the world's land is in the northern hemisphere.
 *   - Growth has accelerated from under 1 ppm/yr in the 1960s to over 2 ppm/yr
 *     in the 2010s.
 *   - Pre-industrial CO2 280 ppm and CH4 722 ppb, from Antarctic ice cores
 *     (IPCC AR6).
 *   - Methane GWP from IPCC AR6 Table 7.15: about 80 over 20 years and 28 over
 *     100 years, the difference being a choice of horizon rather than a fact.
 */

const REAL = parseCarbon(
  JSON.parse(
    readFileSync(join(process.cwd(), "public/data/carbon/greenhouse-gases.json"), "utf8")
  )
);

describe("the committed dataset", () => {
  it("carries all three series", () => {
    expect(REAL.co2_mlo).not.toBeNull();
    expect(REAL.co2_glob).not.toBeNull();
    expect(REAL.ch4_glob).not.toBeNull();
  });

  it("begins the Keeling record in March 1958", () => {
    const s = REAL.co2_mlo!;
    expect(s.years[0]).toBe(1958);
    expect(s.months[0]).toBe(3);
    // The first published monthly mean of the record.
    expect(s.value[0]).toBeCloseTo(315.71, 2);
  });

  it("has CO2 above 420 ppm now and methane above 1900 ppb", () => {
    const co2 = REAL.co2_mlo!;
    const ch4 = REAL.ch4_glob!;
    expect(co2.value[co2.value.length - 1]).toBeGreaterThan(420);
    expect(ch4.value[ch4.value.length - 1]).toBeGreaterThan(1900);
    expect(co2.unit).toBe("ppm");
    expect(ch4.unit).toBe("ppb");
  });

  it("is strictly ordered in time with aligned arrays", () => {
    for (const s of [REAL.co2_mlo!, REAL.co2_glob!, REAL.ch4_glob!]) {
      expect(s.months).toHaveLength(s.years.length);
      expect(s.value).toHaveLength(s.years.length);
      expect(s.trend).toHaveLength(s.years.length);
      expect(s.time).toHaveLength(s.years.length);
      for (let i = 1; i < s.time.length; i++) {
        expect(s.time[i]).toBeGreaterThan(s.time[i - 1]);
      }
      for (const m of s.months) {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      }
    }
  });

  it("rises overall on every series", () => {
    for (const s of [REAL.co2_mlo!, REAL.co2_glob!, REAL.ch4_glob!]) {
      const first = s.value.slice(0, 12).reduce((a, b) => a + b, 0) / 12;
      const last = s.value.slice(-12).reduce((a, b) => a + b, 0) / 12;
      expect(last).toBeGreaterThan(first);
    }
  });
});

describe("the 12-month centred average", () => {
  it("removes a pure annual cycle exactly", () => {
    // A sine with a 12-month period on a flat baseline must average to the
    // baseline: this is the whole reason the window is one year.
    const values = Array.from(
      { length: 60 },
      (_, i) => 400 + 3 * Math.sin((2 * Math.PI * i) / 12)
    );
    const smooth = centredMovingAverage(values, 12);
    for (let i = 6; i < values.length - 6; i++) {
      expect(smooth[i]!).toBeCloseTo(400, 6);
    }
  });

  it("removes the cycle from a rising trend without distorting the slope", () => {
    const values = Array.from(
      { length: 120 },
      (_, i) => 400 + 0.2 * i + 3 * Math.sin((2 * Math.PI * i) / 12)
    );
    const smooth = centredMovingAverage(values, 12);
    // The smoothed value at i is the trend at i, to numerical precision.
    for (let i = 6; i < values.length - 6; i++) {
      expect(smooth[i]!).toBeCloseTo(400 + 0.2 * i, 6);
    }
  });

  it("leaves the ends null rather than padding them", () => {
    const smooth = centredMovingAverage([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], 12);
    expect(smooth[0]).toBeNull();
    expect(smooth[5]).toBeNull();
    expect(smooth[6]).not.toBeNull();
    expect(smooth[smooth.length - 1]).toBeNull();
  });

  it("degrades to nulls for nonsense input", () => {
    expect(centredMovingAverage([1, 2, 3], 1)).toEqual([null, null, null]);
    expect(centredMovingAverage([], 12)).toEqual([]);
  });
});

describe("the seasonal cycle IS the biosphere", () => {
  it("peaks in May at Mauna Loa, just before northern leaf-out", () => {
    const c = seasonalCycle(REAL.co2_mlo, 1990)!;
    expect(c).not.toBeNull();
    expect(c.peakMonth).toBe(5);
    // and troughs at the end of the northern growing season
    expect([9, 10]).toContain(c.troughMonth);
  });

  it("has roughly a 6 ppm swing there", () => {
    const c = seasonalCycle(REAL.co2_mlo, 1990)!;
    expect(c.amplitude).toBeGreaterThan(4.5);
    expect(c.amplitude).toBeLessThan(8);
  });

  it("sums to about zero across the twelve months, as a departure must", () => {
    const c = seasonalCycle(REAL.co2_mlo, 1990)!;
    const sum = c.byMonth.reduce((a, b) => a! + b!, 0)!;
    expect(Math.abs(sum)).toBeLessThan(0.5);
  });

  it("is smaller in the global average, but nowhere near cancelled", () => {
    // The measured result, which is sharper than the textbook telling. The
    // obvious guess is that averaging both hemispheres cancels the cycle. It
    // does not: the global swing is about a third smaller, not several times
    // smaller, because most of the world's land is north of the equator, so the
    // southern cycle trims the northern signal rather than opposing it evenly.
    const station = seasonalCycle(REAL.co2_mlo, 1990)!;
    const global = seasonalCycle(REAL.co2_glob, 1990)!;
    expect(station.amplitude).toBeGreaterThan(6);
    expect(global.amplitude).toBeGreaterThan(3.5);
    expect(global.amplitude).toBeLessThan(station.amplitude);
    const ratio = station.amplitude / global.amplitude;
    expect(ratio).toBeGreaterThan(1.25);
    expect(ratio).toBeLessThan(1.8);
  });

  it("peaks a month earlier in the global average than at Mauna Loa", () => {
    const station = seasonalCycle(REAL.co2_mlo, 1990)!;
    const global = seasonalCycle(REAL.co2_glob, 1990)!;
    expect(station.peakMonth).toBe(5);
    expect(global.peakMonth).toBe(4);
  });

  it("returns null when there is not a full year of data", () => {
    expect(seasonalCycle(null)).toBeNull();
    expect(seasonalCycle(REAL.co2_mlo, 3000)).toBeNull();
  });
});

describe("the two-station comparison", () => {
  it("compares over the OVERLAPPING years only", () => {
    const c = compareAmplitude(REAL.co2_mlo, REAL.co2_glob)!;
    // Mauna Loa starts 1958, the global series 1979: the comparison must start
    // at the later of the two, or a growing amplitude would be confounded with
    // the geography.
    expect(c.from).toBe(1979);
    expect(c.to).toBeGreaterThan(2020);
  });

  it("finds the station swinging about 1.45 times the globe, not several times", () => {
    const c = compareAmplitude(REAL.co2_mlo, REAL.co2_glob)!;
    expect(c.stationAmplitude).toBeGreaterThan(c.globalAmplitude);
    expect(c.ratio).toBeGreaterThan(1.25);
    expect(c.ratio).toBeLessThan(1.8);
    // A month earlier globally, from the mix of latitudes contributing.
    expect(c.globalPeakMonth).toBeLessThan(c.stationPeakMonth);
  });

  it("returns null without both series", () => {
    expect(compareAmplitude(REAL.co2_mlo, null)).toBeNull();
    expect(compareAmplitude(null, REAL.co2_glob)).toBeNull();
  });
});

describe("annual means and growth", () => {
  it("REFUSES a partial year rather than biasing it", () => {
    // A mid-year cut averaged as though whole would sit on the seasonal cycle
    // instead of the trend, a bias of several ppm.
    const s = REAL.co2_mlo!;
    const lastYear = s.years[s.years.length - 1];
    expect(annualMean(REAL.co2_mlo, lastYear)).toBeNull(); // in progress
    expect(annualMean(REAL.co2_mlo, 2020)).not.toBeNull();
    expect(annualMean(REAL.co2_mlo, 1957)).toBeNull(); // before the record
    expect(annualMean(null, 2020)).toBeNull();
  });

  it("reproduces a plausible recent annual mean and growth", () => {
    const m2020 = annualMean(REAL.co2_mlo, 2020)!;
    expect(m2020).toBeGreaterThan(410);
    expect(m2020).toBeLessThan(420);
    const g = annualGrowth(REAL.co2_mlo, 2020)!;
    expect(g).toBeGreaterThan(1);
    expect(g).toBeLessThan(4);
  });

  it("shows the acceleration from the 1960s to the 2010s", () => {
    const decades = growthByDecade(REAL.co2_mlo);
    const at = (d: number) => decades.find((x) => x.decade === d);
    expect(at(1960)!.perYear).toBeLessThan(1.2);
    expect(at(2010)!.perYear).toBeGreaterThan(2);
    // and it is more than double
    expect(at(2010)!.perYear / at(1960)!.perYear).toBeGreaterThan(2);
  });

  it("skips a decade with too few complete years", () => {
    const decades = growthByDecade(REAL.co2_mlo);
    for (const d of decades) expect(d.n).toBeGreaterThanOrEqual(5);
    expect(growthByDecade(null)).toEqual([]);
  });
});

describe("against pre-industrial", () => {
  it("uses the published ice-core figures", () => {
    expect(PREINDUSTRIAL_CO2_PPM).toBe(280);
    expect(PREINDUSTRIAL_CH4_PPB).toBe(722);
  });

  it("puts CO2 about half again above pre-industrial and methane far higher", () => {
    const co2 = REAL.co2_mlo!;
    const ch4 = REAL.ch4_glob!;
    const rCo2 = timesPreindustrial(co2.value[co2.value.length - 1], "co2")!;
    const rCh4 = timesPreindustrial(ch4.value[ch4.value.length - 1], "ch4")!;
    expect(rCo2).toBeGreaterThan(1.4);
    expect(rCo2).toBeLessThan(1.7);
    // Methane has more than doubled, which is the less well known number.
    expect(rCh4).toBeGreaterThan(2.5);
  });

  it("returns null for impossible input", () => {
    expect(timesPreindustrial(NaN, "co2")).toBeNull();
    expect(timesPreindustrial(0, "co2")).toBeNull();
    expect(timesPreindustrial(-5, "ch4")).toBeNull();
  });
});

describe("methane potency is a choice of horizon", () => {
  it("matches the published AR6 values", () => {
    expect(methaneGwp(20)!).toBeCloseTo(79.7, 1);
    expect(methaneGwp(100)!).toBeCloseTo(27.9, 1);
  });

  it("falls with horizon, because methane does not last", () => {
    const sorted = [...METHANE_GWP].sort((a, b) => a.horizonYears - b.horizonYears);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].gwp).toBeLessThan(sorted[i - 1].gwp);
    }
    // The 20-year figure is nearly three times the 100-year one: same gas, same
    // physics, different question.
    expect(methaneGwp(20)! / methaneGwp(100)!).toBeGreaterThan(2.5);
  });

  it("REFUSES to interpolate a horizon that has no published value", () => {
    // A GWP is an integral over a specific horizon; halfway between two of them
    // is not a number anyone published.
    expect(methaneGwp(50)).toBeNull();
    expect(methaneGwp(0)).toBeNull();
    expect(methaneGwp(NaN)).toBeNull();
  });

  it("explains each horizon rather than just listing it", () => {
    for (const g of METHANE_GWP) {
      expect(g.note.length).toBeGreaterThan(40);
      expect(g.note).not.toContain("—"); // project style: no em-dashes
    }
  });
});

describe("parsing", () => {
  it("never throws on garbage", () => {
    for (const bad of [null, undefined, 42, "x", {}, { co2_mlo: 5 }]) {
      expect(() => parseCarbon(bad)).not.toThrow();
    }
    expect(parseCarbon(null).co2_mlo).toBeNull();
  });

  it("rejects a series whose arrays do not line up", () => {
    const d = parseCarbon({
      co2_mlo: { unit: "ppm", years: [2000, 2001], months: [1], value: [370, 371] },
    });
    expect(d.co2_mlo).toBeNull();
  });

  it("drops an unusable month WITHOUT shifting later dates", () => {
    const d = parseCarbon({
      co2_mlo: {
        unit: "ppm",
        years: [2000, 2000, 2000],
        months: [1, 2, 3],
        value: [370, null, 372],
        trend: [370, 371, 372],
      },
    });
    expect(d.co2_mlo!.months).toEqual([1, 3]);
    expect(d.co2_mlo!.value).toEqual([370, 372]);
  });

  it("rejects an impossible month", () => {
    const d = parseCarbon({
      co2_mlo: { unit: "ppm", years: [2000, 2000], months: [13, 4], value: [370, 371] },
    });
    expect(d.co2_mlo!.months).toEqual([4]);
  });
});

describe("seasonal mechanism copy", () => {
  // A bug caught by looking at the rendered page rather than by any assertion:
  // the methane chart was captioned with the CO2 vegetation explanation. The
  // physics is different (methane's cycle is dominated by its hydroxyl sink),
  // and a confidently wrong mechanism is worse than none, so the wording is now
  // keyed to the series and pinned here.
  it("gives every series its own explanation", () => {
    const notes = new Set(Object.values(SEASONAL_COPY).map((c) => c.note));
    expect(notes.size).toBe(3);
  });

  it("never explains methane with leaf-out", () => {
    const ch4 = SEASONAL_COPY.ch4_glob;
    const words = `${ch4.note} ${ch4.peakReason} ${ch4.troughReason}`.toLowerCase();
    for (const forbidden of ["leaf", "forest", "photosynth", "growing season", "vegetation"]) {
      expect(words).not.toContain(forbidden);
    }
    expect(ch4.note.toLowerCase()).toContain("hydroxyl");
  });

  it("explains both CO2 series with vegetation, which is the actual cause", () => {
    for (const id of ["co2_mlo", "co2_glob"] as const) {
      expect(SEASONAL_COPY[id].note.toLowerCase()).toMatch(/vegetation|leaf|forest/);
    }
  });
});
