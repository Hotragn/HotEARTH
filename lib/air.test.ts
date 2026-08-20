import { describe, expect, it } from "vitest";
import {
  EU_BANDS,
  EU_CATEGORIES,
  MOLAR_MASS_G_PER_MOL,
  MOLAR_VOLUME_L,
  POLLUTANTS,
  POLLUTANT_LABEL,
  POLLUTANT_SOURCE,
  US_NO2_BREAKPOINTS,
  US_OZONE_BREAKPOINTS,
  US_PM10_BREAKPOINTS,
  US_PM25_BREAKPOINTS,
  WHO_GUIDELINE_UGM3,
  aqiFromBreakpoints,
  euBand,
  parseAirQuality,
  ppbToUgm3,
  subIndices,
  timesWhoDaily,
  ugm3ToPpb,
  verdict,
  type AirReading,
} from "./air";

/**
 * Validation strategy: the published tables themselves, the identities they
 * imply, and the conversion factors that appear in the literature. Nothing is
 * pinned to a previous run of this code.
 *
 * Published anchors used:
 *   - US EPA AQI breakpoints, PM2.5 as revised in 2024 (Good ends at 9.0, not
 *     the old 12.0), PM10, 8-hour ozone and 1-hour NO2.
 *   - The EPA index equation, which is linear within each band, so the band
 *     edges must map exactly onto the index edges.
 *   - EEA European Air Quality Index band edges.
 *   - Standard conversion factors at 25 C and 1013.25 hPa: 1 ppb of ozone is
 *     1.96 ug/m3, NO2 1.88, SO2 2.62, and 1 ppm of CO is about 1145 ug/m3.
 *   - WHO 2021 Global Air Quality Guidelines: PM2.5 5 annual / 15 daily,
 *     PM10 15 / 45, NO2 10 / 25.
 */

describe("the EPA index equation", () => {
  it("maps every band edge exactly onto its index edge", () => {
    // This is the whole content of an AQI: linear inside each row of the table.
    // If an edge is off by one, the table has been transcribed wrongly.
    for (const table of [
      US_PM25_BREAKPOINTS,
      US_PM10_BREAKPOINTS,
      US_OZONE_BREAKPOINTS,
      US_NO2_BREAKPOINTS,
    ]) {
      for (const b of table) {
        expect(aqiFromBreakpoints(b.cLow, table)!.aqi).toBe(b.iLow);
        expect(aqiFromBreakpoints(b.cHigh, table)!.aqi).toBe(b.iHigh);
      }
    }
  });

  it("puts the midpoint of a band at the midpoint of its index range", () => {
    const b = US_PM25_BREAKPOINTS[1]; // 9.1 to 35.4 maps to 51 to 100
    const mid = (b.cLow + b.cHigh) / 2;
    const expected = Math.round((b.iLow + b.iHigh) / 2);
    expect(aqiFromBreakpoints(mid, US_PM25_BREAKPOINTS)!.aqi).toBeCloseTo(expected, 0);
  });

  it("uses the 2024 PM2.5 table, where Good ends at 9.0", () => {
    // The revision matters: 10 ug/m3 was "Good" under the old table and is
    // "Moderate" under this one.
    expect(aqiFromBreakpoints(9.0, US_PM25_BREAKPOINTS)!.category).toBe("Good");
    expect(aqiFromBreakpoints(9.0, US_PM25_BREAKPOINTS)!.aqi).toBe(50);
    expect(aqiFromBreakpoints(10, US_PM25_BREAKPOINTS)!.category).toBe("Moderate");
    expect(aqiFromBreakpoints(12.0, US_PM25_BREAKPOINTS)!.aqi).toBeGreaterThan(50);
  });

  it("reproduces the published category boundaries for PM2.5", () => {
    const cat = (c: number) => aqiFromBreakpoints(c, US_PM25_BREAKPOINTS)!.category;
    expect(cat(0)).toBe("Good");
    expect(cat(35.4)).toBe("Moderate");
    expect(cat(35.5)).toBe("Unhealthy for sensitive groups");
    expect(cat(55.5)).toBe("Unhealthy");
    expect(cat(125.5)).toBe("Very unhealthy");
    expect(cat(225.5)).toBe("Hazardous");
  });

  it("is monotonic: more pollution never gives a lower index", () => {
    let prev = -1;
    for (let c = 0; c <= 400; c += 0.5) {
      const r = aqiFromBreakpoints(c, US_PM25_BREAKPOINTS)!;
      expect(r.aqi).toBeGreaterThanOrEqual(prev);
      prev = r.aqi;
    }
  });

  it("caps at the top of the table instead of extrapolating", () => {
    const top = US_PM25_BREAKPOINTS[US_PM25_BREAKPOINTS.length - 1];
    expect(aqiFromBreakpoints(10_000, US_PM25_BREAKPOINTS)!.aqi).toBe(top.iHigh);
    expect(aqiFromBreakpoints(10_000, US_PM25_BREAKPOINTS)!.category).toBe("Hazardous");
  });

  it("assigns the hairline gaps between published rows to the band below", () => {
    // The tables read 9.0 then 9.1, so 9.05 falls in a gap that must not
    // return null.
    const r = aqiFromBreakpoints(9.05, US_PM25_BREAKPOINTS);
    expect(r).not.toBeNull();
    expect(r!.aqi).toBe(50);
  });

  it("returns null for impossible input", () => {
    expect(aqiFromBreakpoints(NaN, US_PM25_BREAKPOINTS)).toBeNull();
    expect(aqiFromBreakpoints(-1, US_PM25_BREAKPOINTS)).toBeNull();
    expect(aqiFromBreakpoints(10, [])).toBeNull();
  });
});

