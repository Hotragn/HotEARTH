/**
 * Shared UI constants and small pure helpers for the combined Dwarf Moons tab
 * (the moons of Pluto, Eris, Haumea and Makemake). Kept in one place so the scene,
 * HUD, system panel and config panel agree on the moon colors, designations, tier
 * badges, compass wording and per-system facts (no per-file drift). Mirrors
 * other-moons/otherMoonsUi.ts.
 *
 * Nothing here is new physics: the moon positions, the system tilt and the
 * (usually empty) geometric phenomena all come from lib/dwarf-moons.ts. The moon
 * RADII below are approximate measured mean radii (documented, not invented) used
 * ONLY to size the true-angular markers and to scale the enlarged ones (the
 * enlarge choice is labeled where used). The per-system FACTS are documented (the
 * Pluto-Charon binary, Haumea's ring and spin, MK2's poorly-constrained orbit).
 *
 * The one geometry helper here, {@link systemSkyGeometry}, reconstructs the SAME
 * plane-of-sky pole lib/dwarf-moons builds internally, using only the EXPOSED pole
 * constants (DWARF_SYSTEMS, Pluto only) and the system's apparent RA/Dec
 * (dwarfGeocentric), so the scene can tilt Pluto's textured sphere to match the
 * moon geometry WITHOUT duplicating or modifying the physics lib.
 */

import {
  DWARF_SYSTEMS,
  type DwarfMoon,
  type DwarfSystem,
} from "@/lib/dwarf-moons";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// ─────────────────────────────── moon presentation ─────────────────────────

/**
 * Per-moon marker color. Presentation only. Charon carries a real New Horizons
 * map (this tint is only a defensive fallback); every other moon has NO map and
 * is a labeled illustrative tinted sphere, the tint approximating its measured
 * low/high albedo, never a real surface.
 */
export const MOON_COLORS: Record<DwarfMoon, string> = {
  Charon: "#b9b0a6", // grey ice (fallback; the real map is used)
  Styx: "#b4b7bd", // small icy grey, illustrative
  Nix: "#cfd3da", // bright icy body, illustrative
  Kerberos: "#a7abb2", // dark, illustrative
  Hydra: "#d2d6de", // bright icy body, illustrative
  Dysnomia: "#8f949c", // darker grey, illustrative
  Hiiaka: "#dee2e9", // bright crystalline ice, illustrative
  Namaka: "#c4c9d1", // icy grey, illustrative
  MK2: "#6f7076", // very dark, illustrative
};

/**
 * IAU designation (or provisional name) per moon. Real, standard designations:
 * Charon (Pluto I), Nix (II), Hydra (III), Kerberos (IV), Styx (V); Dysnomia
 * (Eris I); Hiʻiaka (Haumea I), Namaka (II). Makemake's moon is still provisional
 * (S/2015 (136472) 1), so it carries no Roman numeral.
 */
export const MOON_DESIGNATION: Record<DwarfMoon, string> = {
  Charon: "I",
  Styx: "V",
  Nix: "II",
  Kerberos: "IV",
  Hydra: "III",
  Dysnomia: "I",
  Hiiaka: "I",
  Namaka: "II",
  MK2: "",
};

/** Display name: "I Charon", or just "MK2" when there is no designation. */
export function moonName(moon: DwarfMoon): string {
  const d = MOON_DESIGNATION[moon];
  return d ? `${d} ${moon}` : moon;
}

/**
 * Approximate measured mean radii [km] (published occultation / New-Horizons
 * sizes; the small bodies are irregular, so the value is a mean radius and the
 * sphere is a labeled approximation). Used ONLY to size the moon markers: the
 * TRUE-size toggle draws radiusKm / central Req (tiny, the honest point), and the
 * enlarged markers preserve this real size ordering. Never used as physics.
 */
export const MOON_RADIUS_KM: Record<DwarfMoon, number> = {
  Charon: 606, // New Horizons 2015
  Styx: 6, // ~16x9x8 km irregular
  Nix: 18, // ~50x35x33 km irregular
  Kerberos: 6, // ~19x10x9 km irregular
  Hydra: 18, // ~51x36x31 km irregular
  Dysnomia: 350, // ~700 km diameter (Holler et al. 2021)
  Hiiaka: 160, // ~320 km diameter
  Namaka: 85, // ~170 km diameter
  MK2: 87, // ~175 km diameter (Parker et al. 2016)
};

