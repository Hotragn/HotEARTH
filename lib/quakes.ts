/**
 * lib/quakes.ts — real earthquakes, and the statistics that actually mean
 * something once you have a catalogue of them.
 *
 * Data source: the USGS earthquake GeoJSON feeds (public domain, no key, CORS
 * open). We read them live rather than committing a mirror, because a
 * committed list of earthquakes is not a stale snapshot of a state like an
 * orbital element set is: it is a stale list of EVENTS, and showing yesterday's
 * events as though they were today's would be a lie. If USGS is unreachable the
 * tab says so and shows nothing, which is the honest failure mode.
 *
 * WHAT IS COMPUTED HERE (none of it is in the feed):
 *
 *  1. Radiated energy from magnitude, and the ratio between magnitudes, which
 *     is the number that makes magnitude scales finally make sense.
 *  2. Seismic moment M0 from moment magnitude, validated against the published
 *     moment of the 2011 Tohoku earthquake.
 *  3. A Gutenberg-Richter fit, log10 N = a - bM, over the live catalogue, with
 *     the magnitude of completeness estimated from the data. The b-value it
 *     recovers can be compared against the published global b of about 1.0.
 *  4. Depth classes, and P and S wave travel times for LOCAL distances only.
 *
 * THE LOAD-BEARING HONESTY POINT of this module is the completeness magnitude.
 * A frequency-magnitude plot of any real catalogue rolls over at the low end.
 * That rollover is NOT physics and it is NOT a shortage of small earthquakes:
 * small earthquakes are missing from the catalogue because the seismometer
 * network did not detect or report them. Fitting b through the rollover gives a
 * confidently wrong answer, so the fit here starts at the estimated Mc and the
 * UI draws where that cut falls.
 *
 * Null-safety contract, as everywhere else: bad input returns null or an empty
 * array, and nothing throws.
 */

import { greatCircleKm } from "./geo";

function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

// ───────────────────────────── the catalogue ────────────────────────────────

/** One located earthquake, flattened from the USGS GeoJSON feature. */
export interface Quake {
  id: string;
  /** magnitude as reported (see magType: these are not all the same scale) */
  mag: number;
  /** the scale the magnitude was measured on, e.g. "mww", "mb", "ml" */
  magType: string | null;
  latDeg: number;
  lonDeg: number;
  /** hypocentre depth below the surface [km] */
  depthKm: number;
  /** origin time */
  time: Date;
  /** USGS place description, e.g. "64 km NE of Mangapapa, New Zealand" */
  place: string;
  /** USGS significance score (0-1000ish), a composite of magnitude and impact */
  significance: number | null;
  /** did USGS flag a tsunami message for this event */
  tsunami: boolean;
  /** the USGS event page, kept so every event can be traced to the source */
  url: string | null;
}

export interface QuakeCatalogue {
  quakes: Quake[];
  /** feed title, e.g. "USGS Magnitude 2.5+ Earthquakes, Past Week" */
  title: string | null;
  /** when USGS generated the feed */
  generated: Date | null;
  /** events dropped because they were not earthquakes (blasts, explosions) */
  droppedNonEarthquakes: number;
  /** events dropped for unusable coordinates, magnitude or time */
  droppedIncomplete: number;
}

const EMPTY_CATALOGUE: QuakeCatalogue = {
  quakes: [],
  title: null,
  generated: null,
  droppedNonEarthquakes: 0,
  droppedIncomplete: 0,
};

/**
 * Parse a USGS GeoJSON feed into typed rows.
 *
 * Non-earthquake events (quarry blasts, mining explosions, ice quakes) are
 * dropped and COUNTED, not silently discarded, because a page about earthquakes
 * that quietly includes quarry blasts in its statistics is wrong in a way the
 * reader cannot see. Rows without a usable magnitude, position or time are
 * dropped and counted separately.
 */
