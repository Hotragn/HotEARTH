/**
 * Shared constants and formatters for the Seismic Earth tab.
 *
 * All honesty copy lives in lib/quakes so the physics module and the UI quote
 * the same strings; this file is presentation only.
 */

import type { DepthClass } from "@/lib/quakes";

/** Magma orange, matching the worlds registry entry. */
export const QUAKES_ACCENT = "#ff8b5e";

/**
 * The two USGS feeds this tab reads.
 *
 * `all_day` is the last 24 hours, and drives the live list. `all_week` is the
 * statistical sample: a single day does not hold enough events above the
 * completeness magnitude to fit a slope through with a straight face.
 *
 * `all_week` is used rather than the smaller `2.5_week` on purpose, even though
 * it is about 1.4 MB. The 2.5+ feed is PRE-TRUNCATED at magnitude 2.5, which
 * destroys exactly the thing this tab is about: with the small end cut off,
 * there is no rollover to see and any completeness estimator just returns the
 * feed's own threshold. The full feed shows the real shape.
 */
export const FEED_DAY = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
export const FEED_WEEK = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

export const USGS_CREDIT =
  "U.S. Geological Survey, Earthquake Hazards Program. USGS data are in the public domain.";
export const USGS_FEED_PAGE = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php";

/** Depth colours: hot and shallow through to cold and deep. */
export const DEPTH_COLOR: Record<DepthClass, string> = {
  shallow: "#ff6b4a",
  intermediate: "#ffc46b",
  deep: "#6fb7ff",
};

export const DEPTH_LABEL: Record<DepthClass, string> = {
  shallow: "shallow, under 70 km",
  intermediate: "intermediate, 70 to 300 km",
  deep: "deep, over 300 km",
};

/** Docs base for the footer links (same convention as the other tabs). */
export { DOCS_BASE } from "@/lib/repo";

// ─────────────────────────────── formatters ─────────────────────────────────

export function fmtMag(mag: number | null): string {
  if (typeof mag !== "number" || !Number.isFinite(mag)) return "unknown";
  return mag.toFixed(1);
}

export function fmtDepth(km: number | null): string {
  if (typeof km !== "number" || !Number.isFinite(km)) return "unknown";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function fmtDistance(km: number | null): string {
  if (typeof km !== "number" || !Number.isFinite(km)) return "unknown";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** Local clock time, with the date when it is not today. */
export function fmtWhen(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "2 h 14 m ago", the way a live feed should read. */
export function fmtAgo(d: Date | null, now: Date): string {
  if (!d || !Number.isFinite(d.getTime())) return "";
  const minutes = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} m ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} h ago`;
}

/** Seconds as "1 min 12 s", for wave arrival times. */
export function fmtSeconds(s: number | null): string {
  if (typeof s !== "number" || !Number.isFinite(s)) return "unknown";
  if (s < 60) return `${s.toFixed(0)} s`;
  return `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

/** Energy in joules, in readable scientific form. */
export function fmtJoules(j: number | null): string {
  if (typeof j !== "number" || !Number.isFinite(j) || j <= 0) return "unknown";
  const exp = Math.floor(Math.log10(j));
  const mantissa = j / Math.pow(10, exp);
  return `${mantissa.toFixed(1)} x 10^${exp} J`;
}

/** A large multiplier, readable: "32x", "1,000x", "3.2 million x". */
export function fmtRatio(r: number | null): string {
  if (typeof r !== "number" || !Number.isFinite(r) || r <= 0) return "unknown";
  // Below 1 the multiplier form is useless ("0.0x"), so invert it and say so.
  // Most events in the feed are far SMALLER than the magnitude 5 reference, and
  // rounding that comparison to zero throws away the entire point of it.
  if (r < 1) return `1 / ${fmtRatio(1 / r)}`.replace("x", "");
  if (r < 1000) return `${r < 10 ? r.toFixed(1) : Math.round(r).toLocaleString()}x`;
  if (r < 1e6) return `${Math.round(r).toLocaleString()}x`;
  if (r < 1e9) return `${(r / 1e6).toFixed(1)} million x`;
  return `${(r / 1e9).toFixed(1)} billion x`;
}

/**
 * An energy figure in terms someone can picture, picking a reference that suits
 * the size. Comparing a magnitude 1 to the Hiroshima device gives "about 0%",
 * which is true, useless, and slightly absurd.
 */
export function energyInHumanTerms(joules: number | null): string | null {
  if (typeof joules !== "number" || !Number.isFinite(joules) || joules <= 0) {
    return null;
  }
  const HIROSHIMA = 6.276e13;
  const KWH = 3.6e6;
  if (joules >= 0.05 * HIROSHIMA) {
    const n = joules / HIROSHIMA;
    return n >= 1
      ? `about ${fmtRatio(n)} the energy of the Hiroshima device`
      : `about ${(n * 100).toFixed(0)}% of the energy of the Hiroshima device`;
  }
  const kwh = joules / KWH;
  if (kwh >= 1000) {
    return `about ${Math.round(kwh).toLocaleString()} kWh, roughly what a few homes use in a year`;
  }
  if (kwh >= 1) {
    return `about ${kwh.toFixed(1)} kWh, less than an electric oven uses in an evening`;
  }
  return `about ${(kwh * 1000).toFixed(0)} watt-hours, about what a laptop draws in an hour`;
}