/**
 * Moons rendered as labeled illustrative tinted spheres (NO shipped surface map).
 * Every moon here except Charon: only Pluto and Charon carry real New Horizons maps.
 */
export const ILLUSTRATIVE_MOONS: ReadonlySet<DwarfMoon> = new Set<DwarfMoon>([
  "Styx",
  "Nix",
  "Kerberos",
  "Hydra",
  "Dysnomia",
  "Hiiaka",
  "Namaka",
  "MK2",
]);

// ─────────────────────────────── system presentation ───────────────────────

/**
 * Central-body tint. Pluto carries a real New Horizons map (this is only a
 * fallback); Eris, Haumea and Makemake have NO map and are labeled illustrative
 * tinted spheres, the tint approximating their measured albedo/colour.
 */
export const SYSTEM_FALLBACK_COLOR: Record<DwarfSystem, string> = {
  Pluto: "#d8c3aa", // tan (fallback; the real map is used)
  Eris: "#e4e8ee", // very bright, high-albedo methane ice (illustrative)
  Haumea: "#eae7df", // bright crystalline-ice surface (illustrative)
  Makemake: "#b06a48", // reddish-brown tholins (illustrative)
};

/**
 * Meter scale for the system-opening readout [deg]. Pluto's real tilt (its IAU
 * pole, obliquity ~120 deg to its orbit) swings the sub-Earth latitude across a
 * wide range over its 248-year orbit; the illustrative systems sit near a fixed
 * adopted plane, so their meter is only a rough gauge (and their tilt is flagged
 * illustrative everywhere).
 */
export const SYSTEM_MAX_TILT_DEG: Record<DwarfSystem, number> = {
  Pluto: 62,
  Eris: 90,
  Haumea: 90,
  Makemake: 90,
};

/** The system selector order (also the segmented-control order). Pluto leads. */
export const DWARF_SYSTEM_ORDER: readonly DwarfSystem[] = [
  "Pluto",
  "Eris",
  "Haumea",
  "Makemake",
];

/**
 * Pluto-Charon mutual-event seasons. The plane was edge-on (systemTiltDeg ~ 0)
 * in 1985-1990, when the mutual transit/occultation events WERE observable from
 * Earth; the next edge-on season is ~2103. Documented, used only as copy anchors.
 */
export const PLUTO_LAST_EDGE_ON = "1985-1990";
export const PLUTO_NEXT_EDGE_ON_APPROX = "2103";

// ─────────────────────────────── data-tier badges ──────────────────────────

/** The two honesty tiers, plus the extra "uncertain" case (Makemake's MK2). */
export type Tier = "real" | "illustrative" | "uncertain";

export interface TierBadge {
  label: string;
  title: string;
  /** tailwind classes for the badge chrome (border + text + subtle bg). */
  className: string;
}

const TIER_BADGES: Record<Tier, TierBadge> = {
  real: {
    label: "Real positions",
    title:
      "Full cited mean elements (Brozovic & Jacobson 2024): the along-orbit position is real, not illustrative.",
    className: "border-solar/45 bg-solar/[0.08] text-solar",
  },
  illustrative: {
    label: "Orbit real, position illustrative",
    title:
      "The orbit size, shape, period and inclination are real and cited, but the along-orbit phase and node are an adopted convention (no full published ephemeris), not a real position.",
    className: "border-line bg-white/[0.03] text-faint",
  },
  uncertain: {
    label: "Orbit poorly constrained",
    title:
      "Seen near edge-on with very few detections (Parker et al. 2016): even the orbit itself is poorly constrained. Position is illustrative.",
    className: "border-[#c98f5a]/50 bg-[#c98f5a]/[0.08] text-[#e0a877]",
  },
};

/** The system-level tier badge (Pluto real; Eris/Haumea illustrative; Makemake uncertain). */
export function systemTierBadge(system: DwarfSystem): TierBadge {
  if (DWARF_SYSTEMS[system].hasRealEphemeris) return TIER_BADGES.real;
  if (system === "Makemake") return TIER_BADGES.uncertain;
  return TIER_BADGES.illustrative;
}

/** The per-moon tier badge, from the flags on a position record. */
export function moonTierBadge(p: {
  phaseReal: boolean;
  orbitUncertain: boolean;
}): TierBadge {
  if (p.orbitUncertain) return TIER_BADGES.uncertain;
  if (p.phaseReal) return TIER_BADGES.real;
  return TIER_BADGES.illustrative;
}

