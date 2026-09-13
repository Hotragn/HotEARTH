/**
 * Shared constants and formatters for the Rivers tab. All honesty copy lives in
 * lib/rivers so the module and the UI quote the same strings.
 */

/** River blue-green, matching the worlds registry entry. */
export const RIVERS_ACCENT = "#5fd3e6";

export const RIVERS_DATA_PATH = "/data/rivers/rivers.json";

export const CURVE_COLOR = "#5fd3e6";
export const BAND_COLOR = "#5fd3e6";
export const RECORD_COLOR = "#ffd27a";
export const REGULATED_COLOR = "#ff9b7a";
export const HISTORIC_COLOR = "#b98bff";

export const USGS_PEAK_PAGE = "https://nwis.waterdata.usgs.gov/usa/nwis/peak";
export const USGS_NWIS_PAGE = "https://waterdata.usgs.gov/nwis";
export { DOCS_BASE } from "@/lib/repo";

/** Return periods the curve is drawn at, log-spaced. */
export const CURVE_RETURN_PERIODS: number[] = (() => {
  const out: number[] = [];
  for (let e = 0.05; e <= 3.0001; e += 0.05) out.push(10 ** e);
  return out;
})();

/** Cubic feet per second, grouped, because these numbers run to seven digits. */
export function fmtCfs(cfs: number | null, dp = 0): string {
  if (typeof cfs !== "number" || !Number.isFinite(cfs)) return "unknown";
  return `${Math.round(cfs).toLocaleString("en-US")} cfs`;
}

/** The same discharge in the units the rest of the site uses. */
export function fmtCumecs(cfs: number | null): string {
  if (typeof cfs !== "number" || !Number.isFinite(cfs)) return "unknown";
  const v = cfs * 0.028316846592;
  return `${Math.round(v).toLocaleString("en-US")} m\u00b3/s`;
}

export function fmtPercent(p: number | null, dp = 1): string {
  if (typeof p !== "number" || !Number.isFinite(p)) return "unknown";
  return `${(100 * p).toFixed(dp)}%`;
}

/**
 * A return period in words.
 *
 * Past the ceiling the module stops returning a number, and so does this: "more
 * than a million years" is not a fact about a river, it is the curve saying it
 * has left the data behind.
 */
export function fmtReturn(years: number | null, ceiling = 1_000_000): string {
  if (typeof years !== "number" || !Number.isFinite(years)) return "unknown";
  if (years >= ceiling) return "off the end of the curve";
  if (years >= 10_000) return `about ${Math.round(years / 1000).toLocaleString("en-US")},000 years`;
  if (years >= 1000) return `about ${Math.round(years / 100) * 100} years`;
  if (years >= 100) return `about ${Math.round(years / 10) * 10} years`;
  return `about ${Math.round(years)} years`;
}

/** "1 in 100", which reads better than "100-year" and is the same thing. */
export function fmtOdds(returnYears: number): string {
  return `1 in ${Math.round(returnYears).toLocaleString("en-US")}`;
}

export function fmtArea(sqMi: number | null): string {
  if (typeof sqMi !== "number" || !Number.isFinite(sqMi)) return "unknown";
  const sqKm = sqMi * 2.589988110336;
  return `${Math.round(sqKm).toLocaleString("en-US")} km\u00b2`;
}
