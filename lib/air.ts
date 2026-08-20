/**
 * lib/air.ts — the air you are actually breathing, and why two countries would
 * give it two different verdicts.
 *
 * Data: the Open-Meteo Air Quality API (Copernicus CAMS global and European
 * forecasts), keyless and CORS open. It supplies CONCENTRATIONS in micrograms
 * per cubic metre, plus its own us_aqi and european_aqi numbers.
 *
 * WHAT THIS MODULE COMPUTES, and why it does not just print the feed's numbers:
 *
 *  1. The US EPA AQI from the raw concentration, using the published breakpoint
 *     table, so the piecewise-linear transform is visible instead of arriving
 *     as a magic integer.
 *  2. The European EAQI from the same concentration, using the EEA's bands.
 *  3. WHICH POLLUTANT is responsible. Both indices are a MAX over pollutants,
 *     so a single number gives you the severity and hides the cause. The feed
 *     does not say which one won; this does.
 *  4. The conversion between mass concentration and mixing ratio, which is
 *     where a great deal of published air-quality confusion comes from.
 *  5. The WHO guideline comparison, which is the anchor that actually matters:
 *     an index says "moderate", a guideline says how far above the level the
 *     WHO considers safe you are.
 *
 * THE LOAD-BEARING POINT of this tab is that an air quality index is not a
 * measurement. It is a national policy judgement wrapped around a measurement.
 * The same 12 micrograms of PM2.5 is "Moderate, sensitive groups should take
 * care" on the US scale and comfortably "Fair" on the European one, because the
 * two scales draw their lines in different places for different reasons.
 * Neither is lying. The number is not a property of the air.
 *
 * Null-safety contract, as everywhere else: bad input returns null, nothing
 * throws.
 */

import { parseUtcTimestamp } from "./utils";

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ─────────────────────────── pollutants and units ───────────────────────────

export type Pollutant =
  | "pm2_5"
  | "pm10"
  | "ozone"
  | "nitrogen_dioxide"
  | "sulphur_dioxide"
  | "carbon_monoxide";

export const POLLUTANTS: readonly Pollutant[] = [
  "pm2_5",
  "pm10",
  "ozone",
  "nitrogen_dioxide",
  "sulphur_dioxide",
  "carbon_monoxide",
];

export const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm2_5: "PM2.5",
  pm10: "PM10",
  ozone: "Ozone",
  nitrogen_dioxide: "Nitrogen dioxide",
  sulphur_dioxide: "Sulphur dioxide",
  carbon_monoxide: "Carbon monoxide",
};

/**
 * What each pollutant usually means when it is the one driving the index. Named
 * because "AQI 87" tells you nothing about what to do, and "ozone, mid
 * afternoon in summer" tells you quite a lot.
 */
export const POLLUTANT_SOURCE: Record<Pollutant, string> = {
  pm2_5:
    "Combustion particles small enough to reach deep into the lungs: wildfire smoke, wood burning, diesel, and secondary particles formed in the air itself.",
  pm10:
    "Coarser dust: road and brake wear, construction, agriculture, and blown desert dust that can travel across continents.",
  ozone:
    "Not emitted directly. It is cooked out of traffic and industrial emissions by sunlight, which is why it peaks on hot sunny afternoons and is often worse downwind of a city than in it.",
  nitrogen_dioxide:
    "Mostly traffic and combustion, close to the source. A morning and evening peak beside a busy road is the classic signature.",
  sulphur_dioxide:
    "Sulphur in fuel and ore: coal burning, heavy shipping, smelters, and volcanoes.",
  carbon_monoxide:
    "Incomplete combustion. Outdoors it is rarely the pollutant that matters; indoors it is the one that kills.",
};

/**
 * Molar masses [g/mol], for converting between a mass concentration and a
 * mixing ratio. Particulates have no molar mass: PM2.5 is a SIZE CLASS, not a
 * substance, which is exactly why it is only ever quoted in micrograms per
 * cubic metre and never in parts per billion.
 */
export const MOLAR_MASS_G_PER_MOL: Partial<Record<Pollutant, number>> = {
  ozone: 48.0,
  nitrogen_dioxide: 46.0055,
  sulphur_dioxide: 64.066,
  carbon_monoxide: 28.01,
};

