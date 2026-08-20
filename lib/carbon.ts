/**
 * lib/carbon.ts — the Keeling curve, and what its wobble is.
 *
 * Data: NOAA Global Monitoring Laboratory monthly means, committed rather than
 * fetched live (no CORS headers, and a monthly mean is a state revised on
 * reanalysis rather than a list of events):
 *
 *   co2_mlo    Mauna Loa CO2, 1958 onwards, the longest direct record there is
 *   co2_glob   globally averaged marine surface CO2, 1979 onwards
 *   ch4_glob   globally averaged methane, 1983 onwards
 *
 * THE LOAD-BEARING IDEA of this tab is that the sawtooth on the Keeling curve
 * is the biosphere breathing, and the measured numbers say something sharper
 * than the usual telling.
 *
 * Mauna Loa sits at 19 degrees north and its CO2 swings about 6.5 ppm every
 * year: down through the northern summer as leaves grow, up again through the
 * northern winter as they rot. The obvious guess is that a GLOBAL average would
 * cancel most of that, since the southern hemisphere breathes in antiphase.
 * Measured, it does not. The global marine average still swings about 4.4 ppm,
 * only a third less, and peaks a month earlier.
 *
 * The reason is that the hemispheres are not symmetric. Most of the world's
 * land, and so most of its vegetation, lies north of the equator, and the
 * southern cycle is both weaker and offset, so it trims the northern signal
 * rather than cancelling it. What that leaves is worth sitting with: the
 * northern spring is visible in the average CO2 of the entire planet.
 *
 * Null-safety contract, as everywhere else: bad input returns null or an empty
 * array, and nothing throws.
 */

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ─────────────────────────────── the series ─────────────────────────────────

export type GasSeriesId = "co2_mlo" | "co2_glob" | "ch4_glob";

export interface GasSeries {
  id: GasSeriesId;
  label: string;
  /** ppm for CO2, ppb for CH4 */
  unit: "ppm" | "ppb";
  /** decimal year of each sample, for plotting */
  time: number[];
  years: number[];
  months: number[];
  /** the monthly mean as measured */
  value: number[];
  /** NOAA's own seasonally adjusted series, index-aligned */
  trend: Array<number | null>;
  note: string;
}

export interface CarbonData {
  co2_mlo: GasSeries | null;
  co2_glob: GasSeries | null;
  ch4_glob: GasSeries | null;
  generated: Date | null;
}

const SERIES_META: Record<GasSeriesId, { label: string; note: string }> = {
  co2_mlo: {
    label: "CO₂ at Mauna Loa",
    note: "One station at 19.5 degrees north, 3,400 m up a Hawaiian volcano, chosen because the air arriving there has been over open ocean for days and carries no local city plume. Downwind of the whole northern landmass, so the seasonal cycle is large.",
  },
  co2_glob: {
    label: "CO₂ globally averaged",
    note: "Marine surface sites in both hemispheres. Averaging across the equator trims the seasonal cycle by about a third rather than cancelling it, because most of the world's land, and so most of its vegetation, lies north of the equator.",
  },
  ch4_glob: {
    label: "Methane globally averaged",
    note: "Quoted in parts per BILLION, a thousand times smaller than CO2 in abundance, and far stronger per molecule. Its growth stalled between about 1999 and 2006 and then resumed, which is visible in the curve and still not fully explained.",
  },
};

