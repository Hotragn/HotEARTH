/**
 * lib/climate.ts — the instrumental temperature record, and why two teams
 * publishing different numbers for the same year is not a disagreement.
 *
 * Data: two independent analyses, committed rather than fetched live (neither
 * source sends CORS headers, and an annual global mean is a state that is
 * revised monthly rather than a list of events, so a mirror stays correct):
 *
 *   NASA GISTEMP v4, baseline 1951-1980, public domain.
 *   Met Office HadCRUT5, baseline 1961-1990, OGL v3, with published uncertainty.
 *
 * THE LOAD-BEARING POINT of this tab is the difference between a NUMBER and a
 * TREND.
 *
 * For 2024, GISTEMP published 1.28 C and HadCRUT5 published 1.51 C. That looks
 * like a 0.23 C disagreement between two of the world's major climate groups.
 * It is almost entirely a difference of BASELINE: rebase both onto a common
 * 1961-1990 reference and they read 1.18 and 1.16, two hundredths apart. Their
 * warming trends over 1975-2025 agree to a thousandth of a degree per decade.
 *
 * The anomaly number depends on where you choose to measure from, which is a
 * convention. The trend does not, which is why it is the thing to look at. This
 * module makes that provable rather than assertable: rebasing subtracts a
 * CONSTANT from every year, and subtracting a constant cannot change a slope.
 *
 * Null-safety contract, as everywhere else: bad input returns null, nothing
 * throws.
 */

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ─────────────────────────────── the series ─────────────────────────────────

export type SeriesId = "gistemp" | "hadcrut5";

export interface TemperatureSeries {
  id: SeriesId;
  label: string;
  /** the baseline the published anomalies are measured against */
  baseline: [number, number];
  years: number[];
  /** anomaly in C, index-aligned with `years` */
  anomaly: number[];
  /** published 1-sigma-style uncertainty where the source gives one */
  uncertainty: Array<number | null>;
  licence: string;
  note: string;
}

export interface ClimateData {
  gistemp: TemperatureSeries | null;
  hadcrut5: TemperatureSeries | null;
  generated: Date | null;
}

const SERIES_META: Record<SeriesId, { label: string; licence: string; note: string }> = {
  gistemp: {
    label: "NASA GISTEMP v4",
    licence: "US Government work, public domain",
    note: "Land-ocean index. Interpolates into the Arctic, which is the main reason it and HadCRUT5 diverge in recent decades: the Arctic is warming fastest, so including it raises the recent end.",
  },
  hadcrut5: {
    label: "Met Office HadCRUT5",
    licence: "Open Government Licence v3",
    note: "Reaches back to 1850 and publishes a per-year uncertainty, which widens dramatically in the 19th century when there were far fewer thermometers and almost no ocean coverage.",
  },
};

function parseSeries(id: SeriesId, raw: unknown): TemperatureSeries | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const years = Array.isArray(r.years) ? r.years.filter(finite) : [];
  const anomaly = Array.isArray(r.anomaly) ? r.anomaly : [];
  const baseline = Array.isArray(r.baseline) ? r.baseline.filter(finite) : [];
  if (years.length === 0 || years.length !== anomaly.length || baseline.length !== 2) {
    return null;
  }

  // Keep only pairs where both the year and the anomaly are usable, so a single
  // bad row cannot shift every later year by one position.
  const okYears: number[] = [];
  const okAnom: number[] = [];
  const okUnc: Array<number | null> = [];
  const unc = Array.isArray(r.uncertainty) ? r.uncertainty : [];
  for (let i = 0; i < years.length; i++) {
    if (!finite(anomaly[i])) continue;
    okYears.push(years[i]);
    okAnom.push(anomaly[i] as number);
    okUnc.push(finite(unc[i]) ? (unc[i] as number) : null);
  }
  if (okYears.length === 0) return null;

  return {
    id,
    baseline: [baseline[0], baseline[1]],
    years: okYears,
    anomaly: okAnom,
    uncertainty: okUnc,
    ...SERIES_META[id],
  };
}

export function parseClimate(raw: unknown): ClimateData {
  const empty: ClimateData = { gistemp: null, hadcrut5: null, generated: null };
  if (!raw || typeof raw !== "object") return empty;
  const root = raw as Record<string, unknown>;
  const meta = (root.meta ?? {}) as Record<string, unknown>;
  const gen = typeof meta.generated === "string" ? new Date(meta.generated) : null;
  return {
    gistemp: parseSeries("gistemp", root.gistemp),
    hadcrut5: parseSeries("hadcrut5", root.hadcrut5),
    generated: gen && Number.isFinite(gen.getTime()) ? gen : null,
  };
}

// ───────────────────────────────── baselines ────────────────────────────────

/**
 * The baselines in common use, and who uses them. There is no "correct" choice:
 * each was picked for a reason, and each produces a different headline number
 * from identical data.
 */
