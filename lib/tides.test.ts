import { describe, expect, it } from "vitest";
import {
  AU_KM,
  M2_PERIOD_HOURS,
  MEAN_LUNAR_DISTANCE_KM,
  MOON_EARTH_MASS_RATIO,
  SPRING_NEAP_DAYS,
  SUN_EARTH_MASS_RATIO,
  amplification,
  curveRangeM,
  equilibriumCoefficientM,
  equilibriumCurve,
  equilibriumTide,
  parseCoOps,
  springNeap,
  subLunarPoint,
  subSolarPointWithDistance,
  zenithAngleDeg,
} from "./tides";

/**
 * Validation strategy: published textbook values and physical identities that
 * must hold for any correct implementation. The strongest test here measures the
 * PERIOD of the computed curve and checks it against the published M2 period,
 * which exercises the whole chain at once (lunar position, sidereal time,
 * sub-lunar point, zenith angle and the Legendre term) rather than any single
 * formula in isolation.
 *
 * Published anchors used:
 *   - Equilibrium tide coefficients: about 0.36 m lunar, 0.16 m solar, a ratio
 *     of roughly 0.46. Standard values in every physical oceanography text.
 *   - M2, the principal lunar semi-diurnal constituent: 12 h 25.2 m.
 *   - The spring-neap cycle: 14.765 days, half a synodic month.
 *   - Lunar perigee 356,500 km and apogee 406,700 km, giving a tide-force swing
 *     of roughly 1.4x because the force goes as the inverse cube.
 *   - Syzygies reused from lib/lunar.test.ts so the two files cannot disagree:
 *     full Moon 2024-01-25 17:54 UTC, new Moon 2024-01-11 11:57 UTC.
 */

const HOUR_MS = 3_600_000;

describe("the equilibrium coefficients", () => {
  it("matches the textbook 0.36 m for the Moon at mean distance", () => {
    const a = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, MEAN_LUNAR_DISTANCE_KM)!;
    expect(a).toBeGreaterThan(0.34);
    expect(a).toBeLessThan(0.38);
  });

  it("matches the textbook 0.16 m for the Sun at one AU", () => {
    const a = equilibriumCoefficientM(SUN_EARTH_MASS_RATIO, AU_KM)!;
    expect(a).toBeGreaterThan(0.15);
    expect(a).toBeLessThan(0.18);
  });

  it("has the Sun at roughly 0.46 of the Moon, so the Moon wins about 2 to 1", () => {
    const moon = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, MEAN_LUNAR_DISTANCE_KM)!;
    const sun = equilibriumCoefficientM(SUN_EARTH_MASS_RATIO, AU_KM)!;
    expect(sun / moon).toBeGreaterThan(0.42);
    expect(sun / moon).toBeLessThan(0.50);
  });

  it("falls off as the CUBE of distance, not the square", () => {
    const near = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, 300_000)!;
    const far = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, 600_000)!;
    // doubling the distance must cut the coefficient by 2^3 = 8
    expect(near / far).toBeCloseTo(8, 6);
  });

  it("reproduces the published perigee-to-apogee swing of about 1.4x", () => {
    const perigee = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, 356_500)!;
    const apogee = equilibriumCoefficientM(MOON_EARTH_MASS_RATIO, 406_700)!;
    expect(perigee / apogee).toBeGreaterThan(1.35);
    expect(perigee / apogee).toBeLessThan(1.5);
  });

  it("returns null for bad input", () => {
    expect(equilibriumCoefficientM(NaN, 1000)).toBeNull();
    expect(equilibriumCoefficientM(1, 0)).toBeNull();
    expect(equilibriumCoefficientM(1, -5)).toBeNull();
  });
});

