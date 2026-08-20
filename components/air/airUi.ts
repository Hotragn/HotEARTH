/**
 * Shared constants and formatters for the Air tab. All honesty copy lives in
 * lib/air so the physics module and the UI quote the same strings.
 */

import type { EuCategory, Pollutant, UsCategory } from "@/lib/air";

/** Hazy atmospheric blue, matching the worlds registry entry. */
export const AIR_ACCENT = "#8fd0e8";

/**
 * The Open-Meteo air quality endpoint: keyless, CORS open, a few KB.
 *
 * `past_days=1` is asked for so the chart has somewhere to start: a reading
 * with no history behind it cannot show whether the air is clearing or closing
 * in, which is the thing you actually want to know.
 */
export const AIR_FEED_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";

export function airFeedUrl(latDeg: number, lonDeg: number): string {
  const p = new URLSearchParams({
    latitude: latDeg.toFixed(4),
    longitude: lonDeg.toFixed(4),
    current: "pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,us_aqi,european_aqi",
    hourly: "pm2_5,us_aqi,european_aqi",
    past_days: "1",
    forecast_days: "2",
    timezone: "auto",
  });
  return `${AIR_FEED_BASE}?${p.toString()}`;
}

export const CAMS_CREDIT =
  "Copernicus Atmosphere Monitoring Service (CAMS) forecasts, served by Open-Meteo. CAMS data are free to use with attribution; neither requires an API key.";
export const OPEN_METEO_PAGE = "https://open-meteo.com/en/docs/air-quality-api";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/** US AQI category colours, following the EPA's own published palette. */
export const US_CATEGORY_COLOR: Record<UsCategory, string> = {
  Good: "#7dffc0",
  Moderate: "#ffe06b",
  "Unhealthy for sensitive groups": "#ffab5e",
  Unhealthy: "#ff6b6b",
  "Very unhealthy": "#c77dff",
  Hazardous: "#c1666b",
};

/** European band colours, following the EEA's published palette. */
export const EU_CATEGORY_COLOR: Record<EuCategory, string> = {
  Good: "#5ce6c0",
  Fair: "#a8e05f",
  Moderate: "#ffe06b",
  Poor: "#ff9b5e",
  "Very poor": "#ff5e5e",
  "Extremely poor": "#a15e8f",
};

/** Short chemical labels for the compact rows. */
export const POLLUTANT_SHORT: Record<Pollutant, string> = {
  pm2_5: "PM2.5",
  pm10: "PM10",
  ozone: "O₃",
  nitrogen_dioxide: "NO₂",
  sulphur_dioxide: "SO₂",
  carbon_monoxide: "CO",
};

// ─────────────────────────────── formatters ─────────────────────────────────

export function fmtUgm3(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  if (v >= 1000) return `${Math.round(v).toLocaleString()} µg/m³`;
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} µg/m³`;
}

export function fmtPpb(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ppb`;
}

export function fmtAqi(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "--";
  return String(Math.round(v));
}

/** "1.4x the WHO daily guideline" / "well under". */
export function fmtWho(times: number | null): string {
  if (typeof times !== "number" || !Number.isFinite(times)) return "no WHO daily guideline";
  if (times < 0.5) return `${times.toFixed(2)}x the WHO daily guideline`;
  if (times < 1) return `${times.toFixed(2)}x the WHO daily guideline, under it`;
  return `${times.toFixed(times < 10 ? 1 : 0)}x the WHO daily guideline`;
}

export function fmtClock(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtWhen(d: Date | null): string {
  if (!d || !Number.isFinite(d.getTime())) return "unknown";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
