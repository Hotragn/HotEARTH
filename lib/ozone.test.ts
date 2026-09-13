import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AREA_IS_A_NOISY_DETECTOR_NOTE,
  airmassByMonth,
  CAUSE_AND_EFFECT_NOTE,
  DU_MILLIMETRES,
  DU_MOLECULES_PER_CM2,
  MIN_OBSERVATIONS_PER_MONTH,
  NO_ARCTIC_HOLE_NOTE,
  PUBLISHED_LIFETIME_YEARS,
  SUDDEN_WARMING_YEARS,
  TYPICAL_COLUMN_DU,
  causeVersusEffect,
  checkIndex,
  correlate,
  crossCheck,
  dobsonToMillimetres,
  dobsonToMolecules,
  eraChange,
  gasResponses,
  latitudeLadder,
  meanChange,
  monthSeries,
  moonlightMonths,
  odgiFrom,
  parseOzone,
  percentRecovered,
  trend,
  worstMonth,
  yearsToBenchmark,
} from "./ozone";

/**
 * Validated against published values and against the physics, never against a
 * previous run.
 *
 * Anchors:
 *   - THE INDEX IS ITS OWN DEFINITION. NOAA defines the ODGI as 100 at the
 *     halogen peak and 0 at the 1980 abundance, which makes it affine in the
 *     EESC column published beside it. The 1980 value is not in the file; the
 *     fetch script solves for it and this suite requires the round trip to
 *     reproduce NOAA's own index column. Two published columns, computed
 *     independently, landing on each other.
 *   - LIFETIMES from the WMO Scientific Assessment of Ozone Depletion 2022,
 *     Table A-1: methyl chloroform 5.0 years, CFC-11 52, CFC-12 102.
 *   - THE DOBSON UNIT is defined by NASA as 0.01 mm of pure ozone at 0 C and
 *     1 atm, equivalently 2.69e16 molecules per square centimetre, with a
 *     typical whole-Earth column near 300 DU.
 *   - THE 220 DU THRESHOLD is NASA's stated boundary for the hole.
 *   - THE 1995 GAP is real: no total ozone mapping instrument flew between the
 *     end of Meteor-3 in 1994 and the launch of ADEOS in August 1996.
 *   - THE CFC-11 SLOWDOWN of 2013 to 2018 and its reversal after enforcement
 *     are the subject of Montzka et al. 2018 and Park et al. 2021.
 *
 * The real mirror is read from public/data, so a bad fetch fails the suite
 * rather than shipping.
 */

const DATA = parseOzone(
  JSON.parse(readFileSync(join(process.cwd(), "public/data/ozone/ozone.json"), "utf8"))
)!;

const ANTARCTIC = DATA.odgi.antarctic;
const MIDLAT = DATA.odgi.midLatitude;
const SPO = DATA.stations.find((s) => s.code === "SPO")!;
const BRW = DATA.stations.find((s) => s.code === "BRW")!;

/** Before the hole, and the most recent full decade and a half. */
const BEFORE: [number, number] = [1963, 1979];
const AFTER: [number, number] = [2010, 2030];

describe("the payload", () => {
  it("parses", () => {
    expect(DATA).not.toBeNull();
    expect(DATA.stations.length).toBe(5);
    expect(DATA.hole.years[0]).toBe(1979);
  });

  it("has no 1995, and no other gap", () => {
    expect(DATA.hole.gapYears).toEqual([1995]);
    expect(DATA.hole.years).not.toContain(1995);
    expect(DATA.hole.years).toContain(1994);
    expect(DATA.hole.years).toContain(1996);
  });

  it("draws the edge of the hole at NASA's 220 DU", () => {
    expect(DATA.hole.thresholdDu).toBe(220);
  });

  it("names the windows the two headline numbers are averaged over", () => {
    expect(DATA.hole.areaWindow).toMatch(/September/);
    expect(DATA.hole.minimumWindow).toMatch(/September/);
    expect(DATA.hole.areaWindow).not.toBe(DATA.hole.minimumWindow);
    // NASA writes these as "07 September -- 13 October", which is a fixed-width
    // field and a typewriter dash. Neither belongs in a sentence on a page, so
    // the fetch script normalises them and this keeps them normalised.
    for (const w of [DATA.hole.areaWindow, DATA.hole.minimumWindow]) {
      expect(w).not.toMatch(/--/);
      expect(w).not.toMatch(/0\d/);
      expect(w).toMatch(/^\d{1,2} \w+ to \d{1,2} \w+$/);
    }
  });
});