/**
 * Molar volume of an ideal gas at 25 C and 1013.25 hPa [litres/mol]. This is
 * the reference state the US EPA uses. Europe often quotes 20 C, which shifts
 * every converted number by about 1.7%: a small error, but it is the reason two
 * published figures for the same air can differ without either being wrong.
 */
export const MOLAR_VOLUME_L = 24.45;

/**
 * Mass concentration [ug/m3] to mixing ratio [ppb]: ppb = ugm3 * Vm / M.
 *
 * Returns null for particulates, which have no molar mass, rather than
 * inventing one.
 */
export function ugm3ToPpb(ugm3: number, pollutant: Pollutant): number | null {
  const m = MOLAR_MASS_G_PER_MOL[pollutant];
  if (!finite(ugm3) || ugm3 < 0 || !finite(m) || m <= 0) return null;
  return (ugm3 * MOLAR_VOLUME_L) / m;
}

/** The inverse: mixing ratio [ppb] to mass concentration [ug/m3]. */
export function ppbToUgm3(ppb: number, pollutant: Pollutant): number | null {
  const m = MOLAR_MASS_G_PER_MOL[pollutant];
  if (!finite(ppb) || ppb < 0 || !finite(m) || m <= 0) return null;
  return (ppb * m) / MOLAR_VOLUME_L;
}

// ───────────────────────────── the US EPA AQI ───────────────────────────────

export type UsCategory =
  | "Good"
  | "Moderate"
  | "Unhealthy for sensitive groups"
  | "Unhealthy"
  | "Very unhealthy"
  | "Hazardous";

export interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
  category: UsCategory;
}

/**
 * US EPA PM2.5 breakpoints [ug/m3], as revised in the 2024 reconsideration of
 * the particulate standard: the Good band used to end at 12.0 and now ends at
 * 9.0. Defined on a 24-HOUR average (see AVERAGING_WINDOW_NOTE).
 */
export const US_PM25_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50, category: "Good" },
  { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100, category: "Moderate" },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150, category: "Unhealthy for sensitive groups" },
  { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200, category: "Unhealthy" },
  { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300, category: "Very unhealthy" },
  { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 500, category: "Hazardous" },
];

/** US EPA PM10 breakpoints [ug/m3], 24-hour average. */
export const US_PM10_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50, category: "Good" },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100, category: "Moderate" },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150, category: "Unhealthy for sensitive groups" },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200, category: "Unhealthy" },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300, category: "Very unhealthy" },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500, category: "Hazardous" },
];

/** US EPA 8-hour ozone breakpoints, in PPB. */
export const US_OZONE_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50, category: "Good" },
  { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100, category: "Moderate" },
  { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150, category: "Unhealthy for sensitive groups" },
  { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200, category: "Unhealthy" },
  { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300, category: "Very unhealthy" },
];

/** US EPA 1-hour nitrogen dioxide breakpoints, in PPB. */
export const US_NO2_BREAKPOINTS: readonly Breakpoint[] = [
  { cLow: 0, cHigh: 53, iLow: 0, iHigh: 50, category: "Good" },
  { cLow: 54, cHigh: 100, iLow: 51, iHigh: 100, category: "Moderate" },
  { cLow: 101, cHigh: 360, iLow: 101, iHigh: 150, category: "Unhealthy for sensitive groups" },
  { cLow: 361, cHigh: 649, iLow: 151, iHigh: 200, category: "Unhealthy" },
  { cLow: 650, cHigh: 1249, iLow: 201, iHigh: 300, category: "Very unhealthy" },
  { cLow: 1250, cHigh: 2049, iLow: 301, iHigh: 500, category: "Hazardous" },
];

/**
 * The EPA index equation: a straight line inside each band.
 *
 *   I = (iHigh - iLow) / (cHigh - cLow) * (C - cLow) + iLow
 *
 * That is the whole of it. An AQI is not a health model, it is a lookup table
 * with linear interpolation between the rows, and the rows are policy.
 */
