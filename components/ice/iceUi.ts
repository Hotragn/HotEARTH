/**
 * Shared constants and formatters for the Ice tab. All honesty copy lives in
 * lib/seaice so the module and the UI quote the same strings.
 */

import type { Hemisphere } from "@/lib/seaice";

/** Pack-ice blue, matching the worlds registry entry. */
export const ICE_ACCENT = "#8fd8ff";

export const ICE_DATA_PATH = "/data/ice/sea-ice.json";

export const HEMI_LABEL: Record<Hemisphere, string> = {
  north: "Arctic",
  south: "Antarctic",
};

/** The extent line, the area line, and the historical band. */
export const EXTENT_COLOR = "#8fd8ff";
export const AREA_COLOR = "#a8e05f";
export const RECORD_COLOR = "#ff8b6b";

export const NSIDC_PAGE = "https://nsidc.org/sea-ice-today";
export const NSIDC_DATA_PAGE = "https://nsidc.org/data/g02135";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/** Millions of square km, the unit the whole dataset is in. */
export function fmtExtent(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(2)} million km²`;
}

export function fmtShort(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "--";
  return v.toFixed(2);
}

/** A trend with its error bar. The two never appear apart on this tab. */
export function fmtTrend(perDecade: number | null, stdErr: number | null): string {
  if (typeof perDecade !== "number" || !Number.isFinite(perDecade)) return "unknown";
  const base = `${perDecade >= 0 ? "+" : ""}${perDecade.toFixed(2)}`;
  if (typeof stdErr !== "number" || !Number.isFinite(stdErr)) return base;
  return `${base} ± ${stdErr.toFixed(2)}`;
}

export function fmtPercent(v: number | null, dp = 1): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(dp)}%`;
}

/**
 * How many standard errors a slope sits from zero.
 *
 * Given as a number with a plain-language reading beside it, because "2.3 sigma"
 * means nothing to most readers and "significant, but only just" means
 * everything.
 */
export function sigma(perDecade: number | null, stdErr: number | null): number | null {
  if (
    typeof perDecade !== "number" ||
    typeof stdErr !== "number" ||
    !Number.isFinite(perDecade) ||
    !Number.isFinite(stdErr) ||
    stdErr <= 0
  ) {
    return null;
  }
  return Math.abs(perDecade) / stdErr;
}

export function sigmaWords(s: number | null): string {
  if (s === null) return "not measurable";
  if (s < 1) return "indistinguishable from no change";
  if (s < 2) return "not significant";
  if (s < 3) return "significant, but only just";
  if (s < 6) return "clearly significant";
  return "far beyond any doubt";
}

/** "3rd lowest" reads better than "rank 3". */
export function ordinal(n: number | null): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "unknown";
  const i = Math.round(n);
  const mod100 = i % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${i}th`;
  switch (i % 10) {
    case 1:
      return `${i}st`;
    case 2:
      return `${i}nd`;
    case 3:
      return `${i}rd`;
    default:
      return `${i}th`;
  }
}
