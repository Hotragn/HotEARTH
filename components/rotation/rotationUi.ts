/**
 * Shared constants and formatters for the Rotation tab. All honesty copy lives
 * in lib/rotation so the module and the UI quote the same strings.
 */

/** Clock brass, matching the worlds registry entry. */
export const ROTATION_ACCENT = "#ffd27a";

export const ROTATION_DATA_PATH = "/data/rotation/rotation.json";

export const DRIFT_COLOR = "#ffd27a";
export const LEAP_COLOR = "#8fd0e8";
export const SLOW_COLOR = "#ff9b7a";
export const FAST_COLOR = "#8fe0c0";

export const IERS_PAGE = "https://www.iers.org/";
export const LEAP_PAGE = "https://hpiers.obspm.fr/iers/bul/bulc/";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/**
 * Milliseconds, signed, because the sign is the whole story: positive means the
 * day ran LONG and the Earth is slow.
 */
export function fmtLod(ms: number | null, dp = 2): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "unknown";
  return `${ms >= 0 ? "+" : ""}${ms.toFixed(dp)} ms`;
}

export function fmtSeconds(s: number | null, dp = 3): string {
  if (typeof s !== "number" || !Number.isFinite(s)) return "unknown";
  return `${s >= 0 ? "+" : ""}${s.toFixed(dp)} s`;
}

export function fmtYears(y: number | null, dp = 1): string {
  if (typeof y !== "number" || !Number.isFinite(y)) return "unknown";
  return `${y.toFixed(dp)} years`;
}

/** "long" or "short", which is what a reader actually wants to know. */
export function dayWords(ms: number | null): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "not measured";
  if (ms > 0.05) return "longer than 86,400 seconds";
  if (ms < -0.05) return "shorter than 86,400 seconds";
  return "almost exactly 86,400 seconds";
}

/** A date string for display, from an ISO day. */
export function fmtDay(iso: string | null): string {
  if (!iso) return "unknown";
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Decimal year from an ISO day, for plotting. */
export function yearOf(iso: string): number {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10)) || 1;
  if (!Number.isFinite(y)) return NaN;
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (Date.UTC(y, (m || 1) - 1, d) - start) / (end - start);
}