export function aqiFromBreakpoints(
  concentration: number,
  table: readonly Breakpoint[]
): { aqi: number; category: UsCategory } | null {
  if (!finite(concentration) || concentration < 0 || table.length === 0) return null;

  const top = table[table.length - 1];
  if (concentration > top.cHigh) {
    // Above the table the EPA caps the published index rather than
    // extrapolating, and so do we: past the last row the number stops meaning
    // anything more precise than "worse than the worst band".
    return { aqi: top.iHigh, category: top.category };
  }
  for (const b of table) {
    if (concentration >= b.cLow && concentration <= b.cHigh) {
      const aqi =
        ((b.iHigh - b.iLow) / (b.cHigh - b.cLow)) * (concentration - b.cLow) + b.iLow;
      return { aqi: Math.round(aqi), category: b.category };
    }
  }
  // The published tables are written with truncated edges (9.0 then 9.1), which
  // leaves hairline gaps. A concentration landing in one belongs to the band
  // below it, not to nothing.
  for (let i = 0; i < table.length - 1; i++) {
    if (concentration > table[i].cHigh && concentration < table[i + 1].cLow) {
      return { aqi: table[i].iHigh, category: table[i].category };
    }
  }
  return null;
}

// ─────────────────────────── the European EAQI ──────────────────────────────

export type EuCategory =
  | "Good"
  | "Fair"
  | "Moderate"
  | "Poor"
  | "Very poor"
  | "Extremely poor";

export const EU_CATEGORIES: readonly EuCategory[] = [
  "Good",
  "Fair",
  "Moderate",
  "Poor",
  "Very poor",
  "Extremely poor",
];

/**
 * European Environment Agency EAQI band edges [ug/m3]: the five upper edges of
 * the first five bands, with anything above the last being "Extremely poor".
 *
 * Note the shape of the difference from the US index. The EAQI is a BAND, not a
 * 0-500 score: the published product is the name of the band, and any numeric
 * scale attached to it is a presentation choice rather than part of the
 * standard.
 */
export const EU_BANDS: Partial<Record<Pollutant, readonly number[]>> = {
  pm2_5: [10, 20, 25, 50, 75],
  pm10: [20, 40, 50, 100, 150],
  ozone: [50, 100, 130, 240, 380],
  nitrogen_dioxide: [40, 90, 120, 230, 340],
  sulphur_dioxide: [100, 200, 350, 500, 750],
};

export function euBand(
  concentration: number,
  pollutant: Pollutant
): { index: number; category: EuCategory } | null {
  const bands = EU_BANDS[pollutant];
  if (!finite(concentration) || concentration < 0 || !bands) return null;
  for (let i = 0; i < bands.length; i++) {
    if (concentration <= bands[i]) return { index: i, category: EU_CATEGORIES[i] };
  }
  return { index: 5, category: "Extremely poor" };
}

// ─────────────────────── WHO guidelines, the real anchor ────────────────────

/**
 * WHO 2021 Global Air Quality Guidelines [ug/m3]. Health-based recommendations,
 * not a scale and not a legal limit, and markedly stricter than most national
 * standards: the annual PM2.5 guideline of 5 sits well inside the band the US
 * index still calls "Good".
 */
export const WHO_GUIDELINE_UGM3: Partial<
  Record<Pollutant, { daily?: number; annual?: number }>
> = {
  pm2_5: { daily: 15, annual: 5 },
  pm10: { daily: 45, annual: 15 },
  nitrogen_dioxide: { daily: 25, annual: 10 },
  sulphur_dioxide: { daily: 40 },
  ozone: { daily: 100 },
  carbon_monoxide: { daily: 4000 },
};

/** How many times the WHO daily guideline a concentration is. */
export function timesWhoDaily(
  concentration: number,
  pollutant: Pollutant
): number | null {
  const g = WHO_GUIDELINE_UGM3[pollutant]?.daily;
  if (!finite(concentration) || concentration < 0 || !finite(g) || g <= 0) return null;
  return concentration / g;
}

// ──────────────────────────── the feed, parsed ──────────────────────────────

export interface AirReading {
  time: Date;
  /** micrograms per cubic metre, by pollutant */
  ugm3: Partial<Record<Pollutant, number>>;
  /** the feed's own indices, kept for comparison and never used as our answer */
  feedUsAqi: number | null;
  feedEuAqi: number | null;
}

export interface AirHour {
  time: Date;
  pm2_5: number | null;
  usAqi: number | null;
  euAqi: number | null;
}

export interface AirSeries {
  current: AirReading | null;
  hourly: AirHour[];
  latDeg: number | null;
  lonDeg: number | null;
}

const EMPTY_SERIES: AirSeries = { current: null, hourly: [], latDeg: null, lonDeg: null };

