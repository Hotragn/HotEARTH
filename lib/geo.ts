/**
 * Geographic <-> 3D coordinate conventions for the H.O.T Earth globe.
 *
 * The globe is an unrotated three.js SphereGeometry. Three.js generates
 * sphere vertices as:
 *
 *   x = -r * cos(phi) * sin(theta)
 *   y =  r * cos(theta)
 *   z =  r * sin(phi) * sin(theta)
 *
 * with texture u = phi / 2PI and v running north -> south. For a standard
 * equirectangular Earth texture (u = (lon + 180) / 360, v = (90 - lat) / 180)
 * this works out to the following Earth-fixed frame:
 *
 *   lon   0  (Greenwich)  -> +X
 *   lon +90 (East)        -> -Z
 *   lon -90 (West)        -> +Z
 *   lat +90 (North pole)  -> +Y
 *
 * Everything that converts between lat/lon and 3D (picking, sun direction,
 * markers) MUST go through these two functions so the convention lives in
 * exactly one place. Verified against known cities in lib/geo.test.ts.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export interface LatLon {
  /** degrees, +N */
  lat: number;
  /** degrees, +E, normalized to [-180, 180] */
  lon: number;
}

/** lat/lon in degrees -> position on a sphere of `radius`, as [x, y, z]. */
export function latLonToVector3(
  lat: number,
  lon: number,
  radius = 1
): [number, number, number] {
  const out: [number, number, number] = [0, 0, 0];
  latLonToVector3Into(lat, lon, radius, out, 0);
  return out;
}

/**
 * Allocation-free variant of {@link latLonToVector3} for hot loops (wind
 * particles, city points): writes x,y,z into `out` at `offset`. Same
 * convention, same math — latLonToVector3 delegates here so the convention
 * still lives in exactly one place.
 */
export function latLonToVector3Into(
  lat: number,
  lon: number,
  radius: number,
  out: { [i: number]: number },
  offset: number
): void {
  const latR = lat * DEG2RAD;
  const lonR = lon * DEG2RAD;
  const cosLat = Math.cos(latR);
  out[offset] = radius * cosLat * Math.cos(lonR);
  out[offset + 1] = radius * Math.sin(latR);
  out[offset + 2] = -radius * cosLat * Math.sin(lonR);
}

/** Position in globe-local space -> lat/lon in degrees. */
export function vector3ToLatLon(x: number, y: number, z: number): LatLon {
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  const lat = Math.asin(Math.min(1, Math.max(-1, y / r))) * RAD2DEG;
  const lon = Math.atan2(-z, x) * RAD2DEG;
  return { lat, lon: normalizeLon(lon) };
}

/** Normalize a longitude to [-180, 180). */
export function normalizeLon(lon: number): number {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  // avoid -0
  if (Object.is(l, -0)) l = 0;
  return l;
}

/** "41.90° N · 12.48° E" style label for the HUD. */
export function formatLatLon({ lat, lon }: LatLon): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}° ${ns} · ${Math.abs(lon).toFixed(2)}° ${ew}`;
}

// ─────────────────────── distance along the surface ─────────────────────────

/**
 * Mean Earth radius [km], IUGG R1 = (2a + b) / 3.
 *
 * This is the MEAN radius, and it is the right one for great-circle distance
 * along the surface. It is deliberately not the WGS84 equatorial radius
 * (6378.137 km), which lib/satellites uses because orbital work is referenced
 * to the equatorial figure. Two different numbers for two different jobs; the
 * mistake would be using either for both.
 */
export const EARTH_MEAN_RADIUS_KM = 6371.0088;

/**
 * Great-circle distance between two lat/lon points [km], by the haversine
 * formula.
 *
 * This lives here, with the rest of the lat/lon conventions, because it used to
 * live in two places at once: lib/eclipses and lib/iss-facts each had a copy,
 * with different Earth radii (6371.0088 against 6371) and different null
 * behaviour (one returned null on bad input, the other returned NaN). The
 * numbers only differed by about seven metres over five thousand kilometres, so
 * nothing was visibly wrong, which is exactly what makes that kind of drift
 * worth removing rather than tolerating. Both modules now re-export this.
 *
 * Returns null for any non-finite input, per the project-wide contract.
 */
export function greatCircleKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number | null {
  if (![lat1, lon1, lat2, lon2].every((v) => typeof v === "number" && Number.isFinite(v))) {
    return null;
  }
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLon = (lon2 - lon1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}
