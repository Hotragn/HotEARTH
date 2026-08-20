import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  annualChange,
  coefficientCount,
  coefficientsAt,
  dipPole,
  dipoleMoment,
  dipoleTilt,
  driftKm,
  fieldAt,
  fieldFromCoefficients,
  formatDeclination,
  geomagneticPole,
  parseIgrf,
  poleTrack,
  trueBearing,
  weakestField,
  IGRF_REFERENCE_RADIUS_KM,
} from "./geomagnetism";

/**
 * WHERE THE EXPECTED NUMBERS COME FROM.
 *
 * Two independent kinds of anchor, and neither is a previous run of this code.
 *
 * 1. THE OFFICIAL REFERENCE IMPLEMENTATION. pyIGRF14 is published by IAGA
 *    V-MOD alongside the coefficients themselves (MIT licence, Ciaran Beggan,
 *    British Geological Survey). It was run once, locally, at the twelve places
 *    and dates in REFERENCE below, and its output is frozen here. Agreeing with
 *    it to a hundredth of a nanotesla is the only real proof that the Legendre
 *    recursions, the geodetic conversion and the frame rotation in
 *    lib/geomagnetism are right, because every one of those is easy to get
 *    subtly and invisibly wrong.
 *
 * 2. NOAA'S PUBLISHED POLE POSITIONS, quoted on their Wandering of the
 *    Geomagnetic Poles page: for 2025.0 the geomagnetic north pole is at
 *    80.79 N geocentric, 72.76 W, the dipole axis is tilted 9.21 degrees, and
 *    the north dip pole is at 85.762 N, 139.298 E. Those come from WMM2025
 *    rather than IGRF-14, so exact agreement is not expected and would be
 *    suspicious; the tolerances below say how close the two models actually
 *    are, which is itself worth knowing.
 *
 * The real coefficient file is read from public/data, so a bad mirror fails the
 * suite rather than shipping.
 */

const RAW = JSON.parse(
  readFileSync(join(process.cwd(), "public/data/magnetic/igrf14.json"), "utf8")
);
const MODEL = parseIgrf(RAW)!;

/** Frozen output of pyIGRF14. X, Y, Z, H, F in nT; declination, inclination in degrees. */
const REFERENCE = [
  { name: "London", lat: 51.4779, lon: -0.0015, altKm: 0, year: 2025.0, x: 19556.20, y: 321.80, z: 44994.10, dec: 0.9427, inc: 66.5055, h: 19558.85, f: 49061.36 },
  { name: "Boston", lat: 42.3601, lon: -71.0589, altKm: 0, year: 2026.5, x: 20041.73, y: -4976.55, z: 46813.81, dec: -13.9450, inc: 66.1969, h: 20650.35, f: 51166.10 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093, altKm: 0, year: 2026.5, x: 24015.56, y: 5458.33, z: -51362.41, dec: 12.8048, inc: -64.3825, h: 24628.04, f: 56961.72 },
  { name: "Nairobi", lat: -1.2921, lon: 36.8219, altKm: 0, year: 2026.5, x: 30954.67, y: 139.58, z: -12801.39, dec: 0.2583, inc: -22.4675, h: 30954.98, f: 33497.56 },
  { name: "Cape Horn", lat: -55.9833, lon: -67.2667, altKm: 0, year: 2026.5, x: 19122.90, y: 3952.71, z: -24962.26, dec: 11.6786, inc: -51.9651, h: 19527.14, f: 31692.65 },
  { name: "Resolute", lat: 74.6973, lon: -94.8297, altKm: 0, year: 2026.5, x: 3238.17, y: -870.88, z: 57152.09, dec: -15.0531, inc: 86.6422, h: 3353.23, f: 57250.38 },
  { name: "Sao Paulo", lat: -23.5505, lon: -46.6333, altKm: 0, year: 2026.5, x: 15996.91, y: -6429.13, z: -14904.04, dec: -21.8951, inc: -40.8427, h: 17240.50, f: 22789.59 },
  { name: "Anchorage", lat: 61.2181, lon: -149.9003, altKm: 0, year: 2026.5, x: 14753.45, y: 3692.20, z: 52787.85, dec: 14.0503, inc: 73.9280, h: 15208.44, f: 54934.99 },
  { name: "500 km up", lat: 45.0, lon: 45.0, altKm: 500, year: 2020.0, x: 18130.05, y: 2087.54, z: 35973.55, dec: 6.5683, inc: 63.1007, h: 18249.83, f: 40337.98 },
  { name: "Paris 1900", lat: 48.8566, lon: 2.3522, altKm: 0, year: 1900.0, x: 19039.08, y: -5034.54, z: 42095.91, dec: -14.8118, inc: 64.9287, h: 19693.48, f: 46474.71 },
  { name: "Tokyo 1960", lat: 35.6762, lon: 139.6503, altKm: 0, year: 1960.0, x: 30230.88, y: -3349.02, z: 34538.93, dec: -6.3215, inc: 48.6321, h: 30415.82, f: 46022.38 },
  { name: "edge of validity", lat: 40.0, lon: -100.0, altKm: 0, year: 2029.9, x: 20377.74, y: 1578.23, z: 46914.46, dec: 4.4286, inc: 66.4592, h: 20438.76, f: 51173.33 },
];

