import { describe, expect, it } from "vitest";
import {
  CHANCE_LABEL,
  EARTH_RADIUS_KM,
  EMISSION_ALTITUDE_KM,
  GEOMAGNETIC_POLE_LAT_DEG,
  GEOMAGNETIC_POLE_LON_DEG,
  OVAL_BOUNDARY_BY_KP,
  auroraVerdict,
  gScale,
  geomagneticLatitude,
  geomagneticLongitude,
  horizonRangeDeg,
  horizonRangeKm,
  ovalBoundaryLatitude,
  ovationPeak,
  ovationProbabilityAt,
  parseKpForecast,
  parseKpMinute,
  parseOvation,
  parseSolarWind,
} from "./aurora";

/**
 * Validation strategy: published values, exact geometric identities, and
 * real-world comparisons that must hold for any correct implementation.
 * Nothing is pinned to a previous run of this code.
 *
 * Published anchors used:
 *   - IGRF-13 epoch 2020 geomagnetic north pole: 80.65 N, 72.68 W.
 *   - NOAA SWPC equatorward oval boundary table by Kp (66.5 down to 48.1).
 *   - NOAA G scale: G1 begins at Kp 5, one step per Kp, G5 at Kp 9.
 *   - Aurora emission altitudes: green from atomic oxygen at ~100-150 km, red
 *     from the same atom's long-lived state at ~200-400 km.
 *   - Edinburgh and Moscow sit at the same geographic latitude (~55.8 N) with
 *     very different geomagnetic latitudes; likewise Vancouver and Paris
 *     (~49 N). This is the standard illustration of why the distinction matters.
 */

