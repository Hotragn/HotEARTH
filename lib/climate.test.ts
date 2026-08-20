import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BASELINES,
  compareSeries,
  meanOver,
  parseClimate,
  rebase,
  stripeColor,
  trend,
  warmestYears,
  type TemperatureSeries,
} from "./climate";

/**
 * Validation strategy: mathematical identities that must hold for any correct
 * implementation, plus published values from the two analyses and the IPCC.
 * Nothing is pinned to a previous run of this code.
 *
 * The most important tests here are the INVARIANCE ones. The claim the tab
 * makes is that a baseline changes the headline and cannot change the trend.
 * That is provable, not merely observable, so it is proved: rebasing subtracts
 * a constant from every year, and subtracting a constant from y cannot change
 * dy/dx.
 *
 * Published anchors used:
 *   - GISTEMP 2024 annual anomaly 1.28 C on its 1951-1980 baseline.
 *   - HadCRUT5 2024 annual anomaly 1.51 C. This formatted product is
 *     published against 1850-1900, not the 1961-1990 normal, which is verified
 *     rather than assumed: see the zero-mean test below.
 *   - IPCC AR6: warming of about 1.09 C for 2011-2020 relative to 1850-1900.
 *   - GISTEMP starts 1880, HadCRUT5 starts 1850.
 *   - Each series is zero-mean over its own published baseline, by definition.
 */

const REAL = parseClimate(
  JSON.parse(
    readFileSync(
      join(process.cwd(), "public/data/climate/global-temperature.json"),
      "utf8"
    )
  )
);

/** A synthetic series with an exactly known slope, for the invariance proofs. */
function synthetic(slopePerYear: number, offset = 0): TemperatureSeries {
  const years: number[] = [];
  const anomaly: number[] = [];
  for (let y = 1900; y <= 2000; y++) {
    years.push(y);
    anomaly.push(offset + slopePerYear * (y - 1950));
  }
  return {
    id: "gistemp",
    label: "synthetic",
    baseline: [1951, 1980],
    years,
    anomaly,
    uncertainty: years.map(() => null),
    licence: "test",
    note: "test",
  };
}

describe("the committed dataset", () => {
  it("carries both analyses over their published spans", () => {
    expect(REAL.gistemp).not.toBeNull();
    expect(REAL.hadcrut5).not.toBeNull();
    expect(REAL.gistemp!.years[0]).toBe(1880);
    expect(REAL.hadcrut5!.years[0]).toBe(1850);
    expect(REAL.gistemp!.years.length).toBeGreaterThan(140);
    expect(REAL.hadcrut5!.years.length).toBeGreaterThan(170);
  });

  it("keeps years and anomalies index-aligned", () => {
    for (const s of [REAL.gistemp!, REAL.hadcrut5!]) {
      expect(s.anomaly).toHaveLength(s.years.length);
      expect(s.uncertainty).toHaveLength(s.years.length);
      // strictly increasing years, so no duplicate or reordered rows
      for (let i = 1; i < s.years.length; i++) {
        expect(s.years[i]).toBeGreaterThan(s.years[i - 1]);
      }
    }
  });

  it("is zero-mean over each analysis' own baseline, by definition", () => {
    // This is what "anomaly relative to X" MEANS, so it is the sharpest check
    // that the file has not been mangled or mislabelled. It found a real error:
    // the first version of this assumed HadCRUT5 was on 1961-1990, and this
    // formatted product is published against 1850-1900 instead. Getting a
    // baseline label wrong silently shifts every number on the page, which is
    // precisely the failure this tab is about.
    for (const [series, lo, hi] of [
      [REAL.gistemp, 1951, 1980],
      [REAL.hadcrut5, 1850, 1900],
    ] as const) {
      expect(series!.baseline).toEqual([lo, hi]);
      expect(Math.abs(meanOver(series, lo, hi)!)).toBeLessThan(0.02);
    }
  });

  it("is NOT zero-mean over a baseline it is not on", () => {
    // The other half: HadCRUT5 averages about +0.35 over 1961-1990, which is
    // how you can tell it is not referenced to it.
    expect(Math.abs(meanOver(REAL.hadcrut5, 1961, 1990)!)).toBeGreaterThan(0.2);
  });

  it("has physically plausible anomalies throughout", () => {
    for (const s of [REAL.gistemp!, REAL.hadcrut5!]) {
      for (const a of s.anomaly) {
        expect(a).toBeGreaterThan(-3);
        expect(a).toBeLessThan(3);
      }
    }
  });

  it("carries HadCRUT5 uncertainty, and it widens into the 19th century", () => {
    const h = REAL.hadcrut5!;
    const at = (y: number) => h.uncertainty[h.years.indexOf(y)];
    expect(at(1850)).not.toBeNull();
    expect(at(2020)).not.toBeNull();
    // The early record is far thinner: the published uncertainty is several
    // times wider.
    expect(at(1850)!).toBeGreaterThan(at(2020)! * 2);
  });

  it("reproduces the published 2024 anomalies", () => {
    const g = REAL.gistemp!;
    const h = REAL.hadcrut5!;
    expect(g.anomaly[g.years.indexOf(2024)]).toBeCloseTo(1.28, 2);
    expect(h.anomaly[h.years.indexOf(2024)]).toBeCloseTo(1.51, 2);
  });
});