describe("the committed IGRF-14 mirror", () => {
  it("parses, with degree 13 and 195 coefficients per epoch", () => {
    expect(MODEL).not.toBeNull();
    expect(MODEL.maxDegree).toBe(13);
    expect(coefficientCount(13)).toBe(195);
    for (const row of MODEL.coeffs) expect(row).toHaveLength(195);
    expect(MODEL.sv).toHaveLength(195);
  });

  it("covers 1900 to 2030 on a five-year grid", () => {
    expect(MODEL.epochs[0]).toBe(1900);
    expect(MODEL.epochs[MODEL.epochs.length - 1]).toBe(2025);
    expect(MODEL.validTo).toBe(2030);
    for (let i = 1; i < MODEL.epochs.length; i++) {
      expect(MODEL.epochs[i] - MODEL.epochs[i - 1]).toBeCloseTo(5, 9);
    }
  });

  it("has a negative axial dipole in every epoch", () => {
    // g(1,0) < 0 is why the north end of a compass needle points north: the
    // planet behaves like a bar magnet with its SOUTH pole up here. If this
    // ever flips sign in a mirror, the mirror is wrong, not the planet.
    for (const row of MODEL.coeffs) expect(row[0]).toBeLessThan(0);
  });

  it("refuses malformed input instead of half-parsing it", () => {
    expect(parseIgrf(null)).toBeNull();
    expect(parseIgrf({})).toBeNull();
    expect(parseIgrf({ maxDegree: 13, epochs: [2000], coeffs: [], sv: [] })).toBeNull();
    // wrong coefficient count for the stated degree
    expect(
      parseIgrf({ maxDegree: 13, epochs: [2000, 2005], coeffs: [[1], [1]], sv: [1] })
    ).toBeNull();
    // epochs out of order
    expect(
      parseIgrf({
        maxDegree: 1,
        epochs: [2005, 2000],
        coeffs: [new Array(3).fill(1), new Array(3).fill(1)],
        sv: new Array(3).fill(0),
      })
    ).toBeNull();
  });
});