const CITY = {
  edinburgh: { lat: 55.953, lon: -3.188 },
  moscow: { lat: 55.756, lon: 37.617 },
  vancouver: { lat: 49.283, lon: -123.121 },
  paris: { lat: 48.857, lon: 2.352 },
  boston: { lat: 42.3601, lon: -71.0589 },
  reykjavik: { lat: 64.1466, lon: -21.9426 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  hobart: { lat: -42.8821, lon: 147.3272 },
};

describe("geomagnetic latitude", () => {
  it("is 90 degrees at the geomagnetic pole itself", () => {
    expect(
      geomagneticLatitude(GEOMAGNETIC_POLE_LAT_DEG, GEOMAGNETIC_POLE_LON_DEG)!
    ).toBeCloseTo(90, 6);
  });

  it("is minus 90 at the antipodal (southern) geomagnetic pole", () => {
    const antiLon = GEOMAGNETIC_POLE_LON_DEG + 180;
    expect(
      geomagneticLatitude(-GEOMAGNETIC_POLE_LAT_DEG, antiLon > 180 ? antiLon - 360 : antiLon)!
    ).toBeCloseTo(-90, 6);
  });

  it("puts the GEOGRAPHIC north pole at the pole offset, 80.65", () => {
    // The geographic pole sits exactly (90 - 80.65) = 9.35 degrees from the
    // geomagnetic pole, so its geomagnetic latitude is 80.65 whatever longitude
    // you nominally give it.
    expect(geomagneticLatitude(90, 0)!).toBeCloseTo(GEOMAGNETIC_POLE_LAT_DEG, 6);
    expect(geomagneticLatitude(90, 150)!).toBeCloseTo(GEOMAGNETIC_POLE_LAT_DEG, 6);
  });

  it("gives Edinburgh a far higher geomagnetic latitude than Moscow", () => {
    // The headline demonstration: same geographic latitude to within 0.2
    // degrees, and over six degrees apart geomagnetically.
    expect(Math.abs(CITY.edinburgh.lat - CITY.moscow.lat)).toBeLessThan(0.25);
    const edi = geomagneticLatitude(CITY.edinburgh.lat, CITY.edinburgh.lon)!;
    const mos = geomagneticLatitude(CITY.moscow.lat, CITY.moscow.lon)!;
    expect(edi - mos).toBeGreaterThan(5);
    expect(edi).toBeGreaterThan(55);
    expect(mos).toBeLessThan(53);
  });

  it("gives Vancouver a higher geomagnetic latitude than Paris", () => {
    expect(Math.abs(CITY.vancouver.lat - CITY.paris.lat)).toBeLessThan(0.5);
    const van = geomagneticLatitude(CITY.vancouver.lat, CITY.vancouver.lon)!;
    const par = geomagneticLatitude(CITY.paris.lat, CITY.paris.lon)!;
    expect(van - par).toBeGreaterThan(3);
  });

  it("keeps every city in a physically sensible band", () => {
    for (const [name, c] of Object.entries(CITY)) {
      const g = geomagneticLatitude(c.lat, c.lon)!;
      expect(g, name).toBeGreaterThanOrEqual(-90);
      expect(g, name).toBeLessThanOrEqual(90);
      // Nowhere is the dipole offset more than the 9.35 degree pole separation.
      expect(Math.abs(g - c.lat), name).toBeLessThanOrEqual(9.36);
    }
  });

  it("is antisymmetric through the centre of the Earth", () => {
    for (const c of Object.values(CITY)) {
      const here = geomagneticLatitude(c.lat, c.lon)!;
      const antiLon = c.lon > 0 ? c.lon - 180 : c.lon + 180;
      const there = geomagneticLatitude(-c.lat, antiLon)!;
      expect(there).toBeCloseTo(-here, 9);
    }
  });

  it("returns null for impossible coordinates", () => {
    expect(geomagneticLatitude(NaN, 0)).toBeNull();
    expect(geomagneticLatitude(0, NaN)).toBeNull();
    expect(geomagneticLatitude(91, 0)).toBeNull();
    expect(geomagneticLatitude(0, 181)).toBeNull();
    expect(geomagneticLongitude(NaN, 0)).toBeNull();
    expect(geomagneticLongitude(95, 0)).toBeNull();
  });

  it("gives a geomagnetic longitude inside +/-180", () => {
    for (const c of Object.values(CITY)) {
      const l = geomagneticLongitude(c.lat, c.lon)!;
      expect(l).toBeGreaterThanOrEqual(-180);
      expect(l).toBeLessThanOrEqual(180);
    }
  });
});

describe("oval boundary by Kp", () => {
  it("matches the published NOAA table at whole Kp", () => {
    for (let kp = 0; kp <= 9; kp++) {
      expect(ovalBoundaryLatitude(kp)!).toBeCloseTo(OVAL_BOUNDARY_BY_KP[kp], 9);
    }
    expect(OVAL_BOUNDARY_BY_KP[0]).toBe(66.5);
    expect(OVAL_BOUNDARY_BY_KP[9]).toBe(48.1);
  });

  it("moves the oval equatorward as Kp rises, always", () => {
    let prev = Infinity;
    for (let kp = 0; kp <= 9; kp += 0.33) {
      const b = ovalBoundaryLatitude(kp)!;
      expect(b).toBeLessThan(prev);
      prev = b;
    }
  });

  it("interpolates the thirds that Kp is actually reported in", () => {
    const at5 = ovalBoundaryLatitude(5)!;
    const at6 = ovalBoundaryLatitude(6)!;
    const at5third = ovalBoundaryLatitude(5.33)!;
    expect(at5third).toBeLessThan(at5);
    expect(at5third).toBeGreaterThan(at6);
  });

  it("clamps outside 0 to 9 rather than extrapolating off the table", () => {
    expect(ovalBoundaryLatitude(-3)!).toBe(OVAL_BOUNDARY_BY_KP[0]);
    expect(ovalBoundaryLatitude(12)!).toBe(OVAL_BOUNDARY_BY_KP[9]);
    expect(ovalBoundaryLatitude(NaN)).toBeNull();
  });
});

describe("horizon range of an aurora", () => {
  it("matches the geometric identity d = R acos(R/(R+h))", () => {
    const h = 110;
    const expected = EARTH_RADIUS_KM * Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h));
    expect(horizonRangeKm(h)!).toBeCloseTo(expected, 9);
  });

  it("puts the green layer around 1,175 km and the red around 1,960 km", () => {
    const green = horizonRangeKm(EMISSION_ALTITUDE_KM.green)!;
    const red = horizonRangeKm(EMISSION_ALTITUDE_KM.red)!;
    expect(green).toBeGreaterThan(1100);
    expect(green).toBeLessThan(1250);
    expect(red).toBeGreaterThan(1850);
    expect(red).toBeLessThan(2050);
  });

  it("explains the red-from-far-south effect: red reaches ~7 degrees further", () => {
    const green = horizonRangeDeg(EMISSION_ALTITUDE_KM.green)!;
    const red = horizonRangeDeg(EMISSION_ALTITUDE_KM.red)!;
    expect(green).toBeGreaterThan(9.5);
    expect(green).toBeLessThan(11.5);
    expect(red).toBeGreaterThan(16);
    expect(red).toBeLessThan(19);
    expect(red - green).toBeGreaterThan(5);
  });

  it("grows with height and refuses nonsense", () => {
    expect(horizonRangeKm(400)!).toBeGreaterThan(horizonRangeKm(100)!);
    expect(horizonRangeKm(0)).toBeNull();
    expect(horizonRangeKm(-5)).toBeNull();
    expect(horizonRangeKm(NaN)).toBeNull();
    expect(horizonRangeDeg(NaN)).toBeNull();
  });
});