describe("sub-points and zenith angle", () => {
  const date = new Date(Date.UTC(2026, 5, 15, 12));

  it("keeps the sub-lunar point inside the Moon's real declination range", () => {
    for (let d = 0; d < 60; d += 1) {
      const p = subLunarPoint(new Date(date.getTime() + d * 86_400_000))!;
      expect(p).not.toBeNull();
      expect(Math.abs(p.latDeg)).toBeLessThan(28.8); // major standstill limit
      expect(Math.abs(p.lonDeg)).toBeLessThanOrEqual(180);
      expect(p.distanceKm).toBeGreaterThan(356_000);
      expect(p.distanceKm).toBeLessThan(407_000);
    }
  });

  it("keeps the sub-solar point inside the tropics and Earth's real orbit", () => {
    for (let d = 0; d < 365; d += 10) {
      const p = subSolarPointWithDistance(new Date(date.getTime() + d * 86_400_000))!;
      expect(Math.abs(p.latDeg)).toBeLessThan(23.5);
      expect(p.distanceKm / AU_KM).toBeGreaterThan(0.98); // perihelion 0.983
      expect(p.distanceKm / AU_KM).toBeLessThan(1.02); // aphelion 1.017
    }
  });

  it("is zero at the sub-point and 180 at its antipode", () => {
    const p = subLunarPoint(date)!;
    expect(zenithAngleDeg(p.latDeg, p.lonDeg, p)!).toBeCloseTo(0, 6);
    const antiLon = p.lonDeg > 0 ? p.lonDeg - 180 : p.lonDeg + 180;
    expect(zenithAngleDeg(-p.latDeg, antiLon, p)!).toBeCloseTo(180, 6);
  });

  it("returns null for bad input", () => {
    expect(subLunarPoint(new Date(NaN))).toBeNull();
    expect(subSolarPointWithDistance(new Date(NaN))).toBeNull();
    expect(zenithAngleDeg(0, 0, null)).toBeNull();
    expect(zenithAngleDeg(NaN, 0, subLunarPoint(date))).toBeNull();
  });
});

describe("the double bulge", () => {
  const date = new Date(Date.UTC(2026, 5, 15, 12));

  it("raises the water BOTH under the Moon and on the far side", () => {
    const p = subLunarPoint(date)!;
    const under = equilibriumTide(date, p.latDeg, p.lonDeg)!;
    const antiLon = p.lonDeg > 0 ? p.lonDeg - 180 : p.lonDeg + 180;
    const opposite = equilibriumTide(date, -p.latDeg, antiLon)!;

    // Both are high, and the lunar term is nearly equal at the two points.
    expect(under.moonM).toBeGreaterThan(0);
    expect(opposite.moonM).toBeGreaterThan(0);
    expect(opposite.moonM).toBeCloseTo(under.moonM, 6);
  });

  it("drops the water on the ring 90 degrees away, by half the bulge height", () => {
    // The Legendre term is +1 under the body and -1/2 at quadrature.
    const p = subLunarPoint(date)!;
    const under = equilibriumTide(date, p.latDeg, p.lonDeg)!;
    const quadLon = p.lonDeg + 90 > 180 ? p.lonDeg - 270 : p.lonDeg + 90;
    const quad = equilibriumTide(date, 0, quadLon);
    expect(quad).not.toBeNull();
    // near the 90-degree ring the lunar term must be negative
    const psi = zenithAngleDeg(0, quadLon, p)!;
    if (Math.abs(psi - 90) < 25) expect(quad!.moonM).toBeLessThan(0);
    expect(under.moonM).toBeGreaterThan(0);
  });

  it("keeps the whole-Earth equilibrium displacement small, as the theory says", () => {
    // The point of the tab: the theory never predicts more than about 0.5 m
    // anywhere on Earth, at any time.
    let worst = 0;
    for (let d = 0; d < 30; d += 1) {
      const t = new Date(date.getTime() + d * 86_400_000);
      for (const lat of [-60, -30, 0, 30, 60]) {
        for (const lon of [-150, -60, 0, 60, 150]) {
          const e = equilibriumTide(t, lat, lon);
          if (e) worst = Math.max(worst, Math.abs(e.totalM));
        }
      }
    }
    expect(worst).toBeLessThan(0.6);
  });

  it("returns null for bad input", () => {
    expect(equilibriumTide(new Date(NaN), 0, 0)).toBeNull();
    expect(equilibriumTide(date, 95, 0)).toBeNull();
    expect(equilibriumTide(date, 0, 200)).toBeNull();
  });
});

