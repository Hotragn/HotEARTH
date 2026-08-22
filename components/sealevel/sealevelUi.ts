/**
 * Shared constants and formatters for the Sea Level tab. All honesty copy lives
 * in lib/sealevel so the module and the UI quote the same strings.
 */

/** Altimeter blue, matching the worlds registry entry. */
export const SEALEVEL_ACCENT = "#7fc4ff";

export const SEALEVEL_DATA_PATH = "/data/sealevel/sea-level.json";

export const RISING_COLOR = "#ff8b6b";
export const FALLING_COLOR = "#8fe0c0";
export const GLOBAL_COLOR = "#7fc4ff";

/** One colour per satellite, in flight order. */
export const MISSION_COLORS = ["#7fc4ff", "#a8e05f", "#ffc46b", "#ff9b7a", "#c9a0ff"];

export const NOAA_PAGE = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/";
export const PSMSL_PAGE = "https://psmsl.org/data/obtaining/";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/** A rate with its sign, because at three of these stations the sign is the story. */
export function fmtRate(mmPerYear: number | null, dp = 2): string {
  if (typeof mmPerYear !== "number" || !Number.isFinite(mmPerYear)) return "unknown";
  return `${mmPerYear >= 0 ? "+" : ""}${mmPerYear.toFixed(dp)} mm/yr`;
}

export function fmtRateWithError(
  mmPerYear: number | null,
  stdErr: number | null,
  dp = 2
): string {
  if (typeof mmPerYear !== "number" || !Number.isFinite(mmPerYear)) return "unknown";
  const base = `${mmPerYear >= 0 ? "+" : ""}${mmPerYear.toFixed(dp)}`;
  if (typeof stdErr !== "number" || !Number.isFinite(stdErr)) return `${base} mm/yr`;
  return `${base} \u00b1 ${stdErr.toFixed(dp)} mm/yr`;
}

/**
 * The same rate as a century, which is the unit people actually think in.
 *
 * Explicitly labelled as arithmetic rather than a forecast wherever it appears:
 * multiplying a current rate by a hundred years assumes the rate holds, and the
 * whole point of the acceleration panel is that it has not.
 */
export function fmtPerCentury(mmPerYear: number | null): string {
  if (typeof mmPerYear !== "number" || !Number.isFinite(mmPerYear)) return "unknown";
  const cm = (mmPerYear * 100) / 10;
  return `${cm >= 0 ? "+" : ""}${cm.toFixed(0)} cm`;
}

export function fmtMm(v: number | null, dp = 1): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(dp)} mm`;
}

export function fmtYear(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return String(Math.floor(v));
}

/** "48.4 N, 4.5 W" rather than signed decimals. */
export function fmtPlace(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}\u00b0 ${ns}, ${Math.abs(lon).toFixed(1)}\u00b0 ${ew}`;
}

/** Plain words for what a residual rate implies about the ground. */
export function landWords(mmPerYear: number | null): string {
  if (typeof mmPerYear !== "number" || !Number.isFinite(mmPerYear)) return "not estimated";
  if (mmPerYear > 1) return "ground rising";
  if (mmPerYear < -1) return "ground sinking";
  return "ground roughly steady";
}