describe("rebasing changes the number and CANNOT change the trend", () => {
  it("shifts every year by exactly one constant", () => {
    const s = synthetic(0.01);
    const r = rebase(s, 1961, 1990)!;
    const deltas = s.anomaly.map((a, i) => a - r.anomaly[i]);
    for (const d of deltas) expect(d).toBeCloseTo(deltas[0], 12);
  });

  it("leaves the slope identical, to twelve decimal places", () => {
    const s = synthetic(0.0123);
    const before = trend(s, 1900, 2000)!;
    for (const b of BASELINES) {
      const r = rebase(s, b.range[0], b.range[1], { requireFullCoverage: false });
      if (!r) continue;
      const after = trend(r, 1900, 2000)!;
      expect(after.perDecade, b.id).toBeCloseTo(before.perDecade, 12);
      expect(after.stdErrPerDecade, b.id).toBeCloseTo(before.stdErrPerDecade, 12);
      expect(after.rSquared, b.id).toBeCloseTo(before.rSquared, 12);
    }
  });

  it("holds on the real record too, across every baseline", () => {
    const base = trend(REAL.hadcrut5, 1975, 2025)!;
    for (const b of BASELINES) {
      const r = rebase(REAL.hadcrut5, b.range[0], b.range[1]);
      if (!r) continue;
      expect(trend(r, 1975, 2025)!.perDecade, b.id).toBeCloseTo(base.perDecade, 12);
    }
  });

  it("does move the headline number, which is the other half of the point", () => {
    const ipcc = rebase(REAL.hadcrut5, 1850, 1900)!;
    const wmo = rebase(REAL.hadcrut5, 1991, 2020)!;
    const y = 2024;
    const a = ipcc.anomaly[ipcc.years.indexOf(y)];
    const b = wmo.anomaly[wmo.years.indexOf(y)];
    // Same year, same data, and the two conventions differ by more than half a
    // degree: 2024 is about 1.5 against pre-industrial and about 0.6 against
    // the current normal.
    expect(a - b).toBeGreaterThan(0.5);
  });

  it("REFUSES to rebase onto a window the series does not cover", () => {
    // GISTEMP starts in 1880, so it cannot honestly be put on the IPCC
    // 1850-1900 baseline. Returning null beats inventing 30 years of data.
    expect(rebase(REAL.gistemp, 1850, 1900)).toBeNull();
    expect(rebase(REAL.hadcrut5, 1850, 1900)).not.toBeNull();
    expect(rebase(REAL.gistemp, 1700, 1750)).toBeNull();
    expect(rebase(null, 1961, 1990)).toBeNull();
  });

  it("can be told to accept partial coverage explicitly", () => {
    const r = rebase(REAL.gistemp, 1850, 1900, { requireFullCoverage: false });
    expect(r).not.toBeNull();
  });
});

