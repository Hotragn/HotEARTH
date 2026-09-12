/**
 * Shared UI constants + small pure helpers for the Neutron Stars tab. All honesty
 * copy lives here so every panel quotes the same labels (contract:
 * docs/NEUTRON_STARS_DATA_SOURCES.md and docs/NEUTRON_STARS_PHYSICS.md). No
 * em-dashes in any user-facing string.
 *
 * The MISSION of this tab: real physics + real data for every number; the
 * rotating-star + sweeping-beam centrepiece is an ILLUSTRATIVE depiction of the
 * real lighthouse model. What is REAL in that visual is the pulse TIMING (flash
 * and pulse-train cadence at the pulsar's real measured period). The 3D mesh spin
 * is VISUALLY SCALED (a real 716 Hz pulsar would be an invisible blur), with the
 * true frequency always shown. The pulse audio is SYNTHESIZED in-browser at the
 * real spin frequency, not a telescope recording.
 */

import { NEUTRON_STAR_IDS, type NeutronStarId } from "@/lib/neutron-stars";

/** Object selector order (matches the catalog's notability order). */
export const NS_ORDER: readonly NeutronStarId[] = NEUTRON_STAR_IDS;

/** Short selector label per object id. */
export const NS_LABEL: Record<NeutronStarId, string> = {
  "psr-b1919+21": "B1919+21",
  crab: "Crab",
  vela: "Vela",
  "psr-j0740+6620": "J0740+6620",
  "psr-b1257+12": "B1257+12",
  "psr-j0737-3039a": "J0737-3039",
  "psr-j1748-2446ad": "J1748-2446ad",
  "sgr-1806-20": "SGR 1806-20",
  "psr-b1937+21": "B1937+21",
};

/** Per-object accent dot colour (pulsar cyan-white family). */
export const NS_ACCENT: Record<NeutronStarId, string> = {
  "psr-b1919+21": "#5ad2e6",
  crab: "#7fe0ff",
  vela: "#8ad0ff",
  "psr-j0740+6620": "#a6f0e0",
  "psr-b1257+12": "#9ad8ff",
  "psr-j0737-3039a": "#7ec8ff",
  "psr-j1748-2446ad": "#c0f0ff",
  "sgr-1806-20": "#ff9ad0",
  "psr-b1937+21": "#b8e6ff",
};

/** Which objects have a real telescope image shipped (label per contract). */
export const PULSAR_IMAGE: Partial<
  Record<
    NeutronStarId,
    {
      src: string;
      width: number;
      height: number;
      credit: string;
      label: string;
      license: string;
      sourceUrl: string;
    }
  >
> = {
  crab: {
    src: "/textures/neutron-stars/crab-nebula.jpg",
    width: 1280,
    height: 1280,
    credit: "NASA, ESA and Allison Loll / Jeff Hester (Arizona State University)",
    label:
      "Hubble optical image of the nebula around the pulsar; the neutron star itself is not resolved.",
    license: "CC BY 4.0",
    sourceUrl: "https://esahubble.org/images/heic0515a/",
  },
  vela: {
    src: "/textures/neutron-stars/vela-pulsar.jpg",
    width: 864,
    height: 694,
    credit: "NASA/CXC/Univ of Toronto/M. Durant et al.",
    label: "Chandra X-ray of the pulsar and its jet; no resolved surface.",
    license: "public domain (NASA)",
    sourceUrl: "https://chandra.harvard.edu/photo/2013/vela/",
  },
};

// ── The load-bearing honesty labels (quoted verbatim across the panels) ──────

/** THE lead statement: the render is an illustrative lighthouse, timing is real. */
export const LEAD_HONESTY =
  "The rotating star with its sweeping beam is an illustrative depiction of the real lighthouse model, not a photograph. No telescope resolves a neutron star's surface. What is real here is the pulse timing.";

/** The render honesty (render label pill). */
export const RENDER_LABEL =
  "Illustrative lighthouse render. Pulse timing is real (true period); the 3D spin is visually slowed for clarity, with the true rate shown.";

/** The timing-vs-spin split, stated plainly. */
export const TIMING_LABEL =
  "The flash and the scrolling pulse train tick at the pulsar's real measured period. A real millisecond pulsar (up to 716 Hz) would be an invisible blur, so the mesh rotation is capped for clarity while the true frequency is displayed. Timing real, visual spin scaled.";

/** The beam / surface is illustrative. */
export const BEAM_LABEL =
  "The beam shape, misalignment, surface texture and colours are our own illustrative choice. The lighthouse geometry (a misaligned magnetic dipole sweeping past Earth) is the real model; the exact beam is not.";

/** The audio is synthesized at the real frequency. */
export const AUDIO_LABEL =
  "Synthesized in-browser at the real measured spin frequency, not a telescope recording. Off by default; starts only when you turn it on.";

/** The canonical mass/radius assumption. */
export const CANONICAL_LABEL =
  "Where an object's mass and radius are not both measured, a canonical 1.4 Msun / 12 km neutron star is assumed and flagged. Only J0740+6620 has both a measured mass (2.08 Msun) and a NICER radius (about 12.4 km).";

/** The Crab characteristic-age note. */
export const CRAB_AGE_LABEL =
  "The characteristic age P/(2P-dot) assumes dipole braking and a fast birth spin, so for the Crab it gives about 1250 yr against the true historical age of about 970 yr (SN 1054). A known limitation, shown not hidden.";

/** The Joy Division plot label. */
export const JOY_DIVISION_LABEL =
  "An illustrative stacked pulse-profile ridgeline. Real pulsars have such profiles, and PSR B1919+21's is the artwork on Joy Division's 1979 'Unknown Pleasures'; the exact shape drawn here is illustrative, not this object's measured profile.";