describe("mass concentration to mixing ratio", () => {
  it("matches the published factors at 25 C and 1013 hPa", () => {
    // 1 ppb of ozone is 1.96 ug/m3; NO2 1.88; SO2 2.62.
    expect(ppbToUgm3(1, "ozone")!).toBeCloseTo(1.963, 2);
    expect(ppbToUgm3(1, "nitrogen_dioxide")!).toBeCloseTo(1.882, 2);
    expect(ppbToUgm3(1, "sulphur_dioxide")!).toBeCloseTo(2.620, 2);
    // and 1 ppm of CO, which is 1000 ppb, is about 1145 ug/m3. Published
    // tables round this to 1145 or quote 1.145 mg/m3; the exact value is
    // 1000 * 28.01 / 24.45 = 1145.6.
    expect(ppbToUgm3(1000, "carbon_monoxide")!).toBeGreaterThan(1145);
    expect(ppbToUgm3(1000, "carbon_monoxide")!).toBeLessThan(1146);
  });

  it("round-trips", () => {
    for (const p of ["ozone", "nitrogen_dioxide", "sulphur_dioxide", "carbon_monoxide"] as const) {
      expect(ugm3ToPpb(ppbToUgm3(42, p)!, p)!).toBeCloseTo(42, 9);
    }
  });

  it("REFUSES to convert particulates, which have no molar mass", () => {
    // PM2.5 is a size class, not a substance. A ppb figure for it would be
    // meaningless, so there is no molar mass to convert with.
    expect(MOLAR_MASS_G_PER_MOL.pm2_5).toBeUndefined();
    expect(MOLAR_MASS_G_PER_MOL.pm10).toBeUndefined();
    expect(ugm3ToPpb(12, "pm2_5")).toBeNull();
    expect(ppbToUgm3(12, "pm10")).toBeNull();
  });

  it("uses the EPA reference molar volume", () => {
    expect(MOLAR_VOLUME_L).toBeCloseTo(24.45, 2);
  });

  it("returns null for bad input", () => {
    expect(ugm3ToPpb(NaN, "ozone")).toBeNull();
    expect(ugm3ToPpb(-5, "ozone")).toBeNull();
    expect(ppbToUgm3(NaN, "ozone")).toBeNull();
  });
});

describe("the European bands", () => {
  it("matches the published EEA edges for PM2.5", () => {
    const cat = (c: number) => euBand(c, "pm2_5")!.category;
    expect(cat(0)).toBe("Good");
    expect(cat(10)).toBe("Good");
    expect(cat(10.1)).toBe("Fair");
    expect(cat(20)).toBe("Fair");
    expect(cat(25)).toBe("Moderate");
    expect(cat(50)).toBe("Poor");
    expect(cat(75)).toBe("Very poor");
    expect(cat(75.1)).toBe("Extremely poor");
  });

  it("is monotonic in every pollutant it covers", () => {
    for (const p of Object.keys(EU_BANDS) as Array<keyof typeof EU_BANDS>) {
      let prev = -1;
      for (let c = 0; c <= 900; c += 5) {
        const r = euBand(c, p as never)!;
        expect(r.index).toBeGreaterThanOrEqual(prev);
        prev = r.index;
      }
    }
  });

  it("has six bands and six category names", () => {
    expect(EU_CATEGORIES).toHaveLength(6);
    for (const edges of Object.values(EU_BANDS)) {
      expect(edges).toHaveLength(5); // five edges define six bands
    }
  });

  it("returns null for a pollutant it has no band for", () => {
    expect(euBand(1000, "carbon_monoxide")).toBeNull();
    expect(euBand(NaN, "pm2_5")).toBeNull();
    expect(euBand(-1, "pm2_5")).toBeNull();
  });
});

