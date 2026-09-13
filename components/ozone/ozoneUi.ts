/**
 * Shared constants and formatters for the Ozone tab. All honesty copy lives in
 * lib/ozone so the module and the UI quote the same strings.
 */

/** Ultraviolet violet, matching the worlds registry entry. */
export const OZONE_ACCENT = "#c08bff";

export const OZONE_DATA_PATH = "/data/ozone/ozone.json";

/** The hole, the chemicals, and the two things being compared. */
export const HOLE_COLOR = "#c08bff";
export const COLUMN_COLOR = "#8fd8ff";
export const CHEM_COLOR = "#ff9b7a";
export const BENCHMARK_COLOR = "#7dffc0";
export const VORTEX_COLOR = "#ffd27a";

export const OZONE_WATCH_PAGE = "https://ozonewatch.gsfc.nasa.gov/";
export const ODGI_PAGE = "https://gml.noaa.gov/odgi/";
export const DOBSON_PAGE = "https://gml.noaa.gov/ozwv/dobson/";
export { DOCS_BASE } from "@/lib/repo";

export const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Three letters, for a table column head. */
export function monthName(m: number): string {
  return MONTH_NAMES[m - 1] ?? "?";
}

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** The whole word, for a sentence. An abbreviation inside prose reads badly. */
export function fullMonth(m: number): string {
  return FULL_MONTHS[m - 1] ?? "an unknown month";
}

export function fmtDu(du: number | null, dp = 0): string {
  if (typeof du !== "number" || !Number.isFinite(du)) return "unknown";
  return `${du.toFixed(dp)} DU`;
}

/** Signed, because a percentage of ozone that went missing needs its sign. */
export function fmtPercent(p: number | null, dp = 1): string {
  if (typeof p !== "number" || !Number.isFinite(p)) return "unknown";
  return `${p >= 0 ? "+" : ""}${p.toFixed(dp)}%`;
}

export function fmtPpt(v: number | null, dp = 0): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(dp)} ppt`;
}

export function fmtArea(v: number | null, dp = 1): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(dp)} million km\u00b2`;
}

/**
 * How many standard errors a slope is from zero, in words.
 *
 * The whole tab turns on this. Under two, a fitted line is not evidence of
 * anything, and saying so plainly is better than printing a number and letting
 * the reader assume it means something.
 */
export function sigmaWords(sigma: number | null): string {
  if (typeof sigma !== "number" || !Number.isFinite(sigma)) return "not measurable";
  if (sigma < 1) return "indistinguishable from no trend";
  if (sigma < 2) return "not distinguishable from noise";
  if (sigma < 3) return "suggestive, short of the usual bar";
  return "clear of the noise";
}

/** A trend's slope with its standard error, in one string. */
export function fmtSlope(
  slope: number | null,
  stderr: number | null,
  unit: string,
  dp = 3
): string {
  if (typeof slope !== "number" || !Number.isFinite(slope)) return "unknown";
  if (typeof stderr !== "number" || !Number.isFinite(stderr)) {
    return `${slope >= 0 ? "+" : ""}${slope.toFixed(dp)} ${unit}`;
  }
  return `${slope >= 0 ? "+" : ""}${slope.toFixed(dp)} \u00b1 ${stderr.toFixed(dp)} ${unit}`;
}