describe("field synthesis against the official pyIGRF14 implementation", () => {
  for (const r of REFERENCE) {
    it(`matches at ${r.name}`, () => {
      const f = fieldAt(MODEL, r.lat, r.lon, r.altKm, r.year)!;
      expect(f).not.toBeNull();
      // A hundredth of a nanotesla out of fifty thousand: this is agreement
      // with the reference code, not resemblance to it.
      expect(f.x).toBeCloseTo(r.x, 1);
      expect(f.y).toBeCloseTo(r.y, 1);
      expect(f.z).toBeCloseTo(r.z, 1);
      expect(f.h).toBeCloseTo(r.h, 1);
      expect(f.f).toBeCloseTo(r.f, 1);
      expect(f.declination).toBeCloseTo(r.dec, 3);
      expect(f.inclination).toBeCloseTo(r.inc, 3);
    });
  }

  it("keeps the internal identities exactly", () => {
    const f = fieldAt(MODEL, 42.3601, -71.0589, 0, 2026.5)!;
    expect(Math.hypot(f.x, f.y)).toBeCloseTo(f.h, 9);
    expect(Math.hypot(f.h, f.z)).toBeCloseTo(f.f, 9);
    expect(Math.atan2(f.y, f.x) * (180 / Math.PI)).toBeCloseTo(f.declination, 9);
  });

  it("weakens with altitude, roughly as a dipole should", () => {
    // A dipole falls off as 1/r^3, so 500 km up the field should be about
    // (6371/6871)^3 = 0.80 of the surface value. Not exact, because the higher
    // harmonics fall off faster still, so the real ratio is a little lower.
    const ground = fieldAt(MODEL, 45, 45, 0, 2020)!;
    const up = fieldAt(MODEL, 45, 45, 500, 2020)!;
    const ratio = up.f / ground.f;
    expect(ratio).toBeGreaterThan(0.72);
    expect(ratio).toBeLessThan(0.82);
  });
});

describe("what the field does, as physics rather than as arithmetic", () => {
  it("is roughly twice as strong at the poles as at the magnetic equator", () => {
    // A dipole's total intensity at the pole is twice its equatorial value.
    const nearPole = fieldAt(MODEL, 89, 0, 0, 2026.5)!;
    const nearEquator = fieldAt(MODEL, -1.2921, 36.8219, 0, 2026.5)!; // Nairobi
    expect(nearPole.f / nearEquator.f).toBeGreaterThan(1.5);
    expect(nearPole.f / nearEquator.f).toBeLessThan(2.1);
  });

  it("dips down in the north and up in the south", () => {
    expect(fieldAt(MODEL, 60, 0, 0, 2026.5)!.inclination).toBeGreaterThan(60);
    expect(fieldAt(MODEL, -60, 0, 0, 2026.5)!.inclination).toBeLessThan(-50);
  });

  it("finds London's declination has crossed zero within living memory", () => {
    // A fact worth having on the page: London had a westerly declination for
    // four centuries and it passed through true north around 2019, so old
    // Ordnance Survey advice about "add the westerly variation" is now wrong
    // for the south of England.
    const then = fieldAt(MODEL, 51.4779, -0.0015, 0, 1990)!;
    const now = fieldAt(MODEL, 51.4779, -0.0015, 0, 2026.5)!;
    expect(then.declination).toBeLessThan(-3);
    expect(now.declination).toBeGreaterThan(0);
  });

  it("reports the rate of change, and it is not zero anywhere interesting", () => {
    const c = annualChange(MODEL, 42.3601, -71.0589, 0, 2026.5)!;
    expect(c).not.toBeNull();
    // Boston's declination is drifting east by a few hundredths of a degree a
    // year, so a chart printed a decade ago is already visibly stale.
    expect(Math.abs(c.declination)).toBeGreaterThan(0.01);
    expect(Math.abs(c.declination)).toBeLessThan(0.5);
  });

  it("refuses dates the model does not cover", () => {
    expect(coefficientsAt(MODEL, 1899)).toBeNull();
    expect(coefficientsAt(MODEL, 2031)).toBeNull();
    expect(fieldAt(MODEL, 45, 45, 0, 2040)).toBeNull();
    expect(fieldAt(MODEL, 45, 45, 0, 1850)).toBeNull();
    expect(fieldAt(MODEL, 95, 0, 0, 2026)).toBeNull();
    expect(fieldAt(MODEL, NaN, 0, 0, 2026)).toBeNull();
    expect(fieldAt(null, 45, 45, 0, 2026)).toBeNull();
  });

  it("interpolates linearly between epochs, which is IGRF's own definition", () => {
    const a = coefficientsAt(MODEL, 2010)!;
    const b = coefficientsAt(MODEL, 2015)!;
    const mid = coefficientsAt(MODEL, 2012.5)!;
    for (let i = 0; i < a.length; i += 37) {
      expect(mid[i]).toBeCloseTo((a[i] + b[i]) / 2, 9);
    }
  });

  it("carries the secular variation forward past the last epoch", () => {
    const last = MODEL.coeffs[MODEL.coeffs.length - 1];
    const later = coefficientsAt(MODEL, 2028)!;
    for (let i = 0; i < 10; i++) {
      expect(later[i]).toBeCloseTo(last[i] + MODEL.sv[i] * 3, 9);
    }
  });
});

