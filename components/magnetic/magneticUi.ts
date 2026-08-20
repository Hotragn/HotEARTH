/**
 * Shared constants and formatters for the Magnetic tab. All honesty copy lives
 * in lib/geomagnetism so the module and the UI quote the same strings.
 */

/** Compass-needle red, matching the worlds registry entry. */
export const MAGNETIC_ACCENT = "#ff7a7a";

/** East and west declination get opposite colours, because the sign is the point. */
export const EAST_COLOR = "#6fd3ff";
export const WEST_COLOR = "#ff8b6b";
export const AGONIC_COLOR = "#f5f3ef";

export const MAGNETIC_DATA_PATH = "/data/magnetic/igrf14.json";

export const IGRF_PAGE =
  "https://www.ncei.noaa.gov/products/international-geomagnetic-reference-field";
export const POLES_PAGE = "https://www.ncei.noaa.gov/products/wandering-geomagnetic-poles";
export const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

/** Decimal year from an instant, for a model whose time axis is years. */
export function decimalYear(d: Date): number {
  const y = d.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - start) / (end - start);
}

export function fmtNanotesla(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${Math.round(v).toLocaleString()} nT`;
}

export function fmtMicrotesla(v: number | null): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${(v / 1000).toFixed(1)} \u00b5T`;
}

export function fmtDegrees(v: number | null, dp = 1): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v.toFixed(dp)}\u00b0`;
}

/** Signed, for a rate where the direction of drift is the information. */
export function fmtRate(v: number | null, unit: string, dp = 2): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "unknown";
  return `${v >= 0 ? "+" : ""}${v.toFixed(dp)} ${unit}`;
}

/** "48.2 N, 12.7 W" rather than signed decimals, which read as data not places. */
export function fmtPlace(latDeg: number | null, lonDeg: number | null): string {
  if (
    typeof latDeg !== "number" ||
    typeof lonDeg !== "number" ||
    !Number.isFinite(latDeg) ||
    !Number.isFinite(lonDeg)
  ) {
    return "unknown";
  }
  const ns = latDeg >= 0 ? "N" : "S";
  const ew = lonDeg >= 0 ? "E" : "W";
  return `${Math.abs(latDeg).toFixed(2)}\u00b0 ${ns}, ${Math.abs(lonDeg).toFixed(2)}\u00b0 ${ew}`;
}

/** A bearing as a compass point, for the "your compass says" line. */
export function compassPoint(bearing: number | null): string {
  if (typeof bearing !== "number" || !Number.isFinite(bearing)) return "unknown";
  const names = [
    "north", "north-northeast", "northeast", "east-northeast",
    "east", "east-southeast", "southeast", "south-southeast",
    "south", "south-southwest", "southwest", "west-southwest",
    "west", "west-northwest", "northwest", "north-northwest",
  ];
  const i = Math.round((((bearing % 360) + 360) % 360) / 22.5) % 16;
  return names[i];
}
