/**
 * Shared UI constants + small pure helpers for the Black Holes tab. All honesty
 * copy lives here so every panel quotes the same labels (contract:
 * docs/BLACK_HOLES_DATA_SOURCES.md and docs/BLACK_HOLES_PHYSICS.md). No em-dashes
 * in any user-facing string.
 *
 * The MISSION of this tab: real physics + real data for every number; the
 * centrepiece lensing render is PHYSICALLY-BASED (real light bending) but our own
 * original render, with an ILLUSTRATIVE accretion disk and the non-spinning
 * Schwarzschild approximation. It is NOT a photograph. The two EHT images are
 * radio-interferometric reconstructions from 2017 data, not optical photos.
 */

import { BLACK_HOLE_IDS, type BlackHoleId } from "@/lib/black-holes";

/** Object selector order (matches the catalog's notability order). */
export const BH_ORDER: readonly BlackHoleId[] = BLACK_HOLE_IDS;

/** Short selector label per object id. */
export const BH_LABEL: Record<BlackHoleId, string> = {
  "sgr-a-star": "Sagittarius A*",
  "m87-star": "M87*",
  "cygnus-x1": "Cygnus X-1",
  "gaia-bh1": "Gaia BH1",
  gw150914: "GW150914",
  "ton-618": "TON 618",
};

/** Per-object accent dot colour (accretion-orange / violet family). */
export const BH_ACCENT: Record<BlackHoleId, string> = {
  "sgr-a-star": "#ff9a3c",
  "m87-star": "#ffb85c",
  "cygnus-x1": "#8fd0ff",
  "gaia-bh1": "#a0e0c0",
  gw150914: "#c0a0ff",
  "ton-618": "#ff6a9a",
};

/** Which objects have a real EHT reconstruction image shipped. */
export const EHT_IMAGE: Partial<
  Record<BlackHoleId, { src: string; width: number; height: number; sourceUrl: string }>
> = {
  "sgr-a-star": {
    src: "/textures/black-holes/sgr-a-eht.jpg",
    width: 1280,
    height: 1280,
    sourceUrl: "https://www.eso.org/public/images/eso2208-eht-mwa/",
  },
  "m87-star": {
    src: "/textures/black-holes/m87-eht.jpg",
    width: 1280,
    height: 746,
    sourceUrl: "https://www.eso.org/public/images/eso1907a/",
  },
};

// ── The load-bearing honesty labels (quoted verbatim across the panels) ──────

/** THE lead statement: the render is physics-based, not a photo. */
export const LEAD_HONESTY =
  "The centrepiece is a physically-based gravitational-lensing render, not a photograph. It bends real starlight with real physics, but every pixel is drawn by our own code.";

/** The render honesty (render label pill). */
export const RENDER_LABEL =
  "Physically-based lensing (real light-bending); accretion disk illustrative; non-spinning Schwarzschild approximation.";

/** Lensing method, stated plainly. */
export const LENS_METHOD_LABEL =
  "The background is the real ESO Milky Way panorama, bent by the point-mass thin-lens equation (Schwarzschild weak-field deflection). The shadow, photon ring and disk inner edge sit at the real r_s ratios; the overall apparent size is illustrative.";

/** The accretion disk is illustrative. */
export const DISK_ILLUSTRATIVE_LABEL =
  "Illustrative accretion disk. Its brightness, colour and texture are our own artistic choice; only the light-bending geometry around it is real physics.";

/** EHT images are reconstructions, not photos. */
export const EHT_LABEL =
  "Radio-interferometric reconstruction from 2017 data, not an optical photo.";

/** Kerr / spin simplification. */
export const SPIN_LABEL =
  "The render and every derived radius use the non-spinning Schwarzschild metric. Real black holes spin (Kerr); a spin shrinks the prograde ISCO and distorts the shadow. M87* spins hard (a* about 0.9); its spin is cited as a fact but the render does not model it.";

/** Hawking is real theory, unobserved. */
export const HAWKING_LABEL =
  "Hawking radiation is real, well-founded theory but has never been observed. Every real black hole here is far colder than the 2.7 K cosmic microwave background, so it absorbs more than it emits and grows, not evaporates.";

/** Docs base for footer links. */
export { DOCS_BASE } from "@/lib/repo";

// ── Render scaling: apparent size from the real Schwarzschild radius ─────────

/**
 * Illustrative on-screen apparent radius (in y-normalised screen units) of the
 * black-hole shadow, LOG-scaled across the catalog by the real Schwarzschild
 * radius so a more massive hole renders larger, clamped to a visible range. The
 * absolute size is illustrative (a true shadow is microarcseconds); only the
 * RELATIVE ordering and the internal r_s ratios are physical. Guarded: a
 * non-finite / non-positive r_s falls back to the mid value.
 */