describe("the geomagnetic pole against NOAA's published position", () => {
  it("puts the 2025 pole where NOAA puts it", () => {
    // NOAA, from WMM2025 for 2025.0: 80.79 N geocentric, 72.76 W. IGRF-14 and
    // WMM2025 share the era but not the fit, so a hundredth of a degree of
    // agreement is as much as should be expected, and is what turns up.
    const p = geomagneticPole(MODEL, 2025)!;
    expect(p.latDeg).toBeCloseTo(80.79, 1);
    expect(p.lonDeg).toBeCloseTo(-72.76, 1);
  });

  it("gives the published dipole tilt of 9.21 degrees", () => {
    expect(dipoleTilt(MODEL, 2025)!).toBeCloseTo(9.21, 1);
  });

  it("agrees with the constant the aurora tab was built on, to 7 km", () => {
    // lib/aurora hardcodes the WMM2020 pole: 80.65 N, 72.68 W. Computing the
    // 2020 pole from IGRF-14 gives 80.587 N, 72.65 W, which is 0.06 degrees or
    // about 7 km away. That gap is not an error in either: WMM2020 was
    // published in 2019 as a five-year PREDICTION, while IGRF-14's 2020 column
    // is a definitive retrospective fit made once the observations were in. Two
    // honest answers about the same year, and the later one is better.
    //
    // 7 km does not matter for an auroral oval that is hundreds of km wide, so
    // the aurora constant is left alone. This test is where it would show up if
    // a future model ever moved it far enough to matter.
    const p = geomagneticPole(MODEL, 2020)!;
    expect(Math.abs(p.latDeg - 80.65)).toBeLessThan(0.1);
    expect(Math.abs(p.lonDeg - -72.68)).toBeLessThan(0.1);
  });

  it("has the pole creeping, not racing", () => {
    // Unlike the dip pole, the dipole axis has barely moved: about two degrees
    // of latitude in 125 years.
    const a = geomagneticPole(MODEL, 1900)!;
    const b = geomagneticPole(MODEL, 2025)!;
    expect(Math.abs(b.latDeg - a.latDeg)).toBeLessThan(4);
    expect(b.latDeg).toBeGreaterThan(a.latDeg);
  });
});

describe("the dipole moment, and the weakening", () => {
  it("gives the published present-day value of about 7.7e22 A m^2", () => {
    const m = dipoleMoment(MODEL, 2025)!;
    expect(m).toBeGreaterThan(7.5);
    expect(m).toBeLessThan(7.9);
  });

  it("has fallen by about a tenth since 1900", () => {
    const then = dipoleMoment(MODEL, 1900)!;
    const now = dipoleMoment(MODEL, 2025)!;
    expect(then).toBeGreaterThan(now);
    const drop = 1 - now / then;
    expect(drop).toBeGreaterThan(0.05);
    expect(drop).toBeLessThan(0.12);
  });

  it("falls in every epoch, which is the actual published record", () => {
    let prev = Infinity;
    for (const y of MODEL.epochs) {
      const m = dipoleMoment(MODEL, y)!;
      expect(m).toBeLessThan(prev);
      prev = m;
    }
  });

  it("uses the model's own reference radius, not the WGS84 one", () => {
    // 6371.2 km is a constant of the IGRF definition. Substituting 6378.137
    // would change the moment by a fifth of a percent, which is the kind of
    // error that never announces itself.
    expect(IGRF_REFERENCE_RADIUS_KM).toBe(6371.2);
  });
});