function parseSeries(id: GasSeriesId, raw: unknown): GasSeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const years = Array.isArray(r.years) ? r.years : [];
  const months = Array.isArray(r.months) ? r.months : [];
  const value = Array.isArray(r.value) ? r.value : [];
  const trendRaw = Array.isArray(r.trend) ? r.trend : [];
  const unit = r.unit === "ppb" ? "ppb" : "ppm";

  const n = years.length;
  if (n === 0 || months.length !== n || value.length !== n) return null;

  const okYears: number[] = [];
  const okMonths: number[] = [];
  const okValue: number[] = [];
  const okTrend: Array<number | null> = [];
  const okTime: number[] = [];

  for (let i = 0; i < n; i++) {
    // Drop a row whose value is unusable, but keep the arrays aligned: keeping
    // the year while dropping the value would slide every later month onto the
    // wrong date.
    if (!finite(years[i]) || !finite(months[i]) || !finite(value[i])) continue;
    const y = years[i] as number;
    const m = months[i] as number;
    if (m < 1 || m > 12) continue;
    okYears.push(y);
    okMonths.push(m);
    okValue.push(value[i] as number);
    okTrend.push(finite(trendRaw[i]) ? (trendRaw[i] as number) : null);
    // mid-month decimal year
    okTime.push(y + (m - 0.5) / 12);
  }
  if (okYears.length === 0) return null;

  return {
    id,
    unit,
    years: okYears,
    months: okMonths,
    value: okValue,
    trend: okTrend,
    time: okTime,
    ...SERIES_META[id],
  };
}

export function parseCarbon(raw: unknown): CarbonData {
  const empty: CarbonData = {
    co2_mlo: null,
    co2_glob: null,
    ch4_glob: null,
    generated: null,
  };
  if (!raw || typeof raw !== "object") return empty;
  const root = raw as Record<string, unknown>;
  const meta = (root.meta ?? {}) as Record<string, unknown>;
  const gen = typeof meta.generated === "string" ? new Date(meta.generated) : null;
  return {
    co2_mlo: parseSeries("co2_mlo", root.co2_mlo),
    co2_glob: parseSeries("co2_glob", root.co2_glob),
    ch4_glob: parseSeries("ch4_glob", root.ch4_glob),
    generated: gen && Number.isFinite(gen.getTime()) ? gen : null,
  };
}

// ───────────────────── the seasonal cycle: the biosphere ────────────────────

/**
 * A 12-month centred moving average, which is the simplest honest way to remove
 * an annual cycle: average exactly one year and the cycle sums to zero whatever
 * its shape.
 *
 * Endpoints are null rather than padded. Half a window is not a year, so
 * averaging it would leave part of the seasonal cycle in the "trend" and the
 * curve would develop a spurious wiggle at each end, which is exactly the kind
 * of artefact that gets read as a real feature.
 */
export function centredMovingAverage(
  values: readonly number[],
  window = 12
): Array<number | null> {
  const out: Array<number | null> = [];
  if (!Array.isArray(values) || !finite(window) || window < 2) {
    return values.map(() => null);
  }
  const half = Math.floor(window / 2);
  for (let i = 0; i < values.length; i++) {
    // For an even window, weight the two half-months at each edge by a half, so
    // the window really is centred on the sample rather than half a step off.
    const lo = i - half;
    const hi = i + half;
    if (lo < 0 || hi >= values.length) {
      out.push(null);
      continue;
    }
    let sum = 0;
    let weight = 0;
    for (let j = lo; j <= hi; j++) {
      const w = window % 2 === 0 && (j === lo || j === hi) ? 0.5 : 1;
      if (!finite(values[j])) {
        weight = -1;
        break;
      }
      sum += values[j] * w;
      weight += w;
    }
    out.push(weight > 0 ? sum / weight : null);
  }
  return out;
}

export interface SeasonalCycle {
  /** mean detrended departure for each calendar month, January first */
  byMonth: Array<number | null>;
  /** peak-to-trough size */
  amplitude: number;
  /** calendar month of the maximum, 1-12 */
  peakMonth: number;
  /** calendar month of the minimum, 1-12 */
  troughMonth: number;
  /** how many years contributed */
  years: number;
}

/**
 * The average seasonal cycle: detrend with a 12-month centred average, then
 * take the mean departure for each calendar month.
 *
 * Restricting to recent decades matters, because the amplitude at Mauna Loa has
 * itself been growing as the northern biosphere has become more productive, so
 * averaging the whole record understates the cycle today.
 */