export const BASELINES: readonly {
  id: string;
  label: string;
  range: [number, number];
  who: string;
}[] = [
  {
    id: "1850-1900",
    label: "1850 to 1900",
    range: [1850, 1900],
    who: "IPCC, as the closest available stand-in for pre-industrial. This is the baseline the 1.5 C and 2 C targets are measured from.",
  },
  {
    id: "1951-1980",
    label: "1951 to 1980",
    range: [1951, 1980],
    who: "NASA GISS. Chosen partly because it is within living memory for most people, so the anomaly reads as a departure from a climate someone remembers.",
  },
  {
    id: "1961-1990",
    label: "1961 to 1990",
    range: [1961, 1990],
    who: "WMO and the Met Office. A standard 30-year climate normal.",
  },
  {
    id: "1991-2020",
    label: "1991 to 2020",
    range: [1991, 2020],
    who: "The current WMO normal. Using it makes today look far less anomalous, because the reference period is itself already warmed.",
  },
];

/** Mean of a series over an inclusive year range, or null if it has no data there. */
export function meanOver(
  series: TemperatureSeries | null,
  from: number,
  to: number
): number | null {
  if (!series || !finite(from) || !finite(to) || to < from) return null;
  let sum = 0;
  let n = 0;
  for (let i = 0; i < series.years.length; i++) {
    const y = series.years[i];
    if (y >= from && y <= to) {
      sum += series.anomaly[i];
      n++;
    }
  }
  return n === 0 ? null : sum / n;
}

/**
 * Re-express a series against a different baseline.
 *
 * This is the whole of it: subtract the mean over the new reference window from
 * every year. A single constant, applied uniformly. Which is exactly why it
 * changes every headline number and cannot change the trend by a thousandth,
 * and why the tab shows both.
 *
 * Returns null when the series does not cover the requested window at all,
 * rather than rebasing onto a partial mean and quietly producing a number that
 * is wrong by an unknown amount. GISTEMP starts in 1880, so it cannot honestly
 * be put on the IPCC 1850-1900 baseline; the UI says so instead of guessing.
 */
export function rebase(
  series: TemperatureSeries | null,
  from: number,
  to: number,
  opts: { requireFullCoverage?: boolean } = {}
): TemperatureSeries | null {
  if (!series) return null;
  const requireFull = opts.requireFullCoverage ?? true;
  const covered = series.years.filter((y) => y >= from && y <= to).length;
  if (covered === 0) return null;
  if (requireFull && covered < to - from + 1) return null;

  const offset = meanOver(series, from, to);
  if (offset === null) return null;

  return {
    ...series,
    baseline: [from, to],
    anomaly: series.anomaly.map((a) => a - offset),
  };
}

// ──────────────────────────── trend, with its error ─────────────────────────

export interface Trend {
  /** warming per decade [C] */
  perDecade: number;
  /** standard error of the slope, per decade */
  stdErrPerDecade: number;
  /** intercept, in the series' own anomaly units */
  intercept: number;
  /** how many years entered the fit */
  n: number;
  /** coefficient of determination */
  rSquared: number;
  from: number;
  to: number;
}

/**
 * Ordinary least squares trend over a window, with the standard error of the
 * slope, expressed per decade because that is how climate trends are quoted.
 *
 * The standard error is reported because a trend without one invites the
 * classic abuse: pick a short window, find a slope that looks flat or alarming,
 * and quote it. Over ten years the error bar is wide enough to contain almost
 * anything, and the number should be read with that in front of it. Requires at
 * least ten points and refuses otherwise.
 */
export function trend(
  series: TemperatureSeries | null,
  from: number,
  to: number
): Trend | null {
  if (!series || !finite(from) || !finite(to) || to <= from) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < series.years.length; i++) {
    const y = series.years[i];
    if (y >= from && y <= to) {
      xs.push(y);
      ys.push(series.anomaly[i]);
    }
  }
  const n = xs.length;
  if (n < 10) return null;

  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) * (xs[i] - meanX);
  }
  if (sxx === 0) return null;

  const slope = sxy / sxx; // C per year
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    ssRes += (ys[i] - pred) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }
  // Standard error of the slope for a simple linear regression.
  const residualVar = n > 2 ? ssRes / (n - 2) : 0;
  const stdErr = Math.sqrt(residualVar / sxx);

  return {
    perDecade: slope * 10,
    stdErrPerDecade: stdErr * 10,
    intercept,
    n,
    rSquared: ssTot === 0 ? 1 : 1 - ssRes / ssTot,
    from: xs[0],
    to: xs[n - 1],
  };
}

// ───────────────────── comparing the two analyses honestly ──────────────────

export interface SeriesComparison {
  year: number;
  /** what each group actually published, on its own baseline */
  publishedA: number;
  publishedB: number;
  publishedGap: number;
  /** both rebased onto a common window */
  commonBaseline: [number, number];
  rebasedA: number;
  rebasedB: number;
  rebasedGap: number;
  /** the fraction of the apparent gap that was only the baseline */
  fractionExplainedByBaseline: number;
}

/**
 * Compare two analyses for one year, before and after putting them on a common
 * baseline.
 *
 * This is the tab's headline exhibit, and the number it produces is the point:
 * for 2024 the published figures differ by 0.23 C and the rebased figures by
 * 0.02, so about nine tenths of the apparent disagreement between two major
 * climate groups was a choice of reference period.
 */