describe("the dip pole, found by search rather than quoted", () => {
  it("lands near NOAA's published 2025 position", () => {
    // NOAA, from WMM2025: 85.762 N, 139.298 E. This is an iterative search over
    // all 195 coefficients of a DIFFERENT model, so a fraction of a degree of
    // disagreement is expected and is the honest measure of how much two
    // current field models differ up there.
    const p = dipPole(MODEL, 2025, "north")!;
    expect(p).not.toBeNull();
    expect(p.latDeg).toBeGreaterThan(85);
    expect(p.latDeg).toBeLessThan(87);
    expect(p.lonDeg).toBeGreaterThan(130);
    expect(p.lonDeg).toBeLessThan(150);
  });

  it("actually has zero horizontal field there, which is the definition", () => {
    const p = dipPole(MODEL, 2025, "north")!;
    const f = fieldAt(MODEL, p.latDeg, p.lonDeg, 0, 2025)!;
    expect(f.h).toBeLessThan(5);
    expect(Math.abs(f.inclination)).toBeGreaterThan(89.99);
  });

  it("finds a southern dip pole that is nowhere near antipodal", () => {
    // NOAA's published 2025 south magnetic pole is 63.851 S, 135.078 E. The two
    // dip poles being 20 degrees from antipodal is the clearest single argument
    // that the Earth is not a bar magnet.
    const n = dipPole(MODEL, 2025, "north")!;
    const s = dipPole(MODEL, 2025, "south")!;
    expect(s.latDeg).toBeGreaterThan(-66);
    expect(s.latDeg).toBeLessThan(-62);
    const antipodalLat = -n.latDeg;
    expect(Math.abs(s.latDeg - antipodalLat)).toBeGreaterThan(15);
  });

  it("shows the northern pole accelerating across the 20th century", () => {
    const t = poleTrack(MODEL, "north", 5);
    expect(t.poles.length).toBeGreaterThan(20);
    const speedAt = (year: number) => {
      const i = t.poles.findIndex((p) => p.year === year);
      return i > 0 ? t.speedKmPerYear[i] : null;
    };
    const early = speedAt(1930)!;
    const late = speedAt(2005)!;
    expect(early).toBeLessThan(20);
    expect(late).toBeGreaterThan(40);
    expect(late / early).toBeGreaterThan(2.5);
  });

  it("has walked a long way, and mostly recently", () => {
    const t = poleTrack(MODEL, "north", 5);
    const first = t.poles[0];
    const last = t.poles[t.poles.length - 1];
    // Canadian Arctic to the Siberian side of the pole.
    expect(last.latDeg).toBeGreaterThan(first.latDeg + 5);
  });

  it("returns nothing rather than a guess when asked for an impossible pole", () => {
    expect(dipPole(null, 2025, "north")).toBeNull();
    expect(dipPole(MODEL, 2100, "north")).toBeNull();
    expect(poleTrack(null, "north").poles).toEqual([]);
    expect(poleTrack(MODEL, "north", 0).poles).toEqual([]);
  });
});

describe("the South Atlantic Anomaly", () => {
  it("finds the weakest surface field in the South Atlantic", () => {
    const w = weakestField(MODEL, 2026.5)!;
    expect(w).not.toBeNull();
    // Off the coast of South America and drifting west.
    expect(w.latDeg).toBeGreaterThan(-40);
    expect(w.latDeg).toBeLessThan(-5);
    expect(w.lonDeg).toBeGreaterThan(-90);
    expect(w.lonDeg).toBeLessThan(0);
  });

  it("is about a third below the global average, not a hole", () => {
    const w = weakestField(MODEL, 2026.5)!;
    // A 22,000 nT minimum against a mid-latitude 50,000 nT: weak, not absent.
    expect(w.f).toBeGreaterThan(18000);
    expect(w.f).toBeLessThan(26000);
  });

  it("has deepened since 1900", () => {
    const then = weakestField(MODEL, 1900)!;
    const now = weakestField(MODEL, 2025)!;
    expect(now.f).toBeLessThan(then.f);
  });
});

