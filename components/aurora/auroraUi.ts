/**
 * Shared constants and formatters for the Aurora tab.
 *
 * All honesty copy lives in lib/aurora so the physics module and the UI quote
 * the same strings; this file is presentation only.
 */

import type { AuroraChance } from "@/lib/aurora";

/** Auroral green, matching the worlds registry entry. */
export const AURORA_ACCENT = "#5ce6a5";

/**
 * The NOAA SWPC endpoints. Public domain, no key, CORS open.
 *
 * The OVATION grid is about 900 KB, which is the price of showing the real
 * model output rather than drawing our own oval from a formula and calling it a
 * forecast. The other three are a few kilobytes between them.
 */
export const FEED_KP_MINUTE =
  "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
export const FEED_KP_FORECAST =
  "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
export const FEED_OVATION =
  "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json";
export const FEED_WIND_SPEED =
  "https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json";
export const FEED_WIND_MAG =
  "https://services.swpc.noaa.gov/products/summary/solar-wind-mag-field.json";

export const SWPC_CREDIT =
  "NOAA Space Weather Prediction Center. US Government work in the public domain.";
export const SWPC_PAGE = "https://www.swpc.noaa.gov/products/aurora-30-minute-forecast";

/** Docs base for footer links (same convention as the other tabs). */
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/** Verdict colours: from "go outside" green down to a muted "not tonight". */
export const CHANCE_COLOR: Record<AuroraChance, string> = {
  overhead: "#5ce6a5",
  horizon: "#b8e986",
  "red-only": "#ff8b5e",
  "too-far": "#7c8798",
};

/**
 * Probability to colour for the modelled oval, from the faint edge to the
 * bright core. Deliberately green through to red because that is the real
 * colour progression of a brightening aurora, not an arbitrary heat map.
 */
export function probabilityColor(p: number): string {
  const t = Math.max(0, Math.min(1, p / 60));
  if (t < 0.4) {
    // faint: deep green
    const k = t / 0.4;
    return `rgb(${Math.round(30 + 40 * k)}, ${Math.round(150 + 70 * k)}, ${Math.round(110 + 20 * k)})`;
  }
  if (t < 0.75) {
    // bright: green to yellow-white
    const k = (t - 0.4) / 0.35;
    return `rgb(${Math.round(70 + 150 * k)}, ${Math.round(220 + 20 * k)}, ${Math.round(130 + 40 * k)})`;
  }
  // intense: through to the red upper emission
  const k = (t - 0.75) / 0.25;
  return `rgb(${Math.round(220 + 35 * k)}, ${Math.round(240 - 110 * k)}, ${Math.round(170 - 90 * k)})`;
}

// ─────────────────────────────── formatters ─────────────────────────────────

export function fmtKp(kp: number | null): string {
  if (typeof kp !== "number" || !Number.isFinite(kp)) return "unknown";
  return kp.toFixed(2).replace(/\.00$/, "");
}

export function fmtLat(deg: number | null): string {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return "unknown";
  const hemi = deg >= 0 ? "N" : "S";
  return `${Math.abs(deg).toFixed(1)}° ${hemi}`;
}

export function fmtDegrees(deg: number | null): string {
  if (typeof deg !== "number" || !Number.isFinite(deg)) return "unknown";
  return `${Math.abs(deg).toFixed(1)}°`;
}

export function fmtPercent(p: number | null): string {
  if (typeof p !== "number" || !Number.isFinite(p)) return "unknown";
  return `${Math.round(p)}%`;
}

export function fmtTimeUtc(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** "in 42 min" / "12 min ago", for a forecast that is only an hour long. */
export function fmtRelative(d: Date | null, now: Date): string {
  if (!d || !Number.isFinite(d.getTime())) return "";
  const min = Math.round((d.getTime() - now.getTime()) / 60000);
  if (Math.abs(min) < 1) return "now";
  if (min > 0) return min < 60 ? `in ${min} min` : `in ${Math.round(min / 60)} h`;
  const ago = -min;
  return ago < 60 ? `${ago} min ago` : `${Math.round(ago / 60)} h ago`;
}

export function fmtSpeed(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${Math.round(v)} km/s`;
}

export function fmtNt(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(1)} nT`;
}