export function apparentShadowRadius(schwarzschildRadiusM: number | null): number {
  const MIN = 0.12;
  const MAX = 0.26;
  if (
    typeof schwarzschildRadiusM !== "number" ||
    !Number.isFinite(schwarzschildRadiusM) ||
    schwarzschildRadiusM <= 0
  ) {
    return (MIN + MAX) / 2;
  }
  // Catalog r_s spans ~1e4 m (stellar) to ~1e14 m (TON 618): map log10 over that
  // ~10-decade span onto [MIN, MAX].
  const lo = 4; // log10(~1e4 m)
  const hi = 14; // log10(~1e14 m)
  const l = Math.log10(schwarzschildRadiusM);
  const t = Math.max(0, Math.min(1, (l - lo) / (hi - lo)));
  return MIN + (MAX - MIN) * t;
}

// ── Number formatting (real values, honest units) ────────────────────────────

/** Format a mass in solar masses with a readable magnitude. */
export function fmtMass(massMsun: number): string {
  if (!Number.isFinite(massMsun) || massMsun <= 0) return "unknown";
  if (massMsun >= 1e9) return `${(massMsun / 1e9).toFixed(1)} billion Msun`;
  if (massMsun >= 1e6) return `${(massMsun / 1e6).toFixed(2)} million Msun`;
  if (massMsun >= 1000) return `${Math.round(massMsun).toLocaleString()} Msun`;
  return `${massMsun.toFixed(1)} Msun`;
}

/** Format a distance in light-years with a readable magnitude. */
export function fmtDistanceLy(ly: number): string {
  if (!Number.isFinite(ly) || ly <= 0) return "unknown";
  if (ly >= 1e9) return `${(ly / 1e9).toFixed(2)} billion ly`;
  if (ly >= 1e6) return `${(ly / 1e6).toFixed(1)} million ly`;
  return `${Math.round(ly).toLocaleString()} ly`;
}

/**
 * Format the Schwarzschild radius with the most relatable unit + a comparison.
 * Guarded against nulls.
 */
export function fmtSchwarzschild(state: {
  schwarzschildRadiusKm: number | null;
  schwarzschildRadiusAU: number | null;
}): string {
  const au = state.schwarzschildRadiusAU;
  const km = state.schwarzschildRadiusKm;
  if (typeof au === "number" && Number.isFinite(au) && au >= 0.01) {
    return `${au.toFixed(au >= 10 ? 0 : 3)} AU`;
  }
  if (typeof km === "number" && Number.isFinite(km)) {
    if (km >= 1e6) return `${(km / 1e6).toFixed(2)} million km`;
    return `${Math.round(km).toLocaleString()} km`;
  }
  return "unknown";
}

/** A relatable comparison for the horizon radius, honest and approximate. */
export function schwarzschildComparison(au: number | null, km: number | null): string {
  if (typeof au === "number" && Number.isFinite(au)) {
    if (au >= 100) return "far wider than Neptune's orbit";
    if (au >= 30) return "about the size of Neptune's orbit";
    if (au >= 1) return "wider than Earth's orbit around the Sun";
    if (au >= 0.05) return "roughly the size of Mercury's orbit";
  }
  if (typeof km === "number" && Number.isFinite(km)) {
    if (km <= 100) return "smaller than a city";
    if (km <= 1e4) return "about the size of a large asteroid";
  }
  return "";
}

/** Format a length in metres to a compact scientific-ish string. */
export function fmtMeters(m: number | null): string {
  if (typeof m !== "number" || !Number.isFinite(m) || m <= 0) return "unknown";
  if (m >= 1e9) return `${(m / 1000).toExponential(2)} km`;
  if (m >= 1000) return `${Math.round(m / 1000).toLocaleString()} km`;
  return `${Math.round(m).toLocaleString()} m`;
}

/** Format a microarcsecond value. */
export function fmtUas(uas: number | null): string {
  if (typeof uas !== "number" || !Number.isFinite(uas)) return "not imaged";
  return `${uas.toFixed(1)} uas`;
}

/** Format the time-dilation ratio for the dial as "1 s here = X s far away". */
export function fmtDilation(factor: number | null): string {
  if (typeof factor !== "number" || !Number.isFinite(factor) || factor <= 0) {
    return "clocks freeze at the horizon";
  }
  const farPerLocal = 1 / factor;
  if (farPerLocal >= 1000) return `1 s here = ${farPerLocal.toExponential(2)} s far away`;
  if (farPerLocal >= 10) return `1 s here = ${farPerLocal.toFixed(1)} s far away`;
  return `1 s here = ${farPerLocal.toFixed(3)} s far away`;
}

/** Format a temperature in kelvin (very small for astrophysical holes). */
export function fmtKelvin(k: number | null): string {
  if (typeof k !== "number" || !Number.isFinite(k) || k <= 0) return "unknown";
  if (k < 1e-3) return `${k.toExponential(2)} K`;
  return `${k.toPrecision(3)} K`;
}

/** Format an evaporation time in years (astronomically large). */
export function fmtYears(y: number | null): string {
  if (typeof y !== "number" || !Number.isFinite(y) || y <= 0) return "unknown";
  return `${y.toExponential(2)} years`;
}