describe("the Dobson unit is a thickness", () => {
  it("puts the whole ozone layer at about three millimetres", () => {
    expect(dobsonToMillimetres(TYPICAL_COLUMN_DU)).toBeCloseTo(3, 6);
    expect(DU_MILLIMETRES).toBe(0.01);
  });

  it("puts the worst of the hole at about one millimetre", () => {
    const worst = Math.min(...DATA.hole.minimumDu);
    expect(worst).toBeLessThan(120);
    expect(dobsonToMillimetres(worst)!).toBeLessThan(1.2);
    expect(dobsonToMillimetres(worst)!).toBeGreaterThan(0.8);
  });

  it("carries NASA's molecule count", () => {
    expect(DU_MOLECULES_PER_CM2).toBeCloseTo(2.69e16, -14);
    expect(dobsonToMolecules(1)).toBeCloseTo(2.69e16, -14);
  });

  it("returns null rather than throwing on nonsense", () => {
    expect(dobsonToMillimetres(NaN)).toBeNull();
    expect(dobsonToMillimetres(-5)).toBeNull();
    expect(dobsonToMolecules(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("the index is its own definition", () => {
  it("rebuilds NOAA's published Antarctic index from EESC and a solved 1980 benchmark", () => {
    const check = checkIndex(ANTARCTIC)!;
    expect(check.n).toBe(ANTARCTIC.years.length);
    // Two published columns, computed independently by NOAA, reconciled by
    // arithmetic alone. This is the load-bearing test of the tab.
    expect(check.worst).toBeLessThan(0.1);
    expect(check.mean).toBeLessThan(0.05);
  });

  it("does the same for mid-latitudes, with a different peak and a different benchmark", () => {
    const check = checkIndex(MIDLAT)!;
    expect(check.worst).toBeLessThan(0.15);
    expect(MIDLAT.peakYear).not.toBe(ANTARCTIC.peakYear);
    expect(MIDLAT.benchmark1980Ppt).toBeLessThan(ANTARCTIC.benchmark1980Ppt);
  });

  it("puts the Antarctic halogen peak around the turn of the century", () => {
    // The Montreal Protocol was signed in 1987 and the Antarctic stratosphere
    // peaked about fourteen years later, because the gases take that long to get
    // up there and around.
    expect(ANTARCTIC.peakYear).toBeGreaterThanOrEqual(1998);
    expect(ANTARCTIC.peakYear).toBeLessThanOrEqual(2004);
    // Mid-latitude air is younger, so it turns the corner first.
    expect(MIDLAT.peakYear).toBeLessThan(ANTARCTIC.peakYear);
  });

  it("finds the Antarctic well behind mid-latitudes on the way back", () => {
    const anta = percentRecovered(ANTARCTIC)!;
    const mid = percentRecovered(MIDLAT)!;
    expect(anta).toBeGreaterThan(20);
    expect(anta).toBeLessThan(45);
    expect(mid).toBeGreaterThan(anta + 15);
  });

  it("labels the straight-line crossing as later than the published assessments", () => {
    // WMO's 2022 assessment, which runs the individual lifetimes forward, puts
    // the Antarctic back at 1980 values around 2066. A straight line through the
    // last decade of the index lands later, because the decay bends. The tab
    // shows the line and says it is arithmetic; this test pins the direction of
    // the disagreement rather than either number.
    const line = yearsToBenchmark(ANTARCTIC)!;
    expect(line).toBeGreaterThan(2066);
    expect(line).toBeLessThan(2130);
  });

  it("recomputes and refuses nonsense", () => {
    expect(odgiFrom(4151, 4151, 2151)).toBeCloseTo(100, 9);
    expect(odgiFrom(2151, 4151, 2151)).toBeCloseTo(0, 9);
    expect(odgiFrom(3151, 4151, 2151)).toBeCloseTo(50, 9);
    expect(odgiFrom(1, 500, 500)).toBeNull();
    expect(odgiFrom(NaN, 4151, 2151)).toBeNull();
  });
});

describe("the gases leave on their own timescales", () => {
  const responses = gasResponses(ANTARCTIC);
  const byName = new Map(responses.map((r) => [r.name, r]));

  it("has methyl chloroform essentially gone", () => {
    const r = byName.get("CH3CCl3")!;
    expect(r.percentFromPeak).toBeLessThan(-98);
    expect(r.latestPpt).toBeLessThan(10);
  });

  it("keeps the reasons a decay cannot be fitted apart", () => {
    // Collapsing these into one label was a real bug on this tab: the table said
    // "too recent" over methyl chloride, which peaked in 1999.
    expect(byName.get("HCFCs")!.efoldUnavailable).toBe("peaked too recently to fit");
    expect(byName.get("CH3Cl")!.efoldUnavailable).toMatch(/natural floor/);
    expect(byName.get("CH3Br")!.efoldUnavailable).toMatch(/natural floor/);
    // And a gas that does have a fit carries no reason at all.
    expect(byName.get("CFC-12")!.efoldUnavailable).toBeNull();
    expect(byName.get("CFC-12")!.measuredEfoldYears).not.toBeNull();
  });

  it("also refuses a decay for a gas that simply has not fallen", () => {
    // No gas in the real table reaches this branch, because the only two that
    // have not fallen are both flagged natural and caught earlier. It is
    // exercised here rather than left to look covered, on a synthetic series
    // that peaks early and then goes back up.
    const flat = gasResponses({
      ...ANTARCTIC,
      gasNames: ["MADE-UP"],
      gases: { "MADE-UP": ANTARCTIC.years.map((_, i) => (i === 1 ? 120 : 100 + i)) },
    })[0];
    expect(flat.peakYear).toBe(ANTARCTIC.years[ANTARCTIC.years.length - 1]);
    expect(flat.efoldUnavailable).toBe("peaked too recently to fit");

    const rising = gasResponses({
      ...ANTARCTIC,
      gasNames: ["MADE-UP"],
      gases: { "MADE-UP": ANTARCTIC.years.map((_, i) => (i === 0 ? 200 : 100 + i)) },
    })[0];
    expect(rising.peakYear).toBe(ANTARCTIC.years[0]);
    expect(rising.efoldUnavailable).toBe("no sustained decline");
    expect(rising.measuredEfoldYears).toBeNull();
  });

  it("refuses to print a decay time for a gas falling toward a natural floor", () => {
    // Methyl bromide HAS fallen 30 percent, and an exponential fitted to that
    // fall returns about 77 years next to a published lifetime of 0.8. Neither
    // number is wrong; putting them in adjacent columns would be.
    for (const name of ["CH3Br", "CH3Cl"]) {
      const r = byName.get(name)!;
      expect(r.largelyNatural).toBe(true);
      expect(r.measuredEfoldYears).toBeNull();
    }
  });

  it("matches the published lifetime only for the gas whose emissions stopped", () => {
    // Methyl chloroform had no natural source and no bank worth the name, so
    // once production stopped the burden decayed at its chemical lifetime. WMO
    // 2022 gives 5.0 years; the decline in this file gives about six.
    const mc = byName.get("CH3CCl3")!;
    expect(PUBLISHED_LIFETIME_YEARS["CH3CCl3"]).toBe(5.0);
    expect(mc.measuredEfoldYears).not.toBeNull();
    expect(mc.measuredEfoldYears! / 5.0).toBeGreaterThan(0.8);
    expect(mc.measuredEfoldYears! / 5.0).toBeLessThan(1.4);
  });

  it("has the CFCs leaving far slower than their chemistry alone would take them", () => {
    // Old foam, old refrigerators and old air conditioners are still venting,
    // so the observed decline is much slower than the lifetime. The gap is the
    // bank. This is the opposite result from the test above, on purpose.
    for (const name of ["CFC-11", "CFC-12"]) {
      const r = byName.get(name)!;
      const life = PUBLISHED_LIFETIME_YEARS[name]!;
      expect(r.measuredEfoldYears).not.toBeNull();
      expect(r.measuredEfoldYears! / life).toBeGreaterThan(1.5);
    }
  });

  it("refuses a lifetime for the aggregates", () => {
    expect(PUBLISHED_LIFETIME_YEARS["halons"]).toBeNull();
    expect(PUBLISHED_LIFETIME_YEARS["HCFCs"]).toBeNull();
    expect(byName.get("halons")!.lifetimeYears).toBeNull();
  });

  it("shows the halons still rising long after the CFCs turned", () => {
    // Halons went into fire suppression systems that were not scrapped when
    // production stopped, so the bank kept leaking and the abundance kept
    // climbing for years after every CFC had peaked.
    const halons = byName.get("halons")!;
    expect(halons.peakYear).toBeGreaterThan(byName.get("CFC-11")!.peakYear + 5);
    expect(halons.peakPpt).toBeGreaterThan(halons.firstPpt);
  });

  it("shows the replacement peaking last of all", () => {
    const hcfc = byName.get("HCFCs")!;
    expect(hcfc.peakYear).toBeGreaterThan(2015);
    expect(hcfc.latestPpt).toBeGreaterThan(hcfc.firstPpt * 3);
    // Too recent to fit a decay to, and the module says which of the three
    // reasons applies rather than guessing.
    expect(hcfc.measuredEfoldYears).toBeNull();
    expect(hcfc.efoldUnavailable).toBe("peaked too recently to fit");
  });

  it("flags the two gases the treaty cannot reach", () => {
    expect(byName.get("CH3Cl")!.largelyNatural).toBe(true);
    expect(byName.get("CH3Br")!.largelyNatural).toBe(true);
    expect(byName.get("CFC-12")!.largelyNatural).toBe(false);
    // Methyl chloride is almost all natural, so it barely moves at all.
    expect(Math.abs(byName.get("CH3Cl")!.percentFromPeak)).toBeLessThan(10);
  });

  it("sorts the worst-hit gas first", () => {
    expect(responses[0].name).toBe("CH3CCl3");
    for (let i = 1; i < responses.length; i++) {
      expect(responses[i].percentFromPeak).toBeGreaterThanOrEqual(responses[i - 1].percentFromPeak);
    }
  });
});

describe("CFC-11, and a treaty violation visible in the background air", () => {
  const before = meanChange(ANTARCTIC, "CFC-11", 2002, 2012)!;
  const during = meanChange(ANTARCTIC, "CFC-11", 2013, 2018)!;
  const after = meanChange(ANTARCTIC, "CFC-11", 2019, 2100)!;

  it("was falling steadily before 2013", () => {
    expect(before.n).toBe(11);
    expect(before.pptPerYear).toBeLessThan(-5);
  });

  it("slowed by roughly a third from 2013 to 2018", () => {
    // Montzka et al. 2018 reported the slowdown and inferred new emissions;
    // Park et al. 2021 located much of it in eastern China. It is visible here
    // as a ratio between two averages of NOAA's own published column.
    expect(during.pptPerYear).toBeGreaterThan(before.pptPerYear);
    const ratio = during.pptPerYear / before.pptPerYear;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(0.8);
  });

  it("went back to its old rate once enforcement followed", () => {
    expect(after.pptPerYear).toBeLessThan(during.pptPerYear);
    expect(Math.abs(after.pptPerYear / before.pptPerYear - 1)).toBeLessThan(0.2);
  });

  it("returns null for a gas or a window that is not there", () => {
    expect(meanChange(ANTARCTIC, "SF6", 2000, 2020)).toBeNull();
    expect(meanChange(ANTARCTIC, "CFC-11", 2500, 2600)).toBeNull();
  });
});

describe("the hole itself, and how little the headline numbers say", () => {
  const fromOnset = trend(DATA.hole.years, DATA.hole.areaMillionKm2)!;
  const modern = trend(DATA.hole.years, DATA.hole.areaMillionKm2, 2000)!;
  const modernMin = trend(DATA.hole.years, DATA.hole.minimumDu, 2000)!;

  it("says the hole is growing, strongly, if you start at the beginning", () => {
    // The window contains the onset, so of course it does.
    expect(fromOnset.slope).toBeGreaterThan(0);
    expect(fromOnset.sigma).toBeGreaterThan(3);
  });

  it("says nothing at all if you start in 2000", () => {
    // Both headline numbers point the hopeful way and neither clears two
    // standard errors. This is the finding, and it is not the same claim as
    // "the ozone layer is not recovering": it is a claim about these two
    // numbers over this window.
    expect(modern.slope).toBeLessThan(0);
    expect(modern.sigma).toBeLessThan(2);
    expect(modernMin.slope).toBeGreaterThan(0);
    expect(modernMin.sigma).toBeLessThan(2);
  });

  it("is drowned by the year-to-year scatter", () => {
    // The line moves the area less than the points bounce around it.
    expect(Math.abs(modern.span)).toBeLessThan(modern.residualSd);
  });

  it("has its two smallest modern holes in the years the vortex fell apart", () => {
    const modernYears = DATA.hole.years
      .map((y, i) => ({ y, a: DATA.hole.areaMillionKm2[i] }))
      .filter((r) => r.y >= 1990)
      .sort((p, q) => p.a - q.a);
    expect([modernYears[0].y, modernYears[1].y].sort()).toEqual([...SUDDEN_WARMING_YEARS].sort());
    // And the chemicals in those years were ordinary. 2019 sits between 2018
    // and 2020, both of which had holes more than twice the size.
    const at = (y: number) => DATA.hole.areaMillionKm2[DATA.hole.years.indexOf(y)];
    expect(at(2019)).toBeLessThan(at(2018) / 2);
    expect(at(2019)).toBeLessThan(at(2020) / 2);
    const eescAt = (y: number) => ANTARCTIC.eescPpt[ANTARCTIC.years.indexOf(y)];
    expect(Math.abs(eescAt(2019) - eescAt(2018)) / eescAt(2018)).toBeLessThan(0.02);
  });

  it("barely correlates with the chemicals that cause it", () => {
    const c = causeVersusEffect(DATA)!;
    expect(c.n).toBeGreaterThan(25);
    expect(Math.abs(c.area)).toBeLessThan(0.35);
    expect(Math.abs(c.minimum)).toBeLessThan(0.35);
    // And dropping the two vortex collapses does not rescue it either.
    const trimmed = causeVersusEffect(DATA, SUDDEN_WARMING_YEARS)!;
    expect(Math.abs(trimmed.area)).toBeLessThan(0.45);
  });

  it("refuses to fit a line it cannot fit", () => {
    expect(trend([1, 2], [3, 4])).toBeNull();
    expect(trend([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
    expect(trend([1, 2, 3], [1, 2])).toBeNull();
    expect(trend(DATA.hole.years, DATA.hole.areaMillionKm2, 2024)).toBeNull();
  });
});

describe("five stations, and the reason there is no Arctic hole", () => {
  const ladder = latitudeLadder(DATA, BEFORE, AFTER);
  const spo = eraChange(SPO, BEFORE, AFTER);
  const brw = eraChange(BRW, BEFORE, AFTER);

  it("runs from the South Pole to the Arctic", () => {
    expect(ladder.map((r) => r.station.code)).toEqual(["SPO", "LAU", "MLO", "BLD", "BRW"]);
    expect(ladder[0].station.lat).toBeLessThan(-89);
    expect(ladder[4].station.lat).toBeGreaterThan(70);
  });

  it("loses about half the South Pole's October column", () => {
    const october = spo.find((c) => c.month === 10)!;
    expect(october.percent).toBeLessThan(-40);
    expect(october.beforeDu).toBeGreaterThan(250);
    expect(october.afterDu).toBeLessThan(180);
  });

  it("loses almost nothing at the same time of year in the Arctic", () => {
    // Utqiagvik is 71 North. It is dark for months, it sits under the same
    // global chlorine, and its worst month is down a few percent. Latitude and
    // darkness are not the variable; the vortex is.
    const worstSouth = worstMonth(spo)!;
    const worstNorth = worstMonth(brw)!;
    expect(Math.abs(worstSouth.percent)).toBeGreaterThan(10 * Math.abs(worstNorth.percent));
    expect(Math.abs(worstNorth.percent)).toBeLessThan(6);
  });

  it("finds the loss concentrated in spring rather than spread over the year", () => {
    // The hole is a SEASON, not a place. Chlorine sits inert through the polar
    // winter, is converted on the surfaces of clouds that only form in extreme
    // cold, and is then set loose by the returning sun over a few weeks of
    // October. December is still down a fifth because the vortex is breaking up
    // and the depleted air is only then mixing away.
    const spring = spo.filter((c) => c.month >= 10);
    const rest = spo.filter((c) => c.month <= 8);
    expect(spring).toHaveLength(3);
    expect(rest.length).toBeGreaterThan(4);

    // Every spring month is worse than every other month in the year, with no
    // overlap at all between the two groups.
    const worstRest = Math.max(...rest.map((c) => Math.abs(c.percent)));
    const mildestSpring = Math.min(...spring.map((c) => Math.abs(c.percent)));
    expect(mildestSpring).toBeGreaterThan(worstRest);

    // And October, the deep month, is nearly four times the worst of the rest.
    const october = spring.find((c) => c.month === 10)!;
    expect(Math.abs(october.percent) / worstRest).toBeGreaterThan(3.5);
    // Outside spring nothing exceeds a modest thinning.
    expect(worstRest).toBeLessThan(15);
  });

  it("puts the thickest ozone on Earth over the Arctic in spring", () => {
    // The circulation piles ozone up at high northern latitudes. The place with
    // the most ozone and the place with the least are both polar.
    const marchNorth = monthSeries(BRW, 3)!;
    const octoberSouth = monthSeries(SPO, 10)!;
    const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
    expect(mean(marchNorth.du)).toBeGreaterThan(400);
    expect(mean(octoberSouth.du)).toBeLessThan(mean(marchNorth.du) / 2);
  });

  it("gives Lauder no before, and says so instead of inventing one", () => {
    // Lauder started observing in 1987, after the hole existed.
    const lauder = ladder.find((r) => r.station.code === "LAU")!;
    expect(lauder.station.months[0].slice(0, 4)).toBe("1987");
    expect(lauder.changes).toHaveLength(0);
    expect(lauder.worst).toBeNull();
  });

  it("explains its own gaps with the airmass rather than leaving them blank", () => {
    // The South Pole is nearly absent in March and September, and the reason is
    // in the file: at the equinox the sun is on the horizon and the light path
    // runs past seven atmospheres. October, with the sun properly up, is a
    // routine measurement. Nothing was broken and nobody went home.
    const mu = new Map(airmassByMonth(SPO).map((m) => [m.month, m.mu]));
    expect(mu.get(3)!).toBeGreaterThan(7);
    expect(mu.get(3)!).toBeGreaterThan(mu.get(10)!);
    expect(mu.get(10)!).toBeLessThan(6);
    // And the months that are nearly missing are exactly the extreme ones.
    const march = monthSeries(SPO, 3, 1);
    const october = monthSeries(SPO, 10, 1)!;
    expect((march?.years.length ?? 0) * 2).toBeLessThan(october.years.length);
  });

  it("measures the South Pole by moonlight through the polar night", () => {
    const moon = moonlightMonths(SPO);
    const total = moon.reduce((a, m) => a + m.count, 0);
    const inNight = moon
      .filter((m) => m.month >= 4 && m.month <= 9)
      .reduce((a, m) => a + m.count, 0);
    expect(total).toBeGreaterThan(1000);
    expect(inNight / total).toBeGreaterThan(0.95);
    expect(SPO.kinds["Direct_Sun"]).toBeGreaterThan(SPO.kinds["Direct_Moon"]);
    // Mauna Loa never needs the moon.
    expect(moonlightMonths(DATA.stations.find((s) => s.code === "MLO")!)).toHaveLength(0);
  });

  it("drops months with too few readings to mean anything", () => {
    const loose = monthSeries(SPO, 10, 1)!;
    const strict = monthSeries(SPO, 10, 25)!;
    expect(strict.years.length).toBeLessThan(loose.years.length);
    expect(MIN_OBSERVATIONS_PER_MONTH).toBe(5);
    expect(monthSeries(SPO, 13)).toBeNull();
    expect(monthSeries(SPO, 0)).toBeNull();
    expect(monthSeries(SPO, 10, 10_000)).toBeNull();
  });
});

describe("a ground instrument against a satellite", () => {
  it("tracks the satellite minimum without ever having been fitted to it", () => {
    // A monthly mean over one hut, against the lowest column anywhere on the
    // cap. Different quantities, different instruments, no shared calibration.
    const check = crossCheck(DATA)!;
    expect(check.n).toBeGreaterThan(35);
    expect(check.r).toBeGreaterThan(0.75);
    expect(check.firstYear).toBeLessThanOrEqual(1980);
  });

  it("has the station going the other way from the hole area", () => {
    const october = monthSeries(SPO, 10)!;
    const c = correlate(october.years, october.du, DATA.hole.years, DATA.hole.areaMillionKm2)!;
    expect(c.r).toBeLessThan(-0.75);
  });

  it("returns null for a station or month that is not there", () => {
    expect(crossCheck(DATA, "XXX")).toBeNull();
    expect(crossCheck(DATA, "SPO", 13)).toBeNull();
    expect(correlate([1, 2], [1, 2], [1, 2], [1, 2])).toBeNull();
    expect(correlate([1, 2, 3, 4], [5, 5, 5, 5], [1, 2, 3, 4], [1, 2, 3, 4])).toBeNull();
  });
});

describe("bad input gives null, never a throw", () => {
  it("refuses anything that is not the payload", () => {
    for (const junk of [null, undefined, 0, "", [], {}, { hole: {} }, { hole: null }]) {
      expect(parseOzone(junk)).toBeNull();
    }
  });

  it("refuses a payload with mismatched series lengths", () => {
    expect(
      parseOzone({
        hole: { years: [1979, 1980], areaMillionKm2: [0.1], minimumDu: [225, 203] },
        odgi: DATA.odgi,
        stations: DATA.stations,
      })
    ).toBeNull();
  });

  it("refuses a payload with no stations left after filtering", () => {
    expect(
      parseOzone({
        hole: DATA.hole,
        odgi: DATA.odgi,
        stations: [{ code: "BAD", lat: 0, lon: 0, months: ["nope"], du: [1], obs: [1] }],
      })
    ).toBeNull();
  });

  it("survives a station with no observation kinds recorded", () => {
    const bare = parseOzone({
      hole: DATA.hole,
      odgi: DATA.odgi,
      stations: [{ ...SPO, kinds: undefined, moonMonths: undefined }],
    })!;
    expect(bare.stations[0].kinds).toEqual({});
    expect(moonlightMonths(bare.stations[0])).toHaveLength(0);
  });

  it("returns empty rather than guessing when an era has no overlap", () => {
    expect(eraChange(SPO, [1900, 1910], [1920, 1930])).toHaveLength(0);
    expect(worstMonth([])).toBeNull();
    expect(latitudeLadder(DATA, [1900, 1910], [1920, 1930]).every((r) => r.worst === null)).toBe(
      true
    );
  });
});

describe("what the tab says about itself", () => {
  const notes = [
    AREA_IS_A_NOISY_DETECTOR_NOTE,
    CAUSE_AND_EFFECT_NOTE,
    NO_ARCTIC_HOLE_NOTE,
  ];

  it("uses no em dashes anywhere in its copy", () => {
    for (const note of notes) expect(note).not.toMatch(/[\u2013\u2014]/);
  });

  it("never claims the hole is recovering on the strength of the headline numbers", () => {
    // The one thing this tab must not do. If somebody later writes celebratory
    // copy over a 1-sigma trend, this fails.
    for (const note of notes) {
      expect(note.toLowerCase()).not.toMatch(/the hole is (now )?(shrinking|healing|closing)/);
    }
    expect(CAUSE_AND_EFFECT_NOTE).toMatch(/not an argument against/i);
  });

  it("says out loud that the threshold is a convention", () => {
    expect(AREA_IS_A_NOISY_DETECTOR_NOTE).toMatch(/standard error/i);
    expect(NO_ARCTIC_HOLE_NOTE).toMatch(/vortex/i);
  });
});