describe("the two scales disagreeing, which is the point of the tab", () => {
  it("calls the same air Moderate in the US and Fair in Europe", () => {
    // 12.4 ug/m3 of PM2.5, a real reading. The US index crosses out of Good at
    // 9.0; the European index does not until 10, and its second band runs to 20.
    const us = aqiFromBreakpoints(12.4, US_PM25_BREAKPOINTS)!;
    const eu = euBand(12.4, "pm2_5")!;
    expect(us.category).toBe("Moderate");
    expect(us.aqi).toBeGreaterThan(50);
    expect(eu.category).toBe("Fair");
    expect(eu.index).toBe(1);
  });

  it("finds air that is Good on one scale and not the other", () => {
    // Anything between the two first thresholds, 9.0 and 10.0.
    const c = 9.5;
    expect(aqiFromBreakpoints(c, US_PM25_BREAKPOINTS)!.category).not.toBe("Good");
    expect(euBand(c, "pm2_5")!.category).toBe("Good");
  });

  it("flags the disagreement in the verdict", () => {
    const reading: AirReading = {
      time: new Date("2026-08-20T06:00:00Z"),
      ugm3: { pm2_5: 9.5 },
      feedUsAqi: null,
      feedEuAqi: null,
    };
    const v = verdict(subIndices(reading));
    expect(v.scalesDisagree).toBe(true);
  });

  it("does not flag a disagreement when both scales agree", () => {
    for (const pm of [2, 60]) {
      const v = verdict(
        subIndices({
          time: new Date(),
          ugm3: { pm2_5: pm },
          feedUsAqi: null,
          feedEuAqi: null,
        })
      );
      expect(v.scalesDisagree, `pm2_5=${pm}`).toBe(false);
    }
  });
});

describe("sub-indices and the driver", () => {
  const reading: AirReading = {
    time: new Date("2026-08-20T06:00:00Z"),
    ugm3: {
      pm2_5: 12.4,
      pm10: 13.3,
      ozone: 82.0,
      nitrogen_dioxide: 15.9,
      sulphur_dioxide: 1.3,
      carbon_monoxide: 200.0,
    },
    feedUsAqi: 54,
    feedEuAqi: 33,
  };

  it("converts the gases to ppb before using the US tables", () => {
    const o3 = subIndices(reading).find((s) => s.pollutant === "ozone")!;
    // 82 ug/m3 of ozone is about 42 ppb, which is inside the Good band (0-54).
    expect(o3.ppb).toBeCloseTo(41.8, 1);
    expect(o3.usCategory).toBe("Good");
    // Using 82 as if it were ppb lands in "Unhealthy for sensitive groups":
    // TWO bands worse than the truth, from forgetting one conversion. This is
    // the factor-of-two style error the conversion exists to prevent, and the
    // wrong answer is the kind that looks entirely plausible on a dashboard.
    expect(aqiFromBreakpoints(82, US_OZONE_BREAKPOINTS)!.category).toBe(
      "Unhealthy for sensitive groups"
    );
    expect(o3.usCategory).toBe("Good");
  });

  it("leaves particulates in ug/m3 with no ppb", () => {
    const pm = subIndices(reading).find((s) => s.pollutant === "pm2_5")!;
    expect(pm.ppb).toBeNull();
    expect(pm.usAqi).not.toBeNull();
  });

  it("names the pollutant driving each index, which the feed does not", () => {
    const v = verdict(subIndices(reading));
    expect(v.usDriver).not.toBeNull();
    expect(v.usAqi).toBe(
      Math.max(...subIndices(reading).map((s) => s.usAqi ?? -1))
    );
    expect(v.euIndex).toBe(
      Math.max(...subIndices(reading).map((s) => s.euIndex ?? -1))
    );
  });

  it("takes the maximum, never an average", () => {
    const spiky: AirReading = {
      time: new Date(),
      // clean particulates, a severe ozone episode
      ugm3: { pm2_5: 1, ozone: 400 },
      feedUsAqi: null,
      feedEuAqi: null,
    };
    const v = verdict(subIndices(spiky));
    expect(v.usDriver).toBe("ozone");
    expect(v.euDriver).toBe("ozone");
    expect(v.euCategory).toBe("Extremely poor");
    // an average would have hidden it completely
    expect(v.usAqi!).toBeGreaterThan(150);
  });

  it("returns [] with no reading", () => {
    expect(subIndices(null)).toEqual([]);
    const v = verdict([]);
    expect(v.usAqi).toBeNull();
    expect(v.usDriver).toBeNull();
    expect(v.scalesDisagree).toBe(false);
  });
});