export function parseUsgsFeed(raw: unknown): QuakeCatalogue {
  if (!raw || typeof raw !== "object") return EMPTY_CATALOGUE;
  const root = raw as Record<string, unknown>;
  const features = Array.isArray(root.features) ? root.features : null;
  if (!features) return EMPTY_CATALOGUE;

  const meta =
    root.metadata && typeof root.metadata === "object"
      ? (root.metadata as Record<string, unknown>)
      : {};

  const quakes: Quake[] = [];
  let droppedNonEarthquakes = 0;
  let droppedIncomplete = 0;

  for (const f of features) {
    if (!f || typeof f !== "object") {
      droppedIncomplete++;
      continue;
    }
    const feature = f as Record<string, unknown>;
    const p =
      feature.properties && typeof feature.properties === "object"
        ? (feature.properties as Record<string, unknown>)
        : null;
    const g =
      feature.geometry && typeof feature.geometry === "object"
        ? (feature.geometry as Record<string, unknown>)
        : null;
    if (!p || !g) {
      droppedIncomplete++;
      continue;
    }

    if (typeof p.type === "string" && p.type !== "earthquake") {
      droppedNonEarthquakes++;
      continue;
    }

    const coords = Array.isArray(g.coordinates) ? g.coordinates : null;
    const lonDeg = coords?.[0];
    const latDeg = coords?.[1];
    const depthKm = coords?.[2];
    const mag = p.mag;
    const timeMs = p.time;

    if (
      !finite(lonDeg) ||
      !finite(latDeg) ||
      !finite(mag) ||
      !finite(timeMs) ||
      Math.abs(latDeg) > 90 ||
      Math.abs(lonDeg) > 180
    ) {
      droppedIncomplete++;
      continue;
    }

    quakes.push({
      id: typeof feature.id === "string" ? feature.id : `${timeMs}-${latDeg}-${lonDeg}`,
      mag,
      magType: typeof p.magType === "string" ? p.magType : null,
      latDeg,
      lonDeg,
      // A few feeds carry a null depth; 0 is a real value, so only a non-finite
      // depth falls back, and it falls back to 0 with the class "unknown".
      depthKm: finite(depthKm) ? depthKm : 0,
      time: new Date(timeMs),
      place: typeof p.place === "string" ? p.place : "location not given",
      significance: finite(p.sig) ? p.sig : null,
      tsunami: p.tsunami === 1 || p.tsunami === true,
      url: typeof p.url === "string" ? p.url : null,
    });
  }

  quakes.sort((a, b) => b.time.getTime() - a.time.getTime());

  return {
    quakes,
    title: typeof meta.title === "string" ? meta.title : null,
    generated: finite(meta.generated) ? new Date(meta.generated) : null,
    droppedNonEarthquakes,
    droppedIncomplete,
  };
}

// ────────────────────────────── energy and moment ───────────────────────────

/**
 * Radiated seismic energy from magnitude, by the Gutenberg-Richter energy
 * relation used by the USGS:
 *
 *   log10 E [joules] = 1.5 M + 4.8
 *
 * The consequence is the fact most people get wrong about magnitude: one whole
 * magnitude step is 10^1.5, about 32 times the energy, and two steps is exactly
 * 1000 times. An M7 is not "a bit worse" than an M6.
 *
 * This is radiated seismic energy, not the total energy released (much goes
 * into fracturing and heat) and not shaking at any particular place.
 */
export function energyJoules(mag: number): number | null {
  if (!finite(mag)) return null;
  return Math.pow(10, 1.5 * mag + 4.8);
}

/** How many times more energy magnitude `a` radiates than magnitude `b`. */
export function energyRatio(a: number, b: number): number | null {
  if (!finite(a) || !finite(b)) return null;
  return Math.pow(10, 1.5 * (a - b));
}

/**
 * Seismic moment from moment magnitude (Hanks & Kanamori 1979):
 *
 *   M0 [N m] = 10^(1.5 Mw + 9.1)
 *
 * Moment is the physical size of the rupture (rigidity x fault area x slip),
 * which is why Mw does not saturate for great earthquakes the way the older
 * scales do. Only meaningful for moment magnitudes: applying it to an `mb` or
 * `ml` reading is a category error, which is why the UI shows the magType.
 */