export function seasonalCycle(
  series: GasSeries | null,
  fromYear?: number
): SeasonalCycle | null {
  if (!series) return null;
  const smooth = centredMovingAverage(series.value, 12);

  const sums = new Array<number>(12).fill(0);
  const counts = new Array<number>(12).fill(0);
  const yearsSeen = new Set<number>();

  for (let i = 0; i < series.value.length; i++) {
    const base = smooth[i];
    if (base === null) continue;
    if (finite(fromYear) && series.years[i] < fromYear) continue;
    const m = series.months[i] - 1;
    sums[m] += series.value[i] - base;
    counts[m] += 1;
    yearsSeen.add(series.years[i]);
  }

  const byMonth = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : null));
  const usable = byMonth.filter((v): v is number => v !== null);
  if (usable.length < 12) return null;

  let peakMonth = 1;
  let troughMonth = 1;
  for (let m = 0; m < 12; m++) {
    if ((byMonth[m] as number) > (byMonth[peakMonth - 1] as number)) peakMonth = m + 1;
    if ((byMonth[m] as number) < (byMonth[troughMonth - 1] as number)) troughMonth = m + 1;
  }

  return {
    byMonth,
    amplitude: Math.max(...usable) - Math.min(...usable),
    peakMonth,
    troughMonth,
    years: yearsSeen.size,
  };
}

// ─────────────────────────── growth, and its change ─────────────────────────

/**
 * Annual mean for a calendar year, or null unless every month is present. A
 * partial year averaged as though it were whole would sit on the seasonal cycle
 * rather than on the trend, which for a mid-year cut is a bias of several ppm.
 */
export function annualMean(series: GasSeries | null, year: number): number | null {
  if (!series || !finite(year)) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < series.years.length; i++) {
    if (series.years[i] === year) {
      sum += series.value[i];
      n++;
    }
  }
  return n === 12 ? sum / n : null;
}

/** Year-over-year increase in the annual mean [unit per year]. */
export function annualGrowth(series: GasSeries | null, year: number): number | null {
  const a = annualMean(series, year - 1);
  const b = annualMean(series, year);
  if (a === null || b === null) return null;
  return b - a;
}

export interface DecadeGrowth {
  /** first year of the decade, e.g. 1960 */
  decade: number;
  /** mean annual growth over the decade [unit per year] */
  perYear: number;
  /** how many yearly increments were available */
  n: number;
}

/**
 * Mean growth rate per decade, which is where the acceleration shows up. At
 * Mauna Loa the 1960s ran under 1 ppm a year and the 2010s over 2.
 */
export function growthByDecade(series: GasSeries | null): DecadeGrowth[] {
  if (!series) return [];
  const firstYear = series.years[0];
  const lastYear = series.years[series.years.length - 1];
  const out: DecadeGrowth[] = [];

  for (let d = Math.ceil(firstYear / 10) * 10; d <= lastYear; d += 10) {
    let sum = 0;
    let n = 0;
    for (let y = d; y < d + 10; y++) {
      const g = annualGrowth(series, y);
      if (g !== null) {
        sum += g;
        n++;
      }
    }
    // Require most of a decade, so a decade in progress is not compared against
    // full ones on the strength of two years.
    if (n >= 5) out.push({ decade: d, perYear: sum / n, n });
  }
  return out;
}

// ──────────────────── the two-station comparison, the exhibit ───────────────

export interface AmplitudeComparison {
  /** the single-station cycle */
  stationAmplitude: number;
  /** the globally averaged cycle over the same years */
  globalAmplitude: number;
  /** how many times larger the station's swing is */
  ratio: number;
  /** the years both series cover */
  from: number;
  to: number;
  stationPeakMonth: number;
  globalPeakMonth: number;
}

/**
 * Compare the seasonal swing at one station against the global average over the
 * SAME years.
 *
 * The result is not the one the textbook telling implies. A single northern
 * station swings about 1.45 times as much as the whole-planet average, not
 * several times over: the southern hemisphere trims the northern biosphere's
 * signal rather than cancelling it, because that is where almost none of the
 * land is.
 *
 * Restricting both to their overlapping years matters: Mauna Loa starts in 1958
 * and the global series in 1979, and comparing different eras would confound the
 * slowly growing amplitude with the geography.
 */