describe("WHO guidelines", () => {
  it("matches the published 2021 values", () => {
    expect(WHO_GUIDELINE_UGM3.pm2_5).toEqual({ daily: 15, annual: 5 });
    expect(WHO_GUIDELINE_UGM3.pm10).toEqual({ daily: 45, annual: 15 });
    expect(WHO_GUIDELINE_UGM3.nitrogen_dioxide).toEqual({ daily: 25, annual: 10 });
  });

  it("shows that the WHO annual guideline sits inside the US Good band", () => {
    // The uncomfortable comparison: 5 ug/m3 is the WHO annual guideline, and
    // the US index still calls three times that "Good".
    const annual = WHO_GUIDELINE_UGM3.pm2_5!.annual!;
    expect(annual).toBe(5);
    expect(aqiFromBreakpoints(annual, US_PM25_BREAKPOINTS)!.category).toBe("Good");
    expect(aqiFromBreakpoints(9.0, US_PM25_BREAKPOINTS)!.category).toBe("Good");
    expect(9.0 / annual).toBeCloseTo(1.8, 1);
  });

  it("reports multiples of the daily guideline", () => {
    expect(timesWhoDaily(15, "pm2_5")!).toBeCloseTo(1, 9);
    expect(timesWhoDaily(45, "pm2_5")!).toBeCloseTo(3, 9);
    expect(timesWhoDaily(45, "pm10")!).toBeCloseTo(1, 9);
    expect(timesWhoDaily(NaN, "pm2_5")).toBeNull();
    expect(timesWhoDaily(-1, "pm2_5")).toBeNull();
  });
});

describe("parsing the feed", () => {
  const feed = {
    latitude: 42.36,
    longitude: -71.06,
    utc_offset_seconds: 0,
    current: {
      time: "2026-08-20T06:00",
      pm10: 13.3,
      pm2_5: 12.4,
      carbon_monoxide: 200.0,
      nitrogen_dioxide: 15.9,
      sulphur_dioxide: 1.3,
      ozone: 82.0,
      us_aqi: 54,
      european_aqi: 33,
    },
    hourly: {
      time: ["2026-08-20T04:00", "2026-08-20T05:00", "2026-08-20T06:00"],
      pm2_5: [14.4, 12.4, 12.1],
      us_aqi: [77, 71, 61],
      european_aqi: [32, 29, 27],
    },
  };

  it("reads the current reading and the hourly series", () => {
    const s = parseAirQuality(feed);
    expect(s.current!.ugm3.pm2_5).toBe(12.4);
    expect(s.current!.ugm3.ozone).toBe(82.0);
    expect(s.current!.feedUsAqi).toBe(54);
    expect(s.current!.feedEuAqi).toBe(33);
    expect(s.current!.time.toISOString()).toBe("2026-08-20T06:00:00.000Z");
    expect(s.hourly).toHaveLength(3);
    expect(s.latDeg).toBe(42.36);
  });

  it("applies the response's own UTC offset to its zone-less timestamps", () => {
    // Open-Meteo returns local times with no marker. Read as UTC and shifted.
    const s = parseAirQuality({ ...feed, utc_offset_seconds: -14400 });
    expect(s.current!.time.toISOString()).toBe("2026-08-20T10:00:00.000Z");
  });

  it("keeps the hourly series in time order", () => {
    const scrambled = {
      ...feed,
      hourly: {
        time: ["2026-08-20T06:00", "2026-08-20T04:00", "2026-08-20T05:00"],
        pm2_5: [12.1, 14.4, 12.4],
        us_aqi: [61, 77, 71],
        european_aqi: [27, 32, 29],
      },
    };
    const s = parseAirQuality(scrambled);
    const times = s.hourly.map((h) => h.time.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("drops negative concentrations rather than charting them", () => {
    const s = parseAirQuality({
      ...feed,
      current: { ...feed.current, pm2_5: -3 },
    });
    expect(s.current!.ugm3.pm2_5).toBeUndefined();
  });

  it("never throws on garbage and returns an empty series", () => {
    for (const bad of [null, undefined, 42, "nope", {}, { current: 5 }, { hourly: "x" }]) {
      expect(() => parseAirQuality(bad)).not.toThrow();
    }
    expect(parseAirQuality(null).current).toBeNull();
    expect(parseAirQuality({ hourly: { time: ["bad"], pm2_5: [1] } }).hourly).toEqual([]);
  });
});

describe("copy and coverage", () => {
  it("labels and describes every pollutant it can report", () => {
    for (const p of POLLUTANTS) {
      expect(POLLUTANT_LABEL[p].length).toBeGreaterThan(1);
      expect(POLLUTANT_SOURCE[p].length).toBeGreaterThan(40);
      expect(POLLUTANT_SOURCE[p]).not.toContain("—"); // project style: no em-dashes
    }
  });
});

describe("determinism", () => {
  it("gives the same answer for the same air", () => {
    const r: AirReading = {
      time: new Date("2026-08-20T06:00:00Z"),
      ugm3: { pm2_5: 12.4, ozone: 82 },
      feedUsAqi: null,
      feedEuAqi: null,
    };
    expect(verdict(subIndices(r)).usAqi).toBe(verdict(subIndices(r)).usAqi);
  });
});