export function seismicMomentNm(momentMagnitude: number): number | null {
  if (!finite(momentMagnitude)) return null;
  return Math.pow(10, 1.5 * momentMagnitude + 9.1);
}

/** The inverse: moment magnitude from seismic moment [N m]. */
export function momentMagnitude(momentNm: number): number | null {
  if (!finite(momentNm) || momentNm <= 0) return null;
  return (Math.log10(momentNm) - 9.1) / 1.5;
}

/** Published energy references, for putting a number in human terms. */
export const ENERGY_REFERENCE = {
  /** 1 kilotonne of TNT, by definition */
  ktTntJoules: 4.184e12,
  /** the Hiroshima device, about 15 kt */
  hiroshimaJoules: 6.276e13,
  /** average US household electricity use for a year, about 10,500 kWh */
  usHouseholdYearJoules: 3.78e10,
} as const;

/** Total radiated energy of a catalogue [joules]. */
export function totalEnergyJoules(quakes: readonly Quake[] | null | undefined): number {
  if (!Array.isArray(quakes)) return 0;
  let total = 0;
  for (const q of quakes) {
    const e = energyJoules(q?.mag);
    if (e !== null) total += e;
  }
  return total;
}

/**
 * Which single event dominated the energy budget, as a fraction of the total.
 *
 * This is worth showing because it is counter-intuitive and it is real: in
 * almost any window, the largest earthquake radiates more energy than every
 * other earthquake in the catalogue combined, often by a wide margin. The
 * thousands of small events are, energetically, a rounding error.
 */
export function largestEnergyShare(
  quakes: readonly Quake[] | null | undefined
): { largest: Quake; share: number } | null {
  if (!Array.isArray(quakes) || quakes.length === 0) return null;
  let largest: Quake | null = null;
  for (const q of quakes) {
    if (!finite(q?.mag)) continue;
    if (!largest || q.mag > largest.mag) largest = q;
  }
  if (!largest) return null;
  const total = totalEnergyJoules(quakes);
  const e = energyJoules(largest.mag);
  if (e === null || total <= 0) return null;
  return { largest, share: e / total };
}

// ─────────────────────────────── depth classes ──────────────────────────────

export type DepthClass = "shallow" | "intermediate" | "deep";

/**
 * Standard seismological depth bands: shallow < 70 km, intermediate 70 to
 * 300 km, deep > 300 km.
 *
 * The bands are not arbitrary. Below about 70 km, rock at that pressure should
 * deform ductilely rather than fracture, so intermediate and deep earthquakes
 * happen almost exclusively inside cold subducting slabs, which is why they map
 * out subduction zones so cleanly. Nothing on Earth produces earthquakes below
 * about 700 km.
 */
export function depthClass(depthKm: number): DepthClass | null {
  if (!finite(depthKm)) return null;
  if (depthKm < 70) return "shallow";
  if (depthKm <= 300) return "intermediate";
  return "deep";
}

export function countByDepthClass(
  quakes: readonly Quake[] | null | undefined
): Record<DepthClass, number> {
  const out: Record<DepthClass, number> = { shallow: 0, intermediate: 0, deep: 0 };
  if (!Array.isArray(quakes)) return out;
  for (const q of quakes) {
    const c = depthClass(q?.depthKm);
    if (c) out[c]++;
  }
  return out;
}

// ─────────────────────── Gutenberg-Richter and completeness ─────────────────

export interface MagnitudeBin {
  /** lower edge of the bin */
  mag: number;
  /** how many events fell in this bin */
  count: number;
  /** how many events had this magnitude OR HIGHER */
  cumulative: number;
}

/**
 * Bin a catalogue by magnitude, with both the per-bin count and the CUMULATIVE
 * count at or above each bin. Gutenberg-Richter is a statement about the
 * cumulative distribution, so the cumulative column is the one that gets fitted.
 */