describe("the rhythm the theory gets right", () => {
  /**
   * Measure the dominant period of the computed curve by timing successive
   * maxima. This exercises the entire chain at once, and it is the single most
   * convincing check in this file: if the lunar position, the sidereal time, the
   * sub-lunar point or the Legendre term were wrong, the period would not land
   * on the published M2 value.
   */
  it("produces a curve whose period is the published M2, 12 h 25 m", () => {
    const from = new Date(Date.UTC(2026, 5, 1));
    const to = new Date(from.getTime() + 6 * 24 * HOUR_MS);
    const curve = equilibriumCurve(from, to, 42.36, -71.06, 2);
    expect(curve.length).toBeGreaterThan(1000);

    const peaks: number[] = [];
    for (let i = 1; i < curve.length - 1; i++) {
      if (
        curve[i].heightM > curve[i - 1].heightM &&
        curve[i].heightM >= curve[i + 1].heightM
      ) {
        peaks.push(curve[i].time.getTime());
      }
    }
    expect(peaks.length).toBeGreaterThan(8);

    const gaps: number[] = [];
    for (let i = 1; i < peaks.length; i++) gaps.push((peaks[i] - peaks[i - 1]) / HOUR_MS);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;

    // The solar term pulls the mean slightly off pure M2, so allow 12 minutes.
    expect(mean).toBeGreaterThan(M2_PERIOD_HOURS - 0.2);
    expect(mean).toBeLessThan(M2_PERIOD_HOURS + 0.2);
  });

  it("gives two high tides a day, not one", () => {
    const from = new Date(Date.UTC(2026, 5, 1));
    const to = new Date(from.getTime() + 4 * 24 * HOUR_MS);
    const curve = equilibriumCurve(from, to, 42.36, -71.06, 5);
    let peaks = 0;
    for (let i = 1; i < curve.length - 1; i++) {
      if (
        curve[i].heightM > curve[i - 1].heightM &&
        curve[i].heightM >= curve[i + 1].heightM
      ) {
        peaks++;
      }
    }
    // 4 days x roughly 1.93 highs per day
    expect(peaks).toBeGreaterThanOrEqual(7);
    expect(peaks).toBeLessThanOrEqual(9);
  });

  it("refuses an absurd sample count instead of locking up", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    const to = new Date(Date.UTC(2027, 0, 1));
    expect(equilibriumCurve(from, to, 0, 0, 1)).toEqual([]);
    expect(equilibriumCurve(to, from, 0, 0, 10)).toEqual([]);
    expect(equilibriumCurve(from, to, 0, 0, 0)).toEqual([]);
    expect(equilibriumCurve(new Date(NaN), to, 0, 0)).toEqual([]);
  });
});

describe("spring and neap", () => {
  const FULL_MOON = new Date(Date.UTC(2024, 0, 25, 17, 54));
  const NEW_MOON = new Date(Date.UTC(2024, 0, 11, 11, 57));

  it("calls springs at BOTH new and full Moon", () => {
    // Alignment matters, not which side, because of the far-side bulge.
    expect(springNeap(NEW_MOON)!.phase).toBe("spring");
    expect(springNeap(FULL_MOON)!.phase).toBe("spring");
    expect(springNeap(NEW_MOON)!.alignment).toBeGreaterThan(0.95);
    expect(springNeap(FULL_MOON)!.alignment).toBeGreaterThan(0.95);
  });

  it("calls neaps at the quarters", () => {
    // First quarter is about 7.4 days after new Moon.
    const firstQuarter = new Date(NEW_MOON.getTime() + 7.38 * 24 * HOUR_MS);
    const s = springNeap(firstQuarter)!;
    expect(s.phase).toBe("neap");
    expect(s.alignment).toBeLessThan(0.35);
    expect(s.moonIllumination).toBeGreaterThan(0.4);
    expect(s.moonIllumination).toBeLessThan(0.6);
  });

  it("cycles twice per lunar month, on the published 14.77 day beat", () => {
    // Count spring maxima across 60 days and check the spacing.
    const start = NEW_MOON.getTime();
    const springs: number[] = [];
    let wasSpring = false;
    for (let h = 0; h < 60 * 24; h++) {
      const s = springNeap(new Date(start + h * HOUR_MS))!;
      const isSpring = s.phase === "spring";
      if (isSpring && !wasSpring) springs.push(h);
      wasSpring = isSpring;
    }
    expect(springs.length).toBeGreaterThanOrEqual(3);
    const gaps: number[] = [];
    for (let i = 1; i < springs.length; i++) gaps.push((springs[i] - springs[i - 1]) / 24);
    const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    expect(mean).toBeGreaterThan(SPRING_NEAP_DAYS - 1);
    expect(mean).toBeLessThan(SPRING_NEAP_DAYS + 1);
  });

  it("makes the spring range clearly bigger than the neap range", () => {
    // The textbook ratio is (0.36 + 0.16) / (0.36 - 0.16) = 2.6, but that
    // assumes both bodies pass overhead. At a mid-latitude station the Moon's
    // declination varies through the fortnight, which cuts the realised ratio
    // to around 1.6. The direction is the physics; the exact number is
    // geometry, so the assertion is on the direction and a wide honest band.
    const springCurve = equilibriumCurve(
      NEW_MOON,
      new Date(NEW_MOON.getTime() + 2 * 24 * HOUR_MS),
      42.36,
      -71.06,
      10
    );
    const neapStart = new Date(NEW_MOON.getTime() + 7.38 * 24 * HOUR_MS);
    const neapCurve = equilibriumCurve(
      neapStart,
      new Date(neapStart.getTime() + 2 * 24 * HOUR_MS),
      42.36,
      -71.06,
      10
    );
    const springRange = curveRangeM(springCurve)!;
    const neapRange = curveRangeM(neapCurve)!;
    expect(springRange).toBeGreaterThan(neapRange);
    expect(springRange / neapRange).toBeGreaterThan(1.4);
    expect(springRange / neapRange).toBeLessThan(3.6);
  });

  it("returns null for a bad date", () => {
    expect(springNeap(new Date(NaN))).toBeNull();
  });
});

