import { describe, expect, it } from "vitest";
import { EARTH_MEAN_RADIUS_KM, greatCircleKm } from "./geo";
import { greatCircleKm as greatCircleFromEclipses } from "./eclipses";
import {
  greatCircleKm as greatCircleFromIss,
  EARTH_MEAN_RADIUS_KM as EARTH_RADIUS_FROM_ISS,
  footprintAngularRadiusDeg,
  footprintGroundRadiusKm,
} from "./iss-facts";
import { distanceToQuakeKm } from "./quakes";
import {
  EARTH_RADIUS_KM as EARTH_RADIUS_FROM_AURORA,
  horizonRangeKm,
  ovalBoundaryLatitude,
} from "./aurora";
import { auroraEquatorwardBoundaryDeg, gScaleFromKp } from "./sun";
import { gScale } from "./aurora";
import { R_EARTH_KM as R_EARTH_EQUATORIAL_KM } from "./satellites";
import { subsolarPoint } from "./solar";
import { sunEclipticLongitude } from "./lunar";
import { julianDate } from "./celestial";
import { OBLIQUITY_J2000_DEG } from "./precession";
import { meanObliquityDeg } from "./tonight";

/**
 * CROSS-MODULE CONSISTENCY.
 *
 * Every other test file checks one module against published values. This one
 * checks the modules against EACH OTHER, because the most dangerous bug this
 * codebase has actually produced was not a wrong number, it was two right-ish
 * numbers that disagreed.
 *
 * That has happened twice now:
 *
 *   1. lib/sun and lib/aurora each had an auroral oval model. One said the oval
 *      reaches 40 degrees at Kp9, the other 48.1. Both cited NOAA. Nothing was
 *      obviously broken and the two tabs simply told visitors different things.
 *
 *   2. lib/eclipses and lib/iss-facts each had a great-circle distance, with
 *      different Earth radii and different behaviour on bad input. The numbers
 *      differed by about seven metres over five thousand kilometres, which is
 *      to say: invisible, until someone fixed one and not the other.
 *
 * Both are consolidated now. These tests exist so a third one cannot appear
 * quietly. If you are here because one of them failed, the fix is almost never
 * to relax the assertion: it is that two modules have drifted apart and one of
 * them needs to start delegating.
 */

describe("one great-circle distance, not three", () => {
  const CASES: Array<[string, number, number, number, number]> = [
    ["London to New York", 51.5074, -0.1278, 40.7128, -74.006],
    ["pole to pole", 90, 0, -90, 0],
    ["equator quarter turn", 0, 0, 0, 90],
    ["Sydney to Santiago", -33.8688, 151.2093, -33.4489, -70.6693],
  ];

  it("gives byte-identical answers through every module that exposes it", () => {
    for (const [name, a, b, c, d] of CASES) {
      const canonical = greatCircleKm(a, b, c, d);
      expect(canonical, name).not.toBeNull();
      expect(greatCircleFromEclipses(a, b, c, d), name).toBe(canonical);
      expect(greatCircleFromIss(a, b, c, d), name).toBe(canonical);
    }
  });

  it("is the same function lib/quakes measures epicentre distance with", () => {
    const quake = {
      id: "x",
      mag: 5,
      magType: "mww",
      latDeg: 40.7128,
      lonDeg: -74.006,
      depthKm: 10,
      time: new Date(),
      place: "t",
      significance: null,
      tsunami: false,
      url: null,
    };
    expect(distanceToQuakeKm(51.5074, -0.1278, quake)).toBe(
      greatCircleKm(51.5074, -0.1278, 40.7128, -74.006)
    );
  });

  it("is null-safe everywhere it is exposed, not just in one module", () => {
    for (const fn of [greatCircleKm, greatCircleFromEclipses, greatCircleFromIss]) {
      expect(fn(NaN, 0, 0, 0)).toBeNull();
      expect(fn(0, Infinity, 0, 0)).toBeNull();
    }
  });

  it("matches the published pole-to-pole and quarter-turn distances", () => {
    // Half a meridian and a quarter of the equator on a sphere of mean radius.
    expect(greatCircleKm(90, 0, -90, 0)!).toBeCloseTo(Math.PI * EARTH_MEAN_RADIUS_KM, 6);
    expect(greatCircleKm(0, 0, 0, 90)!).toBeCloseTo((Math.PI / 2) * EARTH_MEAN_RADIUS_KM, 6);
  });
});

describe("one Earth radius per job", () => {
  it("shares the mean radius across every module that does surface geometry", () => {
    expect(EARTH_RADIUS_FROM_ISS).toBe(EARTH_MEAN_RADIUS_KM);
    expect(EARTH_RADIUS_FROM_AURORA).toBe(EARTH_MEAN_RADIUS_KM);
    expect(EARTH_MEAN_RADIUS_KM).toBeCloseTo(6371.0088, 6);
  });

  it("keeps the WGS84 equatorial radius separate, because it is a different job", () => {
    // lib/satellites is referenced to the equatorial figure, as orbital work is.
    // These must NOT be unified: the bug would be using either for both.
    expect(R_EARTH_EQUATORIAL_KM).toBeCloseTo(6378.137, 6);
    expect(R_EARTH_EQUATORIAL_KM).toBeGreaterThan(EARTH_MEAN_RADIUS_KM);
    expect(R_EARTH_EQUATORIAL_KM - EARTH_MEAN_RADIUS_KM).toBeCloseTo(7.13, 1);
  });
});