// ─────────────────────────── plane-of-sky reconstruction ───────────────────
// A tiny local vec3 toolkit (J2000 equatorial), used only by systemSkyGeometry.

type V = readonly [number, number, number];
function dot(a: V, b: V): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a: V, b: V): V {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function normalize(a: V): V {
  const n = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / n, a[1] / n, a[2] / n];
}
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export interface SystemSkyGeometry {
  /**
   * The central body's north pole as a UNIT vector in the plane-of-sky / scene
   * frame (+X west, +Y north, +Z toward Earth: the SAME axes the scene renders
   * the moons in), so the textured sphere can be tilted with
   * Quaternion.setFromUnitVectors(up, poleSky). null for the illustrative systems
   * (Eris/Haumea/Makemake have no exposed pole; their bodies render upright).
   */
  poleSky: [number, number, number] | null;
  /** sub-Earth latitude (system opening) [deg]; matches dwarfGeocentric().systemTiltDeg. */
  tiltDeg: number;
}

/**
 * Reconstruct lib/dwarf-moons' plane-of-sky pole for `system` from the system's
 * apparent RA/Dec (from dwarfGeocentric) plus the EXPOSED IAU pole constants
 * (DWARF_SYSTEMS). This duplicates none of the physics: it only re-derives the
 * sky pole so the frontend can tilt Pluto's disk to match the real moon geometry.
 * Pluto's pole is fixed at J2000 (no precession term in the lib), so no time
 * dependence. Returns poleSky = null for the illustrative systems.
 */
export function systemSkyGeometry(
  system: DwarfSystem,
  raDeg: number,
  decDeg: number
): SystemSkyGeometry {
  const data = DWARF_SYSTEMS[system];

  // System apparent direction (Earth -> system), J2000 equatorial.
  const ra = raDeg * DEG2RAD;
  const dec = decDeg * DEG2RAD;
  const d: V = [
    Math.cos(dec) * Math.cos(ra),
    Math.cos(dec) * Math.sin(ra),
    Math.sin(dec),
  ];
  const skyZ: V = [-d[0], -d[1], -d[2]]; // toward Earth
  const north: V = [0, 0, 1];
  const s = dot(north, skyZ);
  const skyY = normalize([
    north[0] - s * skyZ[0],
    north[1] - s * skyZ[1],
    north[2] - s * skyZ[2],
  ]);
  const skyX = cross(skyY, skyZ); // west

  if (
    data.poleRaJ2000Deg === undefined ||
    data.poleDecJ2000Deg === undefined
  ) {
    return { poleSky: null, tiltDeg: 0 };
  }

  const a0 = data.poleRaJ2000Deg * DEG2RAD;
  const d0 = data.poleDecJ2000Deg * DEG2RAD;
  const pole: V = [
    Math.cos(d0) * Math.cos(a0),
    Math.cos(d0) * Math.sin(a0),
    Math.sin(d0),
  ];

  const poleWest = dot(pole, skyX);
  const poleNorth = dot(pole, skyY);
  const poleToward = dot(pole, skyZ);
  return {
    poleSky: [poleWest, poleNorth, poleToward],
    tiltDeg: Math.asin(clamp(poleToward, -1, 1)) * RAD2DEG,
  };
}

// ─────────────────────────────── formatting ────────────────────────────────

/**
 * 16-point compass abbreviation for an azimuth measured from North, clockwise
 * (the convention lib/celestial.equatorialToHorizontal returns). Pure and total.
 */
export function compass16(azimuthDeg: number): string {
  const names = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const i = Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16;
  return names[i];
}

/** Short local clock time (HH:MM) for the viewer's own timezone. */
export function hhmm(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Local day header, e.g. "Sat, Jul 19 2026". */
export function dayLabel(d: Date): string {
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─────────────────────────────── observer ──────────────────────────────────

/** An observing site: a label plus geographic latitude / longitude (deg). */
export interface Observer {
  label: string;
  /** latitude, degrees north positive */
  lat: number;
  /** longitude, degrees east positive (matches lib/geo / lib/celestial) */
  lon: number;
}

/**
 * Labeled fallback location used until the viewer opts into geolocation. A
 * neutral, well-known meridian reference (Greenwich, London), clearly labeled so
 * it is never mistaken for the viewer's real position. Same posture as the
 * sibling tabs.
 */
export const DEFAULT_OBSERVER: Observer = {
  label: "Greenwich (default)",
  lat: 51.4779,
  lon: -0.0015,
};
