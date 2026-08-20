/**
 * Shared constants and formatters for the Carbon tab. All honesty copy lives in
 * lib/carbon so the module and the UI quote the same strings.
 */

import type { GasSeriesId } from "@/lib/carbon";

/** Keeling-curve amber, matching the worlds registry entry. */
export const CARBON_ACCENT = "#ffc46b";

export const CARBON_DATA_PATH = "/data/carbon/greenhouse-gases.json";

export const SERIES_COLOR: Record<GasSeriesId, string> = {
  co2_mlo: "#8fd0e8",
  co2_glob: "#a8e05f",
  ch4_glob: "#ff9b7a",
};

export const NOAA_PAGE = "https://gml.noaa.gov/ccgg/trends/";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function fmtConc(v: number | null, unit: string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(unit === "ppb" ? 0 : 2)} ${unit}`;
}

/** Signed departure, for the seasonal cycle where the sign is the point. */
export function fmtDeparture(v: number | null, unit: string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)} ${unit}`;
}

export function fmtGrowth(v: number | null, unit: string): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)} ${unit}/yr`;
}

export function fmtMultiple(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(2)}x`;
}

export function fmtMonth(m: number | null): string {
  if (typeof m !== "number" || !Number.isFinite(m) || m < 1 || m > 12) return "unknown";
  return MONTH_SHORT[m - 1];
}