/**
 * Open-Meteo timestamps are local to the queried point and carry no zone
 * marker, so they are read as UTC and then shifted by the offset the response
 * states. Validated rather than handed to `new Date`, for the reasons in
 * lib/utils.
 */
function parseLocalTime(v: unknown, utcOffsetSeconds: number): Date | null {
  const asUtc = parseUtcTimestamp(v);
  if (!asUtc) return null;
  return new Date(asUtc.getTime() - utcOffsetSeconds * 1000);
}

export function parseAirQuality(raw: unknown): AirSeries {
  if (!raw || typeof raw !== "object") return EMPTY_SERIES;
  const root = raw as Record<string, unknown>;
  const off = finite(root.utc_offset_seconds) ? root.utc_offset_seconds : 0;

  let current: AirReading | null = null;
  if (root.current && typeof root.current === "object") {
    const cur = root.current as Record<string, unknown>;
    const time = parseLocalTime(cur.time, off);
    if (time) {
      const ugm3: Partial<Record<Pollutant, number>> = {};
      for (const p of POLLUTANTS) {
        if (finite(cur[p]) && (cur[p] as number) >= 0) ugm3[p] = cur[p] as number;
      }
      current = {
        time,
        ugm3,
        feedUsAqi: finite(cur.us_aqi) ? cur.us_aqi : null,
        feedEuAqi: finite(cur.european_aqi) ? cur.european_aqi : null,
      };
    }
  }

  const hourly: AirHour[] = [];
  if (root.hourly && typeof root.hourly === "object") {
    const h = root.hourly as Record<string, unknown>;
    const times = Array.isArray(h.time) ? h.time : [];
    const pm = Array.isArray(h.pm2_5) ? h.pm2_5 : [];
    const us = Array.isArray(h.us_aqi) ? h.us_aqi : [];
    const eu = Array.isArray(h.european_aqi) ? h.european_aqi : [];
    for (let i = 0; i < times.length; i++) {
      const t = parseLocalTime(times[i], off);
      if (!t) continue;
      hourly.push({
        time: t,
        pm2_5: finite(pm[i]) ? (pm[i] as number) : null,
        usAqi: finite(us[i]) ? (us[i] as number) : null,
        euAqi: finite(eu[i]) ? (eu[i] as number) : null,
      });
    }
    hourly.sort((a, b) => a.time.getTime() - b.time.getTime());
  }

  return {
    current,
    hourly,
    latDeg: finite(root.latitude) ? root.latitude : null,
    lonDeg: finite(root.longitude) ? root.longitude : null,
  };
}

// ───────────────────── the verdict, and who is responsible ──────────────────

export interface SubIndex {
  pollutant: Pollutant;
  ugm3: number;
  /** the mixing ratio, where the pollutant is a gas */
  ppb: number | null;
  usAqi: number | null;
  usCategory: UsCategory | null;
  euIndex: number | null;
  euCategory: EuCategory | null;
  /** multiples of the WHO daily guideline, where one exists */
  timesWho: number | null;
}

/**
 * Every pollutant's sub-index, which is the thing a single index number throws
 * away.
 *
 * Ozone and nitrogen dioxide are converted to ppb first, because the US tables
 * are written in mixing ratio while the feed reports mass concentration.
 * Getting that the wrong way round is a factor-of-two error that still produces
 * a plausible-looking number, which is the worst kind.
 */
export function subIndices(reading: AirReading | null): SubIndex[] {
  if (!reading) return [];
  const out: SubIndex[] = [];

  for (const p of POLLUTANTS) {
    const ugm3 = reading.ugm3[p];
    if (!finite(ugm3)) continue;
    const ppb = ugm3ToPpb(ugm3, p);

    let us: { aqi: number; category: UsCategory } | null = null;
    if (p === "pm2_5") us = aqiFromBreakpoints(ugm3, US_PM25_BREAKPOINTS);
    else if (p === "pm10") us = aqiFromBreakpoints(ugm3, US_PM10_BREAKPOINTS);
    else if (p === "ozone" && ppb !== null) us = aqiFromBreakpoints(ppb, US_OZONE_BREAKPOINTS);
    else if (p === "nitrogen_dioxide" && ppb !== null)
      us = aqiFromBreakpoints(ppb, US_NO2_BREAKPOINTS);

    const eu = euBand(ugm3, p);
    out.push({
      pollutant: p,
      ugm3,
      ppb,
      usAqi: us ? us.aqi : null,
      usCategory: us ? us.category : null,
      euIndex: eu ? eu.index : null,
      euCategory: eu ? eu.category : null,
      timesWho: timesWhoDaily(ugm3, p),
    });
  }
  return out;
}