/** Docs base for footer links. */
export { DOCS_BASE } from "@/lib/repo";

// ── Visual spin scaling (honest: mesh spin scaled, true rate displayed) ──────

/**
 * On-screen mesh rotation rate [revolutions per second], LOG-scaled across the
 * catalog's real spin frequencies (about 0.13 Hz to 716 Hz) onto a slow, always-
 * visible, never-blurred range. This is DELIBERATELY not the real rate: a real
 * 716 Hz pulsar would be an invisible blur. The true frequency is always shown
 * beside the render. Guarded: a non-finite / non-positive frequency falls back to
 * the mid value.
 */
export function visualSpinRevPerSec(spinFrequencyHz: number | null): number {
  const MIN = 0.04; // slowest visible turn
  const MAX = 0.32; // fastest we allow on screen (still clearly rotating)
  if (
    typeof spinFrequencyHz !== "number" ||
    !Number.isFinite(spinFrequencyHz) ||
    spinFrequencyHz <= 0
  ) {
    return (MIN + MAX) / 2;
  }
  const lo = Math.log10(0.1); // ~slowest catalog spin
  const hi = Math.log10(716); // fastest catalog spin
  const l = Math.log10(spinFrequencyHz);
  const t = Math.max(0, Math.min(1, (l - lo) / (hi - lo)));
  return MIN + (MAX - MIN) * t;
}

/**
 * Effective on-screen FLASH rate [Hz]. The pulse timing is real, but a raw
 * strobe at tens or hundreds of hertz is both a blur and a photosensitivity
 * hazard, so the visible flash is rate-limited to a gentle maximum. When the real
 * frequency exceeds the cap the flash reads as a steady shimmer and the TRUE rate
 * is carried by the scrolling pulse-train plot, the numeric readout and the
 * audio. Returns the flash rate and whether it was capped (so the UI can label
 * it). Guarded against nulls.
 */
export const FLASH_CAP_HZ = 4;
export function flashRate(spinFrequencyHz: number | null): {
  hz: number;
  capped: boolean;
} {
  if (
    typeof spinFrequencyHz !== "number" ||
    !Number.isFinite(spinFrequencyHz) ||
    spinFrequencyHz <= 0
  ) {
    return { hz: 1, capped: false };
  }
  if (spinFrequencyHz > FLASH_CAP_HZ) return { hz: FLASH_CAP_HZ, capped: true };
  return { hz: spinFrequencyHz, capped: false };
}

// ── Number formatting (real values, honest units) ────────────────────────────

/** Format a spin period in the most readable unit. */
export function fmtPeriod(periodS: number): string {
  if (!Number.isFinite(periodS) || periodS <= 0) return "unknown";
  if (periodS < 0.001) return `${(periodS * 1e6).toFixed(1)} us`;
  if (periodS < 1) return `${(periodS * 1000).toFixed(periodS < 0.01 ? 3 : 2)} ms`;
  return `${periodS.toFixed(3)} s`;
}

/** Format a spin frequency in Hz. */
export function fmtFrequency(hz: number | null): string {
  if (typeof hz !== "number" || !Number.isFinite(hz) || hz <= 0) return "unknown";
  if (hz >= 100) return `${Math.round(hz)} Hz`;
  if (hz >= 10) return `${hz.toFixed(1)} Hz`;
  return `${hz.toFixed(2)} Hz`;
}

/** Format a density in kg/m^3. */
export function fmtDensity(kgm3: number | null): string {
  if (typeof kgm3 !== "number" || !Number.isFinite(kgm3) || kgm3 <= 0) {
    return "unknown";
  }
  return `${kgm3.toExponential(1)} kg/m3`;
}

/** Format a surface gravity in Earth-g. */
export function fmtEarthG(g: number | null): string {
  if (typeof g !== "number" || !Number.isFinite(g) || g <= 0) return "unknown";
  return `${g.toExponential(2)} x Earth gravity`;
}

/** Format a fraction of c as a percentage. */
export function fmtFractionC(frac: number | null): string {
  if (typeof frac !== "number" || !Number.isFinite(frac) || frac <= 0) {
    return "unknown";
  }
  return `${(frac * 100).toFixed(1)}% of c`;
}

/** Format a magnetic field in gauss. */
export function fmtGauss(g: number | null): string {
  if (typeof g !== "number" || !Number.isFinite(g) || g <= 0) return "not available";
  return `${g.toExponential(1)} G`;
}

/** Format a distance in light-years. */
export function fmtDistanceLy(ly: number): string {
  if (!Number.isFinite(ly) || ly <= 0) return "unknown";
  return `${Math.round(ly).toLocaleString()} ly`;
}

/** Format a characteristic age in years (or "not available" for null). */
export function fmtAge(years: number | null): string {
  if (typeof years !== "number" || !Number.isFinite(years) || years <= 0) {
    return "not available";
  }
  if (years >= 1e6) return `${(years / 1e6).toFixed(2)} million yr`;
  if (years >= 1e3) return `${Math.round(years).toLocaleString()} yr`;
  return `${Math.round(years)} yr`;
}

/** Format a spin-down luminosity in watts (or "not available" for null). */
export function fmtLuminosity(w: number | null): string {
  if (typeof w !== "number" || !Number.isFinite(w) || w <= 0) return "not available";
  return `${w.toExponential(1)} W`;
}

/** Format a radius in km with the "fits in a city" framing. */
export function fmtRadius(radiusKm: number): string {
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return "unknown";
  return `~${radiusKm} km radius (~${Math.round(radiusKm * 2)} km across, fits inside a city)`;
}