export function magnitudeBins(
  quakes: readonly Quake[] | null | undefined,
  binWidth = 0.1
): MagnitudeBin[] {
  if (!Array.isArray(quakes) || quakes.length === 0) return [];
  if (!finite(binWidth) || binWidth <= 0) return [];

  const mags = quakes.map((q) => q?.mag).filter(finite);
  if (mags.length === 0) return [];

  const lo = Math.floor(Math.min(...mags) / binWidth) * binWidth;
  const hi = Math.ceil(Math.max(...mags) / binWidth) * binWidth;
  const nBins = Math.max(1, Math.round((hi - lo) / binWidth) + 1);
  if (nBins > 500) return []; // refuse an absurd binning rather than hang

  const counts = new Array<number>(nBins).fill(0);
  for (const m of mags) {
    const i = Math.min(nBins - 1, Math.max(0, Math.round((m - lo) / binWidth)));
    counts[i]++;
  }

  const bins: MagnitudeBin[] = [];
  let cumulative = 0;
  for (let i = nBins - 1; i >= 0; i--) {
    cumulative += counts[i];
    bins[i] = {
      mag: Number((lo + i * binWidth).toFixed(4)),
      count: counts[i],
      cumulative,
    };
  }
  return bins;
}

/**
 * Magnitude of completeness Mc by the maximum-curvature method: the magnitude
 * of the fullest bin, i.e. the peak of the non-cumulative distribution.
 *
 * Below Mc the catalogue is missing earthquakes that happened, because the
 * network did not detect or report them. Max curvature is the standard quick
 * estimator and is known to UNDERESTIMATE Mc for heterogeneous catalogues
 * (Woessner & Wiemer 2005 propose corrections of +0.2 or more), which is why
 * this is reported as an estimate and never as a measurement.
 */
export function completenessMagnitude(
  quakes: readonly Quake[] | null | undefined,
  binWidth = 0.1
): number | null {
  const bins = magnitudeBins(quakes, binWidth);
  if (bins.length === 0) return null;
  let best: MagnitudeBin | null = null;
  for (const b of bins) {
    if (!best || b.count > best.count) best = b;
  }
  return best ? best.mag : null;
}

export interface GutenbergRichterFit {
  /** productivity: log10 of the number of events at or above magnitude 0 */
  a: number;
  /** the b-value: the slope. About 1.0 for most of the real world. */
  b: number;
  /** the completeness cut the fit started from */
  mc: number;
  /** how many events entered the fit */
  n: number;
  /** coefficient of determination of the straight-line fit in log space */
  rSquared: number;
}

/**
 * Fit log10 N(>= M) = a - b M by least squares over the bins at or above `mc`.
 *
 * The fit deliberately starts at the completeness magnitude. Including the
 * rolled-over low end would drag the slope down and produce a confident,
 * meaningless b-value: the classic way to get this wrong.
 *
 * Bins with zero cumulative count are skipped (log10 0 is undefined), and the
 * fit needs at least three usable bins, otherwise it returns null rather than
 * drawing a line through two points and calling it a law.
 */
export function gutenbergRichterFit(
  quakes: readonly Quake[] | null | undefined,
  mc?: number,
  binWidth = 0.1
): GutenbergRichterFit | null {
  const bins = magnitudeBins(quakes, binWidth);
  if (bins.length === 0) return null;

  const cut = finite(mc) ? mc : completenessMagnitude(quakes, binWidth);
  if (cut === null) return null;

  const xs: number[] = [];
  const ys: number[] = [];
  for (const bin of bins) {
    if (bin.mag < cut - 1e-9) continue;
    if (bin.cumulative <= 0) continue;
    xs.push(bin.mag);
    ys.push(Math.log10(bin.cumulative));
  }
  if (xs.length < 3) return null;

  const n = xs.length;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - meanX) * (ys[i] - meanY);
    sxx += (xs[i] - meanX) * (xs[i] - meanX);
  }
  if (sxx === 0) return null;

  const slope = sxy / sxx; // negative: counts fall as magnitude rises
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    ssRes += (ys[i] - pred) * (ys[i] - pred);
    ssTot += (ys[i] - meanY) * (ys[i] - meanY);
  }

  const events = (quakes ?? []).filter((q) => finite(q?.mag) && q.mag >= cut - 1e-9).length;

  return {
    a: intercept,
    b: -slope,
    mc: cut,
    n: events,
    rSquared: ssTot === 0 ? 1 : 1 - ssRes / ssTot,
  };
}