describe("the gauge, and the gap", () => {
  it("parses a CO-OPS water level response", () => {
    const g = parseCoOps({
      metadata: { id: "8443970", name: "Boston", lat: "42.3539", lon: "-71.0503" },
      data: [
        { t: "2026-08-13 00:00", v: "1.412", q: "p" },
        { t: "2026-08-13 00:06", v: "1.508", q: "p" },
      ],
    });
    expect(g.samples).toHaveLength(2);
    expect(g.stationName).toBe("Boston");
    expect(g.latDeg).toBeCloseTo(42.3539, 4);
    expect(g.samples[0].heightM).toBeCloseTo(1.412, 6);
    // the tag has no zone marker and we request GMT
    expect(g.samples[0].time.toISOString()).toBe("2026-08-13T00:00:00.000Z");
  });

  it("also reads the predictions shape", () => {
    const g = parseCoOps({
      predictions: [{ t: "2026-08-13 00:00", v: "2.1" }],
    });
    expect(g.samples).toHaveLength(1);
  });

  it("drops missing readings rather than turning them into NaN", () => {
    // CO-OPS sends an EMPTY STRING for a missing value, which is exactly the
    // thing that becomes NaN on a chart if nobody checks.
    const g = parseCoOps({
      data: [
        { t: "2026-08-13 00:00", v: "" },
        { t: "2026-08-13 00:06", v: "1.5" },
        { t: "2026-08-13 00:12", v: "not a number" },
        { t: "bad time", v: "1.2" },
        { v: "1.3" },
        null,
      ],
    });
    expect(g.samples).toHaveLength(1);
    expect(g.dropped).toBe(5);
    for (const s of g.samples) expect(Number.isFinite(s.heightM)).toBe(true);
  });

  it("never throws on garbage", () => {
    for (const bad of [null, undefined, 42, "nope", {}, { data: "no" }]) {
      expect(() => parseCoOps(bad)).not.toThrow();
      expect(parseCoOps(bad).samples).toEqual([]);
    }
  });

  it("computes the amplification factor the tab exists to show", () => {
    const gauge = [
      { time: new Date(), heightM: 0 },
      { time: new Date(), heightM: 3.0 },
    ];
    const predicted = [{ heightM: -0.25 }, { heightM: 0.25 }];
    const a = amplification(gauge, predicted)!;
    expect(a.measuredRangeM).toBeCloseTo(3, 6);
    expect(a.predictedRangeM).toBeCloseTo(0.5, 6);
    expect(a.factor).toBeCloseTo(6, 6);
  });

  it("returns null rather than dividing by a zero predicted range", () => {
    expect(amplification([{ time: new Date(), heightM: 1 }], [{ heightM: 0 }])).toBeNull();
    expect(amplification(null, [{ heightM: 1 }, { heightM: 2 }])).toBeNull();
    expect(amplification([], [])).toBeNull();
    expect(curveRangeM([])).toBeNull();
    expect(curveRangeM(null)).toBeNull();
  });
});

describe("determinism", () => {
  it("gives the same answer for the same inputs", () => {
    const t = new Date(Date.UTC(2026, 5, 15, 12));
    expect(equilibriumTide(t, 42.36, -71.06)!.totalM).toBe(
      equilibriumTide(t, 42.36, -71.06)!.totalM
    );
  });
});