describe("the trend, and its error bar", () => {
  it("recovers a known slope exactly", () => {
    const t = trend(synthetic(0.02), 1900, 2000)!;
    expect(t.perDecade).toBeCloseTo(0.2, 12);
    expect(t.rSquared).toBeCloseTo(1, 12);
    expect(t.stdErrPerDecade).toBeCloseTo(0, 9); // a perfect line has no error
  });

  it("matches the published recent warming rate on both analyses", () => {
    // Roughly 0.2 C per decade since the mid 1970s is the standard figure.
    const g = trend(REAL.gistemp, 1975, 2025)!;
    const h = trend(REAL.hadcrut5, 1975, 2025)!;
    expect(g.perDecade).toBeGreaterThan(0.15);
    expect(g.perDecade).toBeLessThan(0.25);
    expect(h.perDecade).toBeGreaterThan(0.15);
    expect(h.perDecade).toBeLessThan(0.25);
    // And the two independent analyses agree to a hundredth per decade.
    expect(Math.abs(g.perDecade - h.perDecade)).toBeLessThan(0.01);
  });

  it("shows the acceleration: recent decades are steeper than the full record", () => {
    const full = trend(REAL.gistemp, 1880, 2025)!;
    const recent = trend(REAL.gistemp, 1975, 2025)!;
    expect(full.perDecade).toBeGreaterThan(0);
    expect(recent.perDecade).toBeGreaterThan(full.perDecade * 2);
  });

  it("gives a wide error bar on a short window, which is why quoting one is a trap", () => {
    const short = trend(REAL.gistemp, 2011, 2025)!;
    const long = trend(REAL.gistemp, 1975, 2025)!;
    expect(short.stdErrPerDecade).toBeGreaterThan(long.stdErrPerDecade * 2);
  });

  it("REFUSES a window with fewer than ten years", () => {
    expect(trend(REAL.gistemp, 2020, 2025)).toBeNull();
    expect(trend(REAL.gistemp, 2024, 2024)).toBeNull();
    expect(trend(REAL.gistemp, 2025, 2020)).toBeNull();
    expect(trend(null, 1900, 2000)).toBeNull();
  });
});

describe("comparing the two analyses, which is the headline exhibit", () => {
  it("shows that most of the apparent 2024 disagreement is the baseline", () => {
    const c = compareSeries(REAL.gistemp, REAL.hadcrut5, 2024, [1961, 1990])!;
    // As published: about 0.23 C apart.
    expect(c.publishedGap).toBeGreaterThan(0.15);
    // On a common baseline: within a few hundredths.
    expect(c.rebasedGap).toBeLessThan(0.06);
    // So the great majority of the gap was never about the planet.
    expect(c.fractionExplainedByBaseline).toBeGreaterThan(0.7);
  });

  it("holds for other recent years, not just the one in the copy", () => {
    for (const y of [2016, 2020, 2023]) {
      const c = compareSeries(REAL.gistemp, REAL.hadcrut5, y, [1961, 1990]);
      if (!c) continue;
      expect(c.rebasedGap, String(y)).toBeLessThan(c.publishedGap);
    }
  });

  it("returns null for a year one of the analyses does not have", () => {
    expect(compareSeries(REAL.gistemp, REAL.hadcrut5, 1860)).toBeNull(); // GISTEMP starts 1880
    expect(compareSeries(REAL.gistemp, REAL.hadcrut5, 3000)).toBeNull();
    expect(compareSeries(null, REAL.hadcrut5, 2024)).toBeNull();
  });
});

describe("the IPCC comparison", () => {
  it("reproduces the AR6 headline of about 1.09 C for 2011-2020", () => {
    // AR6 WG1: global surface temperature was 1.09 C higher in 2011-2020 than
    // 1850-1900. Computed here from HadCRUT5, which is one of the datasets that
    // assessment drew on.
    const pre = meanOver(REAL.hadcrut5, 1850, 1900)!;
    const recent = meanOver(REAL.hadcrut5, 2011, 2020)!;
    const warming = recent - pre;
    expect(warming).toBeGreaterThan(1.0);
    expect(warming).toBeLessThan(1.2);
  });

  it("puts recent single years above 1.5 against pre-industrial", () => {
    const ipcc = rebase(REAL.hadcrut5, 1850, 1900)!;
    const y2024 = ipcc.anomaly[ipcc.years.indexOf(2024)];
    expect(y2024).toBeGreaterThan(1.4);
    // and the tab must not therefore claim the 1.5 target is "breached", which
    // is defined on a multi-decade mean, not one year. That is copy, not code,
    // but the number itself is checked here.
  });
});