export interface AirVerdict {
  /** the overall US AQI: the WORST sub-index, as the EPA defines it */
  usAqi: number | null;
  usCategory: UsCategory | null;
  usDriver: Pollutant | null;
  /** the overall European band: also the worst */
  euIndex: number | null;
  euCategory: EuCategory | null;
  euDriver: Pollutant | null;
  /** do the two scales put this air on opposite sides of their cleanest band? */
  scalesDisagree: boolean;
}

/**
 * The overall verdict on both scales.
 *
 * Both indices are defined as the MAXIMUM over pollutants, not an average, and
 * that is deliberate: a health warning should be about the worst thing in the
 * air, not a blend. It also means the number is silent about which pollutant it
 * is describing, which is why the driver is reported alongside it.
 */
export function verdict(subs: SubIndex[]): AirVerdict {
  let usAqi: number | null = null;
  let usCategory: UsCategory | null = null;
  let usDriver: Pollutant | null = null;
  let euIndex: number | null = null;
  let euCategory: EuCategory | null = null;
  let euDriver: Pollutant | null = null;

  for (const s of subs) {
    if (s.usAqi !== null && (usAqi === null || s.usAqi > usAqi)) {
      usAqi = s.usAqi;
      usCategory = s.usCategory;
      usDriver = s.pollutant;
    }
    if (s.euIndex !== null && (euIndex === null || s.euIndex > euIndex)) {
      euIndex = s.euIndex;
      euCategory = s.euCategory;
      euDriver = s.pollutant;
    }
  }

  // "Disagree" means the two scales land this air on opposite sides of their own
  // cleanest band: one says nothing to think about, the other does not.
  const usClean = usAqi !== null && usAqi <= 50;
  const euClean = euIndex !== null && euIndex === 0;

  return {
    usAqi,
    usCategory,
    usDriver,
    euIndex,
    euCategory,
    euDriver,
    scalesDisagree: usAqi !== null && euIndex !== null && usClean !== euClean,
  };
}

// ─────────────────────────────── honesty copy ───────────────────────────────

export const INDEX_IS_POLICY_NOTE =
  "An air quality index is not a measurement. It is a national policy judgement wrapped around a measurement: a lookup table with straight lines drawn between the rows, and the rows are chosen by regulators. That is why the same air can be 'Moderate, sensitive groups take care' on the US scale and comfortably 'Fair' on the European one. Neither is lying, and the number is not a property of the air.";

export const MODEL_NOT_MONITOR_NOTE =
  "These are MODELLED concentrations from the Copernicus atmosphere forecast, not a sensor at your address. The grid is kilometres wide, so a busy road, a wood stove or a still valley can put the air you are actually breathing well above or below this. Treat it as the regional background, not a personal exposure reading.";

export const AVERAGING_WINDOW_NOTE =
  "The US PM2.5 index is defined on a 24-HOUR average, and what is shown here is an hourly value pushed through the same table. During a fast-moving smoke plume that reads high sooner than the official index would, and it recovers sooner too. The shape is right; the exact number is not the one an agency would publish.";

export const MAX_NOT_MEAN_NOTE =
  "Both indices take the WORST pollutant rather than an average, which is the right choice for a health warning and a poor one for understanding the air. A single index number cannot tell you whether you are looking at traffic, wildfire smoke or a summer ozone episode, so the pollutant responsible is named next to it.";

export const WHO_ANCHOR_NOTE =
  "The WHO 2021 guidelines are the anchor worth watching, because they are health-based rather than a scale. The annual PM2.5 guideline is 5 micrograms per cubic metre, which is below the level the US index still calls 'Good'. Most of the world's population lives above it.";

export const NO_CIGARETTES_NOTE =
  "Deliberately not shown: a conversion into cigarettes. The widely quoted 'one cigarette per 22 micrograms' rule was built for one specific comparison in one paper, not as a dose model, and it does not survive being applied to an hourly reading in a place with different pollution chemistry.";
