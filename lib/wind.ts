/**
 * GFS wind-field grid: parsing + bilinear sampling.
 *
 * Data contract (scripts/wind/README.md, "Coordinate convention"): flat
 * row-major arrays, row 0 = North Pole, longitudes start at 0°E and run
 * east with NO duplicate column at 360° — consumers must wrap the
 * antimeridian themselves. For index k:
 *
 *   lat = la1 - floor(k / nx) * dy     (90 .. -90)
 *   lon = lo1 + (k % nx) * dx          (0 .. 359, degrees east)
 *
 * u > 0 blows toward the east, v > 0 toward the north, both m/s.
 * Sampling is unit-tested in lib/wind.test.ts (known grid values ->
 * interpolated vector, including the 359°E -> 0°E wrap).
 */

export interface WindMeta {
  source: string;
  /** GFS cycle time, ISO 8601 UTC — shown in the HUD when the layer is on */
  cycle: string;
  forecast_hour: number;
  generated: string;
  resolution: number;
  units: string;
}

export interface WindField {
  meta: WindMeta;
  nx: number;
  ny: number;
  lo1: number;
  la1: number;
  dx: number;
  dy: number;
  u: Float32Array;
  v: Float32Array;
}

interface WindJson {
  meta: WindMeta;
  nx: number;
  ny: number;
  lo1: number;
  la1: number;
  dx: number;
  dy: number;
  u: number[];
  v: number[];
}

/** Validate the raw JSON and repack u/v as Float32Array for the sim loop. */
export function parseWindField(json: unknown): WindField {
  const j = json as WindJson;
  const expected = j?.nx * j?.ny;
  if (
    !j ||
    !Number.isFinite(expected) ||
    !Array.isArray(j.u) ||
    !Array.isArray(j.v) ||
    j.u.length !== expected ||
    j.v.length !== expected
  ) {
    throw new Error("wind JSON does not match the documented grid schema");
  }
  return {
    meta: j.meta,
    nx: j.nx,
    ny: j.ny,
    lo1: j.lo1,
    la1: j.la1,
    dx: j.dx,
    dy: j.dy,
    u: Float32Array.from(j.u),
    v: Float32Array.from(j.v),
  };
}

/**
 * Bilinear interpolation of the wind vector at (lat, lon).
 *
 * Writes [u, v] (m/s) into `out` — no allocation, safe for per-particle
 * per-frame use. Longitude accepts any convention (-180..180 or 0..360)
 * and wraps across the antimeridian (between the last column and column 0).
 * Latitude is clamped to the grid (rows exist for exactly ±90).
 */
export function sampleWind(
  field: WindField,
  lat: number,
  lon: number,
  out: { [i: number]: number }
): void {
  const { nx, ny, lo1, la1, dx, dy, u, v } = field;

  // fractional row: 0 at la1 (north), increasing southward
  let r = (la1 - lat) / dy;
  if (r < 0) r = 0;
  else if (r > ny - 1) r = ny - 1;
  let r0 = Math.floor(r);
  if (r0 > ny - 2) r0 = ny - 2; // keep r0+1 in range when lat = south edge
  const fr = r - r0;

  // fractional column: wraps modulo nx (no duplicate 360° column)
  let c = (lon - lo1) / dx;
  c = ((c % nx) + nx) % nx;
  const c0 = Math.floor(c) % nx;
  const c1 = (c0 + 1) % nx; // antimeridian wrap: last column -> column 0
  const fc = c - Math.floor(c);

  const i00 = r0 * nx + c0;
  const i01 = r0 * nx + c1;
  const i10 = (r0 + 1) * nx + c0;
  const i11 = (r0 + 1) * nx + c1;

  const w00 = (1 - fr) * (1 - fc);
  const w01 = (1 - fr) * fc;
  const w10 = fr * (1 - fc);
  const w11 = fr * fc;

  out[0] = u[i00] * w00 + u[i01] * w01 + u[i10] * w10 + u[i11] * w11;
  out[1] = v[i00] * w00 + v[i01] * w01 + v[i10] * w10 + v[i11] * w11;
}

const M_PER_DEG = 111_320; // meters per degree of latitude (spherical Earth)
const MIN_COS_LAT = 0.05; // avoid the polar singularity in the lon step

/**
 * Advect a lat/lon by wind (u, v) over `seconds` of simulated time.
 * Applies the cos(lat) correction so eastward displacement in degrees grows
 * toward the poles. Writes [lat, lon] into `out` (lon normalized to
 * [-180, 180)); allocation-free.
 */
export function advectLatLon(
  lat: number,
  lon: number,
  uMs: number,
  vMs: number,
  seconds: number,
  out: { [i: number]: number }
): void {
  const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), MIN_COS_LAT);
  const newLat = lat + (vMs * seconds) / M_PER_DEG;
  let newLon = lon + (uMs * seconds) / (M_PER_DEG * cosLat);
  newLon = ((((newLon + 180) % 360) + 360) % 360) - 180;
  out[0] = newLat;
  out[1] = newLon;
}

/** "2026-07-06 06z" style label for the GFS cycle readout in the HUD. */
export function formatCycle(cycleIso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})/.exec(cycleIso);
  if (!m) return cycleIso;
  return `${m[1]} ${m[2]}z`;
}

/* ------------------------------------------------------------- where it lives */

/**
 * The committed copy, inside the deployment. Always present, possibly stale.
 *
 * This is the floor, not the source. It stops changing the moment the wind
 * workflow publishes to the `data` branch instead of main, so treat it as "some
 * wind field" rather than "the current one". The globe already prints the
 * cycle it is drawing, so a stale fallback shows its age on screen.
 */
export const WIND_FALLBACK_PATH = "/data/wind/current.json";

/**
 * The live mirror, outside the deployment.
 *
 * Defaults to the `data` branch over raw.githubusercontent.com, which sends
 * Access-Control-Allow-Origin: * and Cache-Control: max-age=300. Override with
 * NEXT_PUBLIC_WIND_URL to serve it from a blob or a CDN instead; the code does
 * not care which, so moving it later is an environment variable rather than a
 * change here.
 *
 * raw.githubusercontent.com is not a CDN and has no traffic guarantee. That is
 * an acceptable trade for a six-hourly 550 kB file on a site of this size, and
 * it is the reason the fallback above exists rather than being decoration.
 */
export const WIND_REMOTE_URL =
  process.env.NEXT_PUBLIC_WIND_URL ??
  "https://raw.githubusercontent.com/Hotragn/HotEARTH/data/wind/current.json";

/** Which copy a field came from, so the UI can say. */
export type WindSource = "remote" | "committed";

export interface WindFetch {
  field: WindField;
  source: WindSource;
}

/**
 * Fetch the wind field, remote first, committed copy second.
 *
 * Returns null only when BOTH fail, which is the case the caller already
 * handles by leaving the layer off with an error. A remote failure is not
 * surfaced as an error, because the fallback is a correct answer to a slightly
 * older question and the cycle is on screen either way.
 */
export async function fetchWindField(signal?: AbortSignal): Promise<WindFetch | null> {
  const attempts: Array<{ url: string; source: WindSource }> = [
    { url: WIND_REMOTE_URL, source: "remote" },
    { url: WIND_FALLBACK_PATH, source: "committed" },
  ];
  for (const { url, source } of attempts) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) continue;
      const field = parseWindField(await res.json());
      if (field) return { field, source };
    } catch {
      if (signal?.aborted) return null;
      // Try the next one. A remote that is down is exactly why there is a next.
    }
  }
  return null;
}