describe("NOAA G scale", () => {
  it("matches the published mapping", () => {
    expect(gScale(0)!.scale).toBe("G0");
    expect(gScale(4.9)!.scale).toBe("G0");
    expect(gScale(5)!.scale).toBe("G1");
    expect(gScale(6)!.scale).toBe("G2");
    expect(gScale(7)!.scale).toBe("G3");
    expect(gScale(8)!.scale).toBe("G4");
    expect(gScale(9)!.scale).toBe("G5");
  });

  it("does not invent a storm below Kp 5", () => {
    for (const kp of [0, 1, 2, 3, 4, 4.67]) {
      expect(gScale(kp)!.scale).toBe("G0");
    }
  });

  it("clamps above Kp 9 and carries copy for every level", () => {
    expect(gScale(11)!.scale).toBe("G5");
    for (const kp of [0, 5, 6, 7, 8, 9]) {
      const g = gScale(kp)!;
      expect(g.label.length).toBeGreaterThan(3);
      expect(g.note.length).toBeGreaterThan(20);
      expect(g.note).not.toContain("—"); // project style: no em-dashes
    }
    expect(gScale(NaN)).toBeNull();
  });
});

describe("the verdict", () => {
  it("calls the aurora overhead when the observer is poleward of the oval", () => {
    // Reykjavik at geomagnetic ~68 is inside the oval even when quiet.
    const v = auroraVerdict(CITY.reykjavik.lat, CITY.reykjavik.lon, 2)!;
    expect(v.chance).toBe("overhead");
    expect(v.degreesFromOval).toBeLessThanOrEqual(0);
    expect(v.hemisphere).toBe("north");
  });

  it("walks a single city through every case as the storm grows", () => {
    // Boston, geomagnetic ~52. Quiet: the oval is far north. Severe: overhead.
    const seen = new Set<string>();
    for (const kp of [0, 2, 4, 5, 6, 7, 8, 9]) {
      const v = auroraVerdict(CITY.boston.lat, CITY.boston.lon, kp)!;
      seen.add(v.chance);
    }
    expect(seen.has("overhead")).toBe(true);
    expect(seen.size).toBeGreaterThanOrEqual(3);

    // and the progression is monotonic: never further from the oval at higher Kp
    let prev = Infinity;
    for (const kp of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const d = auroraVerdict(CITY.boston.lat, CITY.boston.lon, kp)!.degreesFromOval;
      expect(d).toBeLessThan(prev);
      prev = d;
    }
  });

  it("keeps the tropics out of it even in an extreme storm", () => {
    const v = auroraVerdict(CITY.singapore.lat, CITY.singapore.lon, 9)!;
    expect(v.chance).toBe("too-far");
    expect(v.degreesFromOval).toBeGreaterThan(17.6);
  });

  it("uses the southern oval for a southern observer", () => {
    const v = auroraVerdict(CITY.hobart.lat, CITY.hobart.lon, 6)!;
    expect(v.hemisphere).toBe("south");
    expect(v.geomagneticLat).toBeLessThan(0);
    // Hobart is a genuine aurora australis site in a moderate storm.
    expect(["overhead", "horizon"]).toContain(v.chance);
  });

  it("separates the green and red cases rather than averaging them", () => {
    // There must exist a Kp where a city is out of green range but in red range.
    const found = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .map((kp) => auroraVerdict(CITY.paris.lat, CITY.paris.lon, kp)!.chance)
      .includes("red-only");
    expect(found).toBe(true);
  });

  it("has a label for every case", () => {
    for (const key of ["overhead", "horizon", "red-only", "too-far"] as const) {
      expect(CHANCE_LABEL[key].length).toBeGreaterThan(10);
    }
  });

  it("returns null for bad input", () => {
    expect(auroraVerdict(NaN, 0, 5)).toBeNull();
    expect(auroraVerdict(0, 0, NaN)).toBeNull();
    expect(auroraVerdict(95, 0, 5)).toBeNull();
  });
});