export function compareAmplitude(
  station: GasSeries | null,
  global: GasSeries | null
): AmplitudeComparison | null {
  if (!station || !global) return null;
  const from = Math.max(station.years[0], global.years[0]);
  const to = Math.min(
    station.years[station.years.length - 1],
    global.years[global.years.length - 1]
  );
  if (!(to > from)) return null;

  const s = seasonalCycle(station, from);
  const g = seasonalCycle(global, from);
  if (!s || !g || g.amplitude <= 0) return null;

  return {
    stationAmplitude: s.amplitude,
    globalAmplitude: g.amplitude,
    ratio: s.amplitude / g.amplitude,
    from,
    to,
    stationPeakMonth: s.peakMonth,
    globalPeakMonth: g.peakMonth,
  };
}

// ──────────────────────── pre-industrial, and multiples ─────────────────────

/**
 * Pre-industrial CO2, from Antarctic ice cores: air trapped in bubbles, dated by
 * the layers above it. 280 ppm is the conventional round figure for the late
 * Holocene before industrialisation, and it is a MEASUREMENT rather than a
 * model, from a different technique than the instrumental record.
 */
export const PREINDUSTRIAL_CO2_PPM = 280;

/** Pre-industrial methane, same ice cores, about 722 ppb (IPCC AR6). */
export const PREINDUSTRIAL_CH4_PPB = 722;

/** How many times pre-industrial a concentration is. */
export function timesPreindustrial(
  value: number,
  gas: "co2" | "ch4"
): number | null {
  if (!finite(value) || value <= 0) return null;
  const base = gas === "co2" ? PREINDUSTRIAL_CO2_PPM : PREINDUSTRIAL_CH4_PPB;
  return value / base;
}

// ───────────────── methane potency, and the horizon convention ──────────────

/**
 * Global warming potential for methane, from IPCC AR6 Table 7.15 (fossil
 * methane, including the climate-carbon feedback).
 *
 * THIS IS THE SECOND "the number is a convention" exhibit in the app, after the
 * temperature baseline and the air quality index. A GWP is a ratio of
 * integrated forcing over a CHOSEN time horizon, and methane's answer depends
 * enormously on that choice because it only lasts about a decade in the air
 * while CO2 lasts centuries. Over 20 years a tonne of methane does about 80
 * times the work of a tonne of CO2; over 100 years, about 28. Neither number is
 * wrong. Quoting one without its horizon is what is wrong.
 */
export const METHANE_GWP: readonly { horizonYears: number; gwp: number; note: string }[] = [
  {
    horizonYears: 20,
    gwp: 79.7,
    note: "The horizon that matters for the next few decades, and the one that makes methane look like the emergency it is.",
  },
  {
    horizonYears: 100,
    gwp: 27.9,
    note: "The convention used in national inventories and the Kyoto framework, chosen partly by precedent rather than physics.",
  },
  {
    horizonYears: 500,
    gwp: 7.95,
    note: "Long enough that most of the methane is gone and the comparison mostly reflects its CO2 breakdown product.",
  },
];

/** Interpolating a GWP is meaningless; the published horizons are the answer. */
export function methaneGwp(horizonYears: number): number | null {
  if (!finite(horizonYears)) return null;
  const hit = METHANE_GWP.find((g) => g.horizonYears === horizonYears);
  return hit ? hit.gwp : null;
}

// ─────────────────────────────── honesty copy ───────────────────────────────

export const SAWTOOTH_NOTE =
  "The wobble is the biosphere breathing. Northern forests and croplands pull CO2 out of the air as they leaf out in spring and give it back as the leaves rot in autumn, so at Mauna Loa the concentration falls through the northern summer and rises through the northern winter. The whole planet's vegetation exhales and inhales once a year, and this is the shape of it.";