describe("means, warmest years and stripes", () => {
  it("averages over an inclusive window", () => {
    const s = synthetic(0, 0.5); // flat at 0.5
    expect(meanOver(s, 1950, 1960)!).toBeCloseTo(0.5, 12);
    expect(meanOver(s, 1800, 1810)).toBeNull();
    expect(meanOver(null, 1950, 1960)).toBeNull();
    expect(meanOver(s, 1960, 1950)).toBeNull();
  });

  it("puts the most recent decade at the top of the warmest list", () => {
    const top = warmestYears(REAL.gistemp, 10);
    expect(top).toHaveLength(10);
    // Every one of the ten warmest years is this century, and recent.
    for (const t of top) expect(t.year).toBeGreaterThan(2009);
    // sorted descending
    for (let i = 1; i < top.length; i++) {
      expect(top[i].anomaly).toBeLessThanOrEqual(top[i - 1].anomaly);
    }
    expect(warmestYears(null)).toEqual([]);
    expect(warmestYears(REAL.gistemp, 0)).toEqual([]);
  });

  it("colours cold blue and warm red, symmetrically", () => {
    const cold = stripeColor(-1, 1.5);
    const warm = stripeColor(1, 1.5);
    const neutral = stripeColor(0, 1.5);
    expect(cold).toMatch(/^rgb\(/);
    expect(warm).toMatch(/^rgb\(/);
    // a warm stripe has more red than blue, and a cold one the reverse
    const rgb = (s: string) => s.match(/\d+/g)!.map(Number);
    expect(rgb(warm)[0]).toBeGreaterThan(rgb(warm)[2]);
    expect(rgb(cold)[2]).toBeGreaterThan(rgb(cold)[0]);
    expect(rgb(neutral)[0]).toBeGreaterThan(200);
  });

  it("degrades to grey rather than NaN colours", () => {
    expect(stripeColor(NaN, 1.5)).toContain("120");
    expect(stripeColor(1, 0)).toContain("120");
  });
});

describe("parsing", () => {
  it("never throws on garbage", () => {
    for (const bad of [null, undefined, 42, "x", {}, { gistemp: 5 }, { gistemp: { years: "no" } }]) {
      expect(() => parseClimate(bad)).not.toThrow();
    }
    expect(parseClimate(null).gistemp).toBeNull();
  });

  it("rejects a series whose arrays do not line up", () => {
    const d = parseClimate({
      gistemp: { baseline: [1951, 1980], years: [1990, 1991], anomaly: [0.1] },
    });
    expect(d.gistemp).toBeNull();
  });

  it("drops rows with an unusable anomaly WITHOUT shifting later years", () => {
    // The dangerous failure: dropping a value but keeping its year would slide
    // every later anomaly onto the wrong year.
    const d = parseClimate({
      gistemp: {
        baseline: [1951, 1980],
        years: [1990, 1991, 1992],
        anomaly: [0.1, null, 0.3],
      },
    });
    expect(d.gistemp!.years).toEqual([1990, 1992]);
    expect(d.gistemp!.anomaly).toEqual([0.1, 0.3]);
  });
});

describe("the baseline catalogue", () => {
  it("names who uses each one", () => {
    expect(BASELINES.length).toBeGreaterThanOrEqual(4);
    for (const b of BASELINES) {
      expect(b.range[1]).toBeGreaterThan(b.range[0]);
      expect(b.who.length).toBeGreaterThan(30);
      expect(b.who).not.toContain("—"); // project style: no em-dashes
    }
    expect(BASELINES.map((b) => b.id)).toContain("1850-1900");
    expect(BASELINES.map((b) => b.id)).toContain("1961-1990");
  });
});