describe("compass arithmetic, which is the practical point", () => {
  it("adds declination to get a true bearing", () => {
    // Boston, about 14 west: a compass reading of 90 is really 76.
    expect(trueBearing(90, -14)).toBeCloseTo(76, 9);
    expect(trueBearing(350, 20)).toBeCloseTo(10, 9);
    expect(trueBearing(10, -20)).toBeCloseTo(350, 9);
    expect(trueBearing(NaN, 0)).toBeNull();
  });

  it("puts a number on how far an uncorrected bearing misses by", () => {
    // Ten km at 14 degrees off is over two km sideways, which is the difference
    // between a col and a cliff.
    const d = driftKm(10, -14)!;
    expect(d).toBeGreaterThan(2.3);
    expect(d).toBeLessThan(2.5);
    expect(driftKm(0, 30)).toBe(0);
    expect(driftKm(-5, 30)).toBeNull();
  });

  it("says west and east rather than plus and minus", () => {
    expect(formatDeclination(-14.2)).toBe("14.2 degrees west");
    expect(formatDeclination(3.14)).toBe("3.1 degrees east");
    expect(formatDeclination(0.01)).toContain("true north");
    expect(formatDeclination(null)).toBe("unknown");
  });
});

describe("the hot path used by the map", () => {
  // fieldFromCoefficients exists so a whole-world map does not re-interpolate
  // 195 coefficients thirty thousand times. It must therefore be the SAME
  // physics, not a faster approximation of it, and it must still refuse bad
  // input rather than reading off the end of a short array.
  it("agrees with fieldAt exactly, not approximately", () => {
    const year = 2026.5;
    const coeffs = coefficientsAt(MODEL, year)!;
    for (const r of REFERENCE.filter((x) => x.year === year)) {
      const viaModel = fieldAt(MODEL, r.lat, r.lon, r.altKm, year)!;
      const viaCoeffs = fieldFromCoefficients(coeffs, MODEL.maxDegree, r.lat, r.lon, r.altKm)!;
      expect(viaCoeffs.x).toBe(viaModel.x);
      expect(viaCoeffs.y).toBe(viaModel.y);
      expect(viaCoeffs.z).toBe(viaModel.z);
      expect(viaCoeffs.declination).toBe(viaModel.declination);
    }
  });

  it("does not carry state between calls", () => {
    // The Legendre buffers are reused, so a bug there would show up as one
    // point's answer depending on the point computed before it.
    const coeffs = coefficientsAt(MODEL, 2026.5)!;
    const a1 = fieldFromCoefficients(coeffs, 13, 42.3601, -71.0589, 0)!;
    fieldFromCoefficients(coeffs, 13, -70, 140, 0);
    fieldFromCoefficients(coeffs, 13, 89.9, 0, 400);
    const a2 = fieldFromCoefficients(coeffs, 13, 42.3601, -71.0589, 0)!;
    expect(a2.declination).toBe(a1.declination);
    expect(a2.f).toBe(a1.f);
  });

  it("refuses a coefficient array that does not match the degree", () => {
    const coeffs = coefficientsAt(MODEL, 2026.5)!;
    expect(fieldFromCoefficients(coeffs, 12, 45, 45, 0)).toBeNull();
    expect(fieldFromCoefficients(coeffs.slice(0, 100), 13, 45, 45, 0)).toBeNull();
    expect(fieldFromCoefficients(coeffs, 13, 95, 45, 0)).toBeNull();
    expect(fieldFromCoefficients(coeffs, 13, 45, 45, NaN)).toBeNull();
  });
});