/**
 * The b-value by Aki's (1965) maximum-likelihood estimator:
 *
 *   b = 1 / ( ln(10) * ( mean(M) - (Mc - dM/2) ) )
 *
 * with the Shi & Bolt (1982) uncertainty
 *
 *   sigma_b = 2.30 * b^2 * sqrt( sum (M - mean M)^2 / (n (n-1)) )
 *
 * This is the estimator seismologists actually use, and it is preferred over a
 * least-squares fit to the cumulative curve for a real reason: cumulative counts
 * are not independent observations (every event appears in every bin below it),
 * so least squares understates the uncertainty and is biased by how the tail is
 * binned. The straight line on the chart is still drawn by least squares because
 * that is what a line through those points IS, but the b-value quoted as a
 * number comes from here.
 */
export function akiBValue(
  quakes: readonly Quake[] | null | undefined,
  mc: number,
  binWidth = 0.1
): { b: number; sigma: number; n: number } | null {
  if (!Array.isArray(quakes) || !finite(mc) || !finite(binWidth) || binWidth <= 0) {
    return null;
  }
  const mags = quakes
    .map((q) => q?.mag)
    .filter(finite)
    .filter((m) => m >= mc - binWidth / 2 - 1e-9);
  const n = mags.length;
  if (n < 20) return null; // too few events to claim a slope

  const mean = mags.reduce((s, m) => s + m, 0) / n;
  const denom = mean - (mc - binWidth / 2);
  if (denom <= 0) return null;

  const b = 1 / (Math.LN10 * denom);
  let ss = 0;
  for (const m of mags) ss += (m - mean) * (m - mean);
  const sigma = 2.3 * b * b * Math.sqrt(ss / (n * (n - 1)));
  return { b, sigma, n };
}

export interface StableCompleteness {
  /** the chosen completeness magnitude */
  mc: number;
  /** the Aki b-value at that cut */
  b: number;
  /** its Shi & Bolt uncertainty */
  sigma: number;
  /** how many events entered the estimate */
  n: number;
  /** did the b-value ever actually stabilise, or did we fall back to the top */
  converged: boolean;
}

/**
 * Magnitude of completeness by B-VALUE STABILITY (Cao & Gao 2002, as reviewed by
 * Woessner & Wiemer 2005): step Mc upwards, and accept the first cut where the
 * b-value stops changing, i.e. where b(Mc) agrees with the average of the next
 * few cuts to within its own uncertainty.
 *
 * WHY THIS EXISTS, and it is not academic. The quick maximum-curvature estimator
 * is degenerate on the catalogue this tab reads. A global feed is not one
 * catalogue, it is dozens of regional networks glued together: California and
 * Alaska report magnitude 1 events, most of the planet does not report anything
 * below about 4.5. Max curvature finds the peak of that mixture, around
 * magnitude 1, and a b-value fitted from there comes out near 0.5, far below the
 * published global range of 0.8 to 1.2. The number looks precise and is wrong.
 * Stepping Mc up until b stabilises recovers the real global completeness near
 * 4.5 and a b-value in the published range.
 *
 * Returns null if there is never enough data to estimate b at all. If b never
 * stabilises within the range, the highest usable cut is returned with
 * `converged: false`, so the caller can say so rather than pretend.
 */