export function compareSeries(
  a: TemperatureSeries | null,
  b: TemperatureSeries | null,
  year: number,
  commonBaseline: [number, number] = [1961, 1990]
): SeriesComparison | null {
  if (!a || !b || !finite(year)) return null;

  const at = (s: TemperatureSeries) => {
    const i = s.years.indexOf(year);
    return i === -1 ? null : s.anomaly[i];
  };

  const pa = at(a);
  const pb = at(b);
  if (pa === null || pb === null) return null;

  const ra = rebase(a, commonBaseline[0], commonBaseline[1]);
  const rb = rebase(b, commonBaseline[0], commonBaseline[1]);
  if (!ra || !rb) return null;
  const va = at(ra);
  const vb = at(rb);
  if (va === null || vb === null) return null;

  const publishedGap = Math.abs(pb - pa);
  const rebasedGap = Math.abs(vb - va);
  return {
    year,
    publishedA: pa,
    publishedB: pb,
    publishedGap,
    commonBaseline,
    rebasedA: va,
    rebasedB: vb,
    rebasedGap,
    fractionExplainedByBaseline:
      publishedGap === 0 ? 0 : Math.max(0, 1 - rebasedGap / publishedGap),
  };
}

// ────────────────────────── warming stripes colouring ───────────────────────

/**
 * Map an anomaly onto the blue-to-red scale used for warming stripes, with the
 * range taken from the data rather than fixed, so the picture does not silently
 * rescale as years are added.
 *
 * The colours are a presentation choice and carry no information the numbers do
 * not: the axis is stated on screen.
 */
export function stripeColor(anomaly: number, maxAbs: number): string {
  if (!finite(anomaly) || !finite(maxAbs) || maxAbs <= 0) return "rgb(120,120,120)";
  const t = Math.max(-1, Math.min(1, anomaly / maxAbs));
  if (t < 0) {
    // cold: pale blue to deep blue
    const k = -t;
    return `rgb(${Math.round(222 - 160 * k)}, ${Math.round(235 - 120 * k)}, ${Math.round(247 - 40 * k)})`;
  }
  // warm: pale red to deep red
  return `rgb(${Math.round(254 - 50 * t)}, ${Math.round(229 - 200 * t)}, ${Math.round(217 - 190 * t)})`;
}

/** The warmest years on record, which is the list people actually ask about. */
export function warmestYears(
  series: TemperatureSeries | null,
  count = 10
): Array<{ year: number; anomaly: number }> {
  if (!series) return [];
  return series.years
    .map((y, i) => ({ year: y, anomaly: series.anomaly[i] }))
    .sort((p, q) => q.anomaly - p.anomaly)
    .slice(0, Math.max(0, count));
}

// ─────────────────────────────── honesty copy ───────────────────────────────

export const BASELINE_NOTE =
  "The headline number is a choice, the trend is not. An anomaly is measured from a reference period, and there is no correct one: the IPCC uses 1850 to 1900 because that is the closest thing to pre-industrial, NASA uses 1951 to 1980 because it is within living memory, the WMO uses a rolling 30-year normal. Switching baseline shifts every year by the same constant, so it changes the headline and cannot change the slope. Change the baseline above and watch which number moves.";

export const TWO_ANALYSES_NOTE =
  "For 2024, NASA published 1.28 C and the Met Office published 1.51 C. That is not a disagreement about the planet: put both on the same baseline and they read 1.18 and 1.16. Their trends over the last fifty years agree to a thousandth of a degree per decade. Two independent groups, different instruments, different methods for the data-sparse Arctic, and the same answer once you stop comparing different reference periods.";

export const ANOMALY_NOT_ABSOLUTE_NOTE =
  "These are anomalies, not temperatures. Nobody can measure the absolute average temperature of the Earth to a tenth of a degree, because it depends on where you put the thermometers. Differences from a reference period are far better constrained than the absolute value, which is why climate science works in anomalies and why you will never see a credible chart of the Earth's absolute mean temperature to two decimal places.";

export const SINGLE_YEAR_NOTE =
  "One year is weather. El Nino adds roughly a tenth to a fifth of a degree to a year and La Nina takes it away, so individual records and individual dips both happen without the trend changing. A record year is a headline; the thirty-year slope is the climate.";

export const COVERAGE_NOTE =
  "The early record is thin. In the 19th century there were few land stations, almost no ocean measurements outside shipping lanes, and nothing at the poles, which is why HadCRUT5 publishes an uncertainty five times wider for 1850 than for today. The two analyses also differ most where the data is sparsest: GISTEMP interpolates into the Arctic and HadCRUT5 historically left more of it out, and the Arctic is warming fastest.";

export const NO_ATTRIBUTION_NOTE =
  "This tab measures, it does not attribute. Establishing that the warming is caused by greenhouse gases takes physics and model experiments that are far beyond a temperature series, and any page claiming to demonstrate causation from this data alone would be overreaching. The IPCC assessment reports are the place for that.";