describe("feed parsing", () => {
  it("reads the 1-minute Kp feed", () => {
    const rows = parseKpMinute([
      { time_tag: "2026-08-12T18:05:00", kp_index: 2, estimated_kp: 2.33, kp: "2P" },
      { time_tag: "2026-08-12T18:04:00", kp_index: 2, estimated_kp: 2.0, kp: "2Z" },
    ]);
    expect(rows).toHaveLength(2);
    // sorted oldest first
    expect(rows[0].time.getTime()).toBeLessThan(rows[1].time.getTime());
    expect(rows[1].kp).toBeCloseTo(2.33, 6);
    expect(rows[0].observed).toBe(true);
    // the tag has no zone marker and must be read as UTC
    expect(rows[1].time.toISOString()).toBe("2026-08-12T18:05:00.000Z");
  });

  it("reads the 3-day forecast and keeps observed separate from predicted", () => {
    const rows = parseKpForecast([
      { time_tag: "2026-08-06T00:00:00", kp: 1.33, observed: "observed" },
      { time_tag: "2026-08-16T00:00:00", kp: 2.33, observed: "predicted" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].observed).toBe(true);
    expect(rows[1].observed).toBe(false);
  });

  it("drops unusable rows instead of inventing values", () => {
    expect(parseKpMinute([{ time_tag: "x", estimated_kp: 1 }])).toHaveLength(0);
    expect(parseKpMinute([{ time_tag: "2026-08-12T18:05:00" }])).toHaveLength(0);
    expect(parseKpForecast([{ time_tag: "2026-08-06T00:00:00" }])).toHaveLength(0);
    expect(parseKpMinute(null)).toEqual([]);
    expect(parseKpForecast("nope")).toEqual([]);
    expect(parseKpMinute([null, 5, "x"])).toEqual([]);
  });

  it("reads the solar wind summaries, including a southward Bz", () => {
    const sw = parseSolarWind(
      [{ proton_speed: 389, time_tag: "2026-08-13T00:01:00Z" }],
      [{ bt: 5, bz_gsm: -3, time_tag: "2026-08-13T00:01:00Z" }]
    );
    expect(sw.speedKmS).toBe(389);
    expect(sw.btNt).toBe(5);
    expect(sw.bzNt).toBe(-3);
    expect(sw.time).toBeInstanceOf(Date);
  });

  it("degrades to nulls when the wind feeds are missing or malformed", () => {
    const sw = parseSolarWind(null, undefined);
    expect(sw.speedKmS).toBeNull();
    expect(sw.btNt).toBeNull();
    expect(sw.bzNt).toBeNull();
    expect(sw.time).toBeNull();
    expect(() => parseSolarWind("x", 42)).not.toThrow();
  });
});

describe("the OVATION grid", () => {
  /** A minimal grid with one hot cell, in the real feed's shape. */
  function grid(cells: Array<[number, number, number]>) {
    return parseOvation({
      "Observation Time": "2026-08-12T23:55:00Z",
      "Forecast Time": "2026-08-13T01:04:00Z",
      coordinates: cells,
    });
  }

  it("parses times and indexes by longitude and latitude", () => {
    const g = grid([
      [0, -90, 6],
      [10, 60, 42],
      [350, 65, 90],
    ])!;
    expect(g.observationTime).toBeInstanceOf(Date);
    expect(g.forecastTime!.getTime()).toBeGreaterThan(g.observationTime!.getTime());
    expect(g.activePoints).toBe(3);
    expect(ovationProbabilityAt(g, 60, 10)).toBe(42);
    expect(ovationProbabilityAt(g, 65, 350)).toBe(90);
    expect(ovationProbabilityAt(g, -90, 0)).toBe(6);
  });

  it("accepts a negative longitude, which is how the rest of the app speaks", () => {
    const g = grid([[350, 65, 90]])!;
    // -10 east is 350 east
    expect(ovationProbabilityAt(g, 65, -10)).toBe(90);
  });

  it("reports zero where the model says zero, which is not the same as no data", () => {
    const g = grid([[10, 60, 42]])!;
    expect(ovationProbabilityAt(g, 0, 0)).toBe(0);
    expect(ovationProbabilityAt(null, 0, 0)).toBeNull();
    expect(ovationProbabilityAt(g, NaN, 0)).toBeNull();
    expect(ovationProbabilityAt(g, 95, 0)).toBeNull();
  });

  it("finds the peak probability", () => {
    const g = grid([
      [10, 60, 42],
      [11, 61, 77],
      [12, 62, 3],
    ])!;
    expect(ovationPeak(g)).toBe(77);
    expect(ovationPeak(null)).toBeNull();
  });

  it("never throws on garbage and returns null when there is nothing to read", () => {
    for (const bad of [null, undefined, 42, "nope", {}, { coordinates: "no" }]) {
      expect(() => parseOvation(bad)).not.toThrow();
      expect(parseOvation(bad)).toBeNull();
    }
    const g = parseOvation({ coordinates: [[1, 2, 3], null, [1], "x", [NaN, 2, 3]] })!;
    expect(g.activePoints).toBe(1);
  });

  it("handles a full-size grid without exploding", () => {
    const cells: Array<[number, number, number]> = [];
    for (let lon = 0; lon < 360; lon++) {
      for (let lat = -90; lat <= 90; lat++) {
        cells.push([lon, lat, lat > 60 ? 30 : 0]);
      }
    }
    expect(cells).toHaveLength(65160);
    const g = parseOvation({ coordinates: cells })!;
    expect(g.probability).toHaveLength(65160);
    expect(ovationProbabilityAt(g, 70, 100)).toBe(30);
    expect(ovationProbabilityAt(g, 10, 100)).toBe(0);
  });
});

describe("determinism", () => {
  it("gives the same answer for the same inputs", () => {
    const a = auroraVerdict(CITY.boston.lat, CITY.boston.lon, 6)!;
    const b = auroraVerdict(CITY.boston.lat, CITY.boston.lon, 6)!;
    expect(a.geomagneticLat).toBe(b.geomagneticLat);
    expect(a.chance).toBe(b.chance);
  });
});
