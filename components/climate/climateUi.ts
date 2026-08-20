/**
 * Shared constants and formatters for the Climate tab. All honesty copy lives in
 * lib/climate so the module and the UI quote the same strings.
 */

import type { SeriesId } from "@/lib/climate";

/** Warming red, matching the worlds registry entry. */
export const CLIMATE_ACCENT = "#ff9b7a";

export const CLIMATE_DATA_PATH = "/data/climate/global-temperature.json";

export const SERIES_COLOR: Record<SeriesId, string> = {
  gistemp: "#8fd0e8",
  hadcrut5: "#ff9b7a",
};

export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";
export const GISTEMP_PAGE = "https://data.giss.nasa.gov/gistemp/";
export const HADCRUT_PAGE = "https://www.metoffice.gov.uk/hadobs/hadcrut5/";

/** Signed anomaly, always with its sign, because the sign is the whole point. */
export function fmtAnomaly(v: number | null, digits = 2): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)} °C`;
}

/** A trend with its error bar, which should never be quoted without one. */
export function fmtTrend(perDecade: number | null, stdErr: number | null): string {
  if (typeof perDecade !== "number" || !Number.isFinite(perDecade)) return "unknown";
  const base = `${perDecade >= 0 ? "+" : ""}${perDecade.toFixed(3)} °C/decade`;
  if (typeof stdErr !== "number" || !Number.isFinite(stdErr)) return base;
  return `${base} ± ${stdErr.toFixed(3)}`;
}

export function fmtBaseline(range: [number, number] | null): string {
  if (!range) return "unknown";
  return `${range[0]} to ${range[1]}`;
}

export function fmtPercent(fraction: number | null): string {
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return "unknown";
  return `${Math.round(fraction * 100)}%`;
}