describe("one horizon geometry", () => {
  /**
   * "How far can I see something at height h" and "how far can something at
   * height h see" are the same question, and this app asks both: lib/iss-facts
   * for the station's footprint, lib/aurora for how far an aurora stays above
   * the horizon. They must agree.
   */
  it("agrees between the ISS footprint and the aurora horizon range", () => {
    for (const h of [110, 300, 420, 800]) {
      const auroraKm = horizonRangeKm(h)!;
      const issKm = footprintGroundRadiusKm(h);
      expect(auroraKm, `h=${h}`).toBeCloseTo(issKm, 6);
    }
  });

  it("reproduces the published ISS footprint at station altitude", () => {
    // ~20 degrees angular radius, ~2,260 km on the ground, at about 420 km up.
    expect(footprintAngularRadiusDeg(420)).toBeGreaterThan(19);
    expect(footprintAngularRadiusDeg(420)).toBeLessThan(21);
    expect(horizonRangeKm(420)!).toBeGreaterThan(2200);
    expect(horizonRangeKm(420)!).toBeLessThan(2320);
  });
});

describe("one auroral oval model", () => {
  it("has lib/sun delegating to lib/aurora rather than carrying its own rule", () => {
    for (let kp = 0; kp <= 9; kp += 0.5) {
      expect(auroraEquatorwardBoundaryDeg(kp), `Kp ${kp}`).toBe(ovalBoundaryLatitude(kp));
    }
  });

  it("is not the old 67 - 3*Kp rule that used to live in lib/sun", () => {
    // Guards the specific regression: that rule reached 40 at Kp9 against the
    // published table's 48.1, an eight-degree disagreement between two tabs.
    expect(auroraEquatorwardBoundaryDeg(9)).toBeCloseTo(48.1, 6);
    expect(auroraEquatorwardBoundaryDeg(9)).not.toBeCloseTo(40, 1);
  });

  it("agrees on the NOAA G scale across both modules", () => {
    for (let kp = 0; kp <= 9; kp += 0.5) {
      const fromSun = gScaleFromKp(kp)!;
      const fromAurora = gScale(kp)!.scale;
      const expected = fromSun === 0 ? "G0" : `G${fromSun}`;
      expect(fromAurora, `Kp ${kp}`).toBe(expected);
    }
  });
});

describe("one Sun, seen from two modules", () => {
  /**
   * lib/solar carries a low-precision NOAA-style solar position (used for the
   * terminator, sunrise and twilight) and lib/lunar carries Meeus' solar
   * longitude (used for the Moon's phase). They are different approximations of
   * the same body, and they are allowed to differ slightly, but they must not
   * disagree by anything a reader could notice.
   */
  it("puts the Sun in the same place to within a degree, all year", () => {
    let worst = 0;
    for (let d = 0; d < 365; d += 7) {
      const date = new Date(Date.UTC(2026, 0, 1) + d * 86_400_000);

      // lib/lunar's ecliptic longitude of the Sun
      const meeusLon = sunEclipticLongitude(date);

      // lib/solar's subsolar point, converted back to an ecliptic longitude via
      // the apparent right ascension implied by the subsolar longitude and GMST.
      const sub = subsolarPoint(date);
      const jd = julianDate(date);
      const gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0)) % 360;
      const raDeg = ((gmst + sub.lon) % 360 + 360) % 360;
      const eps = meanObliquityDeg(date)! * (Math.PI / 180);
      const ra = raDeg * (Math.PI / 180);
      const dec = sub.lat * (Math.PI / 180);
      // ecliptic longitude from RA/Dec
      const lambda =
        Math.atan2(
          Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps),
          Math.cos(ra)
        ) *
        (180 / Math.PI);
      const solarLon = ((lambda % 360) + 360) % 360;

      let diff = Math.abs(solarLon - meeusLon) % 360;
      if (diff > 180) diff = 360 - diff;
      worst = Math.max(worst, diff);
    }
    // Both are low-precision models; a degree is the honest tolerance and is far
    // tighter than any difference a visitor could see on screen.
    expect(worst).toBeLessThan(1.0);
  });
});

describe("one obliquity", () => {
  it("agrees between the J2000 constant and the obliquity-of-date model", () => {
    const atJ2000 = meanObliquityDeg(new Date(Date.UTC(2000, 0, 1, 12)))!;
    expect(atJ2000).toBeCloseTo(OBLIQUITY_J2000_DEG, 4);
  });

  it("has the obliquity of date drifting the published ~47 arcsec per century", () => {
    const y2000 = meanObliquityDeg(new Date(Date.UTC(2000, 0, 1, 12)))!;
    const y2100 = meanObliquityDeg(new Date(Date.UTC(2100, 0, 1, 12)))!;
    expect(y2000 - y2100).toBeCloseTo(47 / 3600, 3);
  });
});