export function stableCompleteness(
  quakes: readonly Quake[] | null | undefined,
  opts: { binWidth?: number; step?: number; window?: number } = {}
): StableCompleteness | null {
  const binWidth = opts.binWidth ?? 0.1;
  const step = opts.step ?? 0.1;
  const window = opts.window ?? 5;
  if (!Array.isArray(quakes) || quakes.length === 0) return null;
  if (!finite(step) || step <= 0 || !finite(window) || window < 1) return null;

  const mags = quakes.map((q) => q?.mag).filter(finite);
  if (mags.length === 0) return null;
  const lo = Math.min(...mags);
  const hi = Math.max(...mags);
  if (!(hi > lo)) return null;

  // Estimate b at every candidate cut first, so the stability test can look
  // ahead without recomputing.
  const cuts: Array<{ mc: number; b: number; sigma: number; n: number }> = [];
  for (let mc = Math.round(lo * 10) / 10; mc <= hi; mc = Math.round((mc + step) * 1000) / 1000) {
    const est = akiBValue(quakes, mc, binWidth);
    if (est) cuts.push({ mc, ...est });
  }
  if (cuts.length === 0) return null;

  // Stability test: EVERY b in the look-ahead window must agree with b(Mc) to
  // within its uncertainty. Comparing against the window's MEAN instead (the
  // looser form of the criterion) accepts far too early on this data: where b
  // is drifting steadily upwards, the mean of the next few values can sit close
  // to the current one while the trend is still climbing, and the method then
  // reports a "stable" completeness in the middle of the incomplete range.
  for (let i = 0; i + window < cuts.length; i++) {
    let worst = 0;
    for (let k = 1; k <= window; k++) {
      worst = Math.max(worst, Math.abs(cuts[i + k].b - cuts[i].b));
    }
    if (worst <= cuts[i].sigma) {
      return { ...cuts[i], converged: true };
    }
  }

  // No stable point: hand back the last cut that still had enough events, and
  // say plainly that it did not converge.
  const last = cuts[cuts.length - 1];
  return { ...last, converged: false };
}

/**
 * The recurrence statement a b-value actually supports: how many events at or
 * above `mag` the fitted law expects over the same window the fit came from.
 * Extrapolating this far above the largest observed event is exactly the kind
 * of thing the UI must not do quietly, so the caller decides how far to go.
 */
export function expectedCountAbove(
  fit: GutenbergRichterFit | null | undefined,
  mag: number
): number | null {
  if (!fit || !finite(fit.a) || !finite(fit.b) || !finite(mag)) return null;
  return Math.pow(10, fit.a - fit.b * mag);
}

/**
 * The magnitude above which the global USGS/NEIC catalogue is complete.
 *
 * This is a PUBLISHED threshold, not something estimated from the feed, and
 * that is deliberate. Estimating completeness from a global catalogue does not
 * work, because a global catalogue is not one catalogue: it is dozens of
 * regional networks with wildly different detection thresholds glued together.
 * California and Alaska report magnitude 1 events over a small area; most of
 * the planet reports nothing below about 4.5. There is no single Mc that makes
 * that mixture complete, so every data-driven estimator finds a feature of the
 * MIXTURE instead of a detection limit, and returns a confident number in the
 * wrong place. Both estimators in this module do exactly that on the live feed,
 * which the UI shows side by side rather than hiding.
 *
 * The global network has been complete at roughly M4.5 since the 1970s and
 * closer to M4.0 in recent decades; 4.5 is the conservative choice.
 */
export const GLOBAL_COMPLETENESS_MAG = 4.5;

/** The published global b-value, for comparison against a live fit. */
export const GLOBAL_B_VALUE_NOTE =
  "The global b-value is close to 1.0 and is usually found between 0.8 and 1.2. b near 1 means that for every magnitude step up, earthquakes become about ten times rarer, while each one radiates about 32 times the energy.";

// ─────────────────────────── distance and wave arrival ──────────────────────

/**
 * Great-circle distance from an observer to an epicentre [km].
 *
 * Delegates to lib/geo's `greatCircleKm` rather than carrying a second
 * haversine: one implementation, validated against published city-pair
 * distances, so no two tabs can disagree about how far apart two points on
 * Earth are.
 */
export function distanceToQuakeKm(
  observerLatDeg: number,
  observerLonDeg: number,
  quake: Quake | null | undefined
): number | null {
  if (!quake || !finite(quake.latDeg) || !finite(quake.lonDeg)) return null;
  return greatCircleKm(observerLatDeg, observerLonDeg, quake.latDeg, quake.lonDeg);
}