/**
 * Why each series has the seasonal cycle it has, and what the peak and trough
 * months mean, PER SERIES.
 *
 * This exists because the first version of the tab reused the CO2 vegetation
 * explanation under the methane chart, which was simply false: methane's cycle
 * is set mainly by its SINK rather than by leaf-out, and it peaks in the
 * northern winter for a different reason entirely. Handing a reader the wrong
 * mechanism is worse than handing them no mechanism, so the copy is keyed to
 * the series and a test asserts the CO2 wording never appears under CH4.
 */
export const SEASONAL_COPY: Record<
  GasSeriesId,
  { note: string; peakReason: string; troughReason: string }
> = {
  co2_mlo: {
    note: SAWTOOTH_NOTE,
    peakReason: "just before the northern spring draws the gas down",
    troughReason: "the end of the northern growing season",
  },
  co2_glob: {
    note: "The same vegetation cycle, averaged over marine sites in both hemispheres. It survives the averaging because most of the world's land is north of the equator, and it runs about a month ahead of Mauna Loa because a global mean weights latitudes that turn earlier.",
    peakReason: "about a month ahead of the single-station peak",
    troughReason: "the end of the northern growing season",
  },
  ch4_glob: {
    note: "Methane's cycle is set mainly by how it is DESTROYED rather than by how it is emitted. It is broken down by the hydroxyl radical, which sunlight makes, so the sink is strongest in the northern summer and the concentration bottoms out in late summer. That is a different mechanism from the CO2 sawtooth above, and the two should not be read as the same picture: the measured timing here is consistent with the sink explanation, which this tab reports rather than proves.",
    peakReason: "the season of the weakest sink, not of peak emission",
    troughReason: "when sunlight has made the most hydroxyl to destroy it",
  },
};

export const AMPLITUDE_NOTE =
  "The obvious guess is that averaging the whole planet would cancel the sawtooth, since the southern hemisphere breathes in antiphase. Measured, it does not. Mauna Loa swings about 6.5 ppm a year and the global marine average still swings about 4.4, only a third less, peaking a month earlier. The hemispheres are not symmetric: most of the world's land is north of the equator, so the southern cycle trims the northern signal rather than cancelling it. The northern spring is visible in the average CO2 of the entire planet.";

export const MEASUREMENT_NOTE =
  "These are direct measurements, not a model and not a reconstruction: flasks and infrared analysers, calibrated against reference gases, at a station chosen because its air has spent days over open ocean. The Mauna Loa record is the longest of its kind and began in 1958 with Charles David Keeling.";

export const ICE_CORE_NOTE =
  "The pre-industrial figure of 280 ppm comes from a different technique entirely: air trapped in Antarctic ice, dated by the layers above it. Two independent methods, and where they overlap in the 20th century they agree, which is why the comparison is worth making at all.";

export const SMOOTHING_NOTE =
  "The seasonally adjusted line is a 12-month centred average, which is the simplest honest way to remove an annual cycle: average exactly one year and the cycle sums to zero whatever its shape. The first and last six months are left blank rather than padded, because half a window is not a year and padding it would put a spurious wiggle at each end that reads as a real feature.";

export const GWP_HORIZON_NOTE =
  "Methane's potency is a choice of time horizon, not a fact. It survives about a decade in the atmosphere while CO2 lasts centuries, so over 20 years a tonne of methane does roughly 80 times the work of a tonne of CO2, and over 100 years roughly 28. National inventories use the 100-year figure largely by precedent. Neither number is wrong; quoting either without saying which horizon it is, is.";

export const NO_FORECAST_NOTE =
  "No projection. Extending a curve like this forwards requires assumptions about emissions, economics and policy that are not in the data, and the arithmetic of 'at the current rate we reach X in year Y' quietly assumes the rate stays put when the whole record shows it has not. What is here is what has been measured.";

export const NO_ATTRIBUTION_NOTE =
  "This tab measures concentration. That the rise is human, that CO2 warms the planet, and how much: those are established elsewhere, by isotopes, by radiative physics and by model experiments. A concentration curve on its own cannot demonstrate any of them, and a page pretending otherwise would be overreaching.";
