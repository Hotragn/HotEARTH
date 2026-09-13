/**
 * Shared UI constants + small pure helpers for the Exoplanet Surfaces tab. All
 * honesty copy lives here so every panel quotes the same labels (contract:
 * docs/EXO_SURFACES_DATA_SOURCES.md). No em-dashes in any user-facing string.
 *
 * The MISSION of this tab is the mirror image of the Mars/Titan Surfaces tab:
 * there the ground was real and the sky illustrative; HERE the sky is the real,
 * computed part and the ground is entirely illustrative (no exoplanet surface
 * has ever been imaged).
 */

/** Vantage selector order (TRAPPIST-1 e leads: the showcase). */
export const VANTAGE_ORDER: readonly string[] = [
  "trappist-1e",
  "proxima-cen-b",
  "toi-700-d",
  "51-peg-b",
];

/** Short selector label per vantage id. */
export const VANTAGE_LABEL: Record<string, string> = {
  "trappist-1e": "TRAPPIST-1 e",
  "proxima-cen-b": "Proxima Cen b",
  "toi-700-d": "TOI-700 d",
  "51-peg-b": "51 Peg b",
};

/** Per-vantage accent dot colour (warm alien amber family). */
export const VANTAGE_ACCENT: Record<string, string> = {
  "trappist-1e": "#e0a25e",
  "proxima-cen-b": "#e07a52",
  "toi-700-d": "#e8b06a",
  "51-peg-b": "#d98a4a",
};

/**
 * Honesty tier shown beside the selector. Every rocky vantage is the same tier
 * (sky real, ground illustrative); the gas giant is the honest no-surface tier.
 */
export const VANTAGE_TIER: Record<string, string> = {
  "trappist-1e": "sky computed from real data; ground illustrative",
  "proxima-cen-b": "sky computed from real data; ground illustrative",
  "toi-700-d": "sky computed from real data; ground illustrative",
  "51-peg-b": "gas giant: no surface to stand on",
};

// ── The load-bearing honesty labels (quoted verbatim across the panels) ──────

/** THE lead statement: sky real, ground imagined. */
export const LEAD_HONESTY =
  "No exoplanet surface has ever been imaged, not one pixel. The sky here is real, computed from measured data; the ground is illustrative.";

/** All terrain is illustrative. */
export const GROUND_ILLUSTRATIVE_LABEL =
  "Illustrative ground. No exoplanet surface has been imaged; this terrain is original geometry, not data.";

/** The sky is the real part. */
export const SKY_REAL_LABEL =
  "The host star and sibling discs are drawn at their real, computed angular sizes; the star colour is an illustrative Teff-to-RGB mapping, not a measured spectrum.";

/** Sibling discs shown at closest-approach size. */
export const SIBLING_DISC_LABEL =
  "Shown at closest-approach size; not always this large or on the same side of the star.";

/** Tidal-lock day/night framing is an inference. */
export const TIDAL_LOCK_LABEL =
  "Tidal locking is inferred, not measured. If locked, one hemisphere faces the star permanently; the day-side / night-side view rests on that inference.";

/** No local clock: rotation and day length are not measured. */
export const NO_LOCAL_CLOCK_LABEL =
  "Rotation and day length are not measured, so no local clock is shown. Only the year (orbital period) is a real, measured time quantity.";

/** Gas-giant no-surface statement. */
export const NO_SURFACE_LABEL =
  "This is a gas giant. There is no solid surface to stand on; the view is at the cloud-top level, and surface gravity is undefined.";

// ── Illustrative day-cycle modes for tidally-locked-inference worlds ─────────

export type DayMode = "day" | "terminator" | "night";

export const DAY_MODES: readonly { id: DayMode; label: string }[] = [
  { id: "day", label: "Day side" },
  { id: "terminator", label: "Terminator" },
  { id: "night", label: "Night side" },
];

/**
 * The host star's chosen sky position (altitude/azimuth, degrees) for each
 * illustrative day mode. The AZIMUTH is a fixed illustrative viewpoint; the
 * altitude encodes the day/terminator/night framing that rests on the
 * tidal-lock INFERENCE (labeled). For a non-locked world only "day" is used.
 */
export function starSkyAltAz(mode: DayMode): { altitudeDeg: number; azimuthDeg: number } {
  const azimuthDeg = 12;
  switch (mode) {
    case "night":
      return { altitudeDeg: -22, azimuthDeg };
    case "terminator":
      return { altitudeDeg: 3, azimuthDeg };
    case "day":
    default:
      return { altitudeDeg: 38, azimuthDeg };
  }
}

/**
 * Sky-direction unit vector from altitude/azimuth (azimuth from North,
 * clockwise). Scene convention: +X east, +Y up, -Z north. Returns null on
 * non-finite input (guarded like the sibling Surfaces tab).
 */
export function skyDirection(
  altitudeDeg: number,
  azimuthDeg: number
): [number, number, number] | null {
  if (!Number.isFinite(altitudeDeg) || !Number.isFinite(azimuthDeg)) return null;
  const alt = (altitudeDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  const c = Math.cos(alt);
  return [Math.sin(az) * c, Math.sin(alt), -Math.cos(az) * c];
}

/**
 * World-space radius of a disc drawn at a real angular diameter `angDiamDeg`,
 * placed on a sky dome of radius `distance`. r = distance * tan(angDiam / 2).
 * Guarded; returns 0 on bad input.
 */
export function discRadiusAtDistance(angDiamDeg: number, distance: number): number {
  if (!Number.isFinite(angDiamDeg) || !Number.isFinite(distance)) return 0;
  return distance * Math.tan((angDiamDeg / 2) * (Math.PI / 180));
}

/**
 * Deterministic ILLUSTRATIVE height field (scene units) for the procedural
 * terrain. Pure sines, no data pretensions whatsoever; the HUD labels it. The
 * `seed` (a small per-vantage number) shifts the phases so each world looks a
 * little different without any of it being real.
 */
export function illustrativeTerrain(x: number, z: number, seed: number): number {
  return (
    0.9 * Math.sin(x * 0.09 + seed) * Math.cos(z * 0.075 - seed * 0.6) +
    0.45 * Math.sin(x * 0.21 - 0.4 + seed) * Math.sin(z * 0.18 + 1.2) +
    0.18 * Math.sin(x * 0.5 + z * 0.42 + seed)
  );
}

/** A tiny per-vantage terrain seed so worlds differ, still fully illustrative. */
export const TERRAIN_SEED: Record<string, number> = {
  "trappist-1e": 1.7,
  "proxima-cen-b": 3.1,
  "toi-700-d": 0.6,
  "51-peg-b": 0,
};

/** Format one Earth-relative flux + W/m2 pair for the facts panel. */
export function fmtIrradiance(earths: number, wm2: number): string {
  const e =
    earths >= 100
      ? Math.round(earths).toLocaleString()
      : earths.toFixed(earths < 10 ? 2 : 0);
  return `${e}x Earth (${Math.round(wm2).toLocaleString()} W/m2)`;
}

/** Format a year length (orbital period in days) into a human string. */
export function fmtYear(days: number): string {
  if (!Number.isFinite(days)) return "not measured";
  if (days < 1) return `${(days * 24).toFixed(1)} hours`;
  if (days < 400) return `${days.toFixed(days < 10 ? 2 : 1)} Earth days`;
  return `${(days / 365.25).toFixed(2)} Earth years`;
}

/** Docs base for footer links. */
export { DOCS_BASE } from "@/lib/repo";