/** Crustal P and S wave speeds used for the local-distance estimate [km/s]. */
export const CRUSTAL_P_KM_S = 6.1;
export const CRUSTAL_S_KM_S = 3.55;

/** Beyond this distance the ray leaves the crust and this estimate is refused. */
export const LOCAL_DISTANCE_LIMIT_KM = 1000;

export interface WaveArrival {
  pSeconds: number;
  sSeconds: number;
  /** the S minus P interval, which is how you locate a quake from one station */
  spSeconds: number;
}

/**
 * Rough P and S arrival times for a LOCAL earthquake, straight-line through the
 * crust at fixed velocities.
 *
 * Returns null beyond 1000 km, and that refusal is the point. Past regional
 * distances the ray dives into the mantle, where velocity climbs with depth and
 * bends the path, so a constant-velocity estimate stops being approximately
 * right and starts being wrong. Doing it properly needs a real velocity model
 * (IASP91 or AK135), which this app does not ship, so it declines to guess.
 */
export function localWaveArrival(distanceKm: number): WaveArrival | null {
  if (!finite(distanceKm) || distanceKm < 0) return null;
  if (distanceKm > LOCAL_DISTANCE_LIMIT_KM) return null;
  const pSeconds = distanceKm / CRUSTAL_P_KM_S;
  const sSeconds = distanceKm / CRUSTAL_S_KM_S;
  return { pSeconds, sSeconds, spSeconds: sSeconds - pSeconds };
}

// ─────────────────────────────── honesty copy ───────────────────────────────

export const COMPLETENESS_CAVEAT =
  "The frequency-magnitude curve rolls over at the small end. That is not a shortage of small earthquakes and it is not physics: it is the detection limit of the seismometer network. Below the completeness magnitude the catalogue is missing real events, so the fit starts there. Fitting through the rollover would give a confident and wrong b-value.";

export const MAGNITUDE_SCALE_CAVEAT =
  "These magnitudes are not all on the same scale. USGS reports whichever scale suits the event and the available stations (mww, mb, ml and others), and they agree only approximately. Moment magnitude mww is the one that does not saturate for great earthquakes, which is why the moment figure is only shown for events measured that way.";

export const ENERGY_CAVEAT =
  "Energy is computed from magnitude alone by log10 E = 1.5 M + 4.8. It is RADIATED seismic energy, not the total energy released (much of it goes into fracturing rock and into heat), and it says nothing about shaking or damage at any particular place. A deep magnitude 6 under the ocean and a shallow magnitude 6 under a city radiate the same energy and are not the same event.";

export const NO_PREDICTION_CAVEAT =
  "None of this predicts earthquakes. Gutenberg-Richter is a statistical description of a catalogue, not a forecast of when or where the next event will be. Nobody can currently predict individual earthquakes, and a page that implied otherwise would be lying.";

export const MC_METHOD_NOTE =
  "The completeness magnitude used here is the PUBLISHED global one, not a number estimated from the feed, and that is the honest choice rather than the lazy one. A global catalogue is dozens of regional networks with different detection thresholds glued together, so no single completeness magnitude makes it complete, and every data-driven estimator ends up describing a feature of that mixture instead of a detection limit. Run them on this feed and they return cuts down near magnitude 1 to 2 with b-values around 0.3 to 0.5, far below the published global range, with tight-looking uncertainties. Those numbers are shown here precisely because they are wrong: on a mixed catalogue, a confident estimator is the failure mode, not the fix.";

export const PLATE_BOUNDARY_NOTE =
  "This app ships no plate-boundary map. It does not need one: plot a month of real epicentres and the plate boundaries draw themselves, which is how they were found in the first place.";

export const LIVE_DATA_NOTE =
  "Read live from the USGS feeds, public domain and no key required. We deliberately commit no mirror of this one: an orbital element set is a stale state you can still propagate, but a stale list of earthquakes is just yesterday's events shown as today's. If USGS cannot be reached, this tab says so and shows nothing.";
