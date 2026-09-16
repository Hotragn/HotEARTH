/**
 * Shared UI constants and small pure helpers for the combined Other Moons tab
 * (Mars, Uranus and Neptune). Kept in one place so the scene, HUD, system panel
 * and config panel agree on the moon colors, designations, phenomenon labels,
 * compass wording and the per-planet facts (no per-file drift). Mirrors
 * saturn-moons/saturnUi.ts.
 *
 * Nothing here is new physics: the moon positions, the system tilt and the
 * phenomena all come from lib/other-moons.ts. The moon RADII below are real
 * measured JPL values used ONLY to size the true-angular markers and to scale the
 * enlarged ones (not invented, and the enlarge choice is labeled where used), and
 * the per-planet FACTS are documented (Uranus tip and season, Triton retrograde,
 * Nereid eccentricity, Phobos below synchronous).
 *
 * The one geometry helper here, {@link systemSkyGeometry}, reconstructs the SAME
 * plane-of-sky basis lib/other-moons builds internally, using only the EXPOSED
 * pole constants (OTHER_PLANETS) and the planet's apparent RA/Dec
 * (planetGeocentric), so the scene can orient the oblate disk's pole to match the
 * moon ellipse WITHOUT duplicating or modifying the physics lib. It carries
 * Neptune's WGCCRE pole-precession term exactly (via julianEphemerisDate), so it
 * matches the lib's internal basis to machine precision.
 */

import {
  OTHER_PLANETS,
  julianEphemerisDate,
  type OtherMoon,
  type OtherPlanet,
  type PhenomenonType,
} from "@/lib/other-moons";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
/** Julian Date of the J2000.0 epoch (matches lib/other-moons). */
const J2000_JD = 2_451_545.0;
/** Days in a Julian century (for the Neptune pole precession term). */
const JULIAN_CENTURY_DAYS = 36_525;

// ─────────────────────────────── moon presentation ─────────────────────────

/**
 * Per-moon marker color. Presentation only. Icy pale tones for the Uranian and
 * Martian rocky moons; Triton a pale nitrogen-ice pink, Proteus a dark grey and
 * Nereid a neutral grey (both illustrative tinted spheres, no map: the tint
 * approximates their measured low albedo, never a real surface).
 */
export const MOON_COLORS: Record<OtherMoon, string> = {
  Phobos: "#9c8f83", // dark tan-grey (Viking)
  Deimos: "#b0a494", // slightly lighter regolith
  Miranda: "#c7ccd4", // icy grey
  Ariel: "#d6dbe1", // brightest Uranian moon
  Umbriel: "#a4a9b2", // darkest Uranian moon
  Titania: "#cdd2da", // icy grey
  Oberon: "#c2b8b0", // reddish-grey
  Triton: "#d8c3b6", // pale nitrogen-ice pink
  Proteus: "#6f7076", // dark, illustrative
  Nereid: "#9aa0a8", // neutral grey, illustrative
};

/**
 * IAU Roman-numeral designation (Planet N). Real, standard designations: Phobos
 * (Mars I), Deimos (Mars II); Miranda (Uranus V), Ariel (Uranus I), Umbriel
 * (Uranus II), Titania (Uranus III), Oberon (Uranus IV); Triton (Neptune I),
 * Nereid (Neptune II), Proteus (Neptune VIII). Used as a small name prefix.
 */
export const MOON_DESIGNATION: Record<OtherMoon, string> = {
  Phobos: "I",
  Deimos: "II",
  Miranda: "V",
  Ariel: "I",
  Umbriel: "II",
  Titania: "III",
  Oberon: "IV",
  Triton: "I",
  Proteus: "VIII",
  Nereid: "II",
};

/**
 * Real mean radii [km] (JPL SSD planetary-satellite physical parameters). Used
 * ONLY to size the moon markers: the TRUE-size toggle draws radiusKm / planet Req
 * (which is tiny, and that is the honest point), and the enlarged markers preserve
 * this real size ordering scaled relative to each planet's largest moon. Phobos
 * and Deimos are irregular bodies; the value is their mean radius (the sphere is a
 * labeled approximation of their real lumpy shape).
 */
export const MOON_RADIUS_KM: Record<OtherMoon, number> = {
  Phobos: 11.1,
  Deimos: 6.2,
  Miranda: 235.8,
  Ariel: 578.9,
  Umbriel: 584.7,
  Titania: 788.9,
  Oberon: 761.4,
  Triton: 1353.4,
  Proteus: 210.0,
  Nereid: 170.0,
};

/** Moons with NO shipped surface map: rendered as labeled illustrative tinted spheres. */
export const ILLUSTRATIVE_MOONS: ReadonlySet<OtherMoon> = new Set<OtherMoon>([
  "Proteus",
  "Nereid",
]);

// ─────────────────────────────── planet presentation ───────────────────────

/** Flat tint used when a planet's disk texture is missing (defensive fallback). */
export const PLANET_FALLBACK_COLOR: Record<OtherPlanet, string> = {
  Mars: "#b5482e",
  Uranus: "#9fd6d2",
  Neptune: "#3f57b5",
};

/**
 * Meter scale for the system-opening readout [deg]. Uranus swings widely across
 * its ~84-year season (pole near the ecliptic), so its meter reaches 90°; Mars
 * and Neptune stay modest (obliquities ~25° and ~28°).
 */
export const PLANET_MAX_TILT_DEG: Record<OtherPlanet, number> = {
  Mars: 30,
  Uranus: 90,
  Neptune: 32,
};

/** The planet selector order (also the segmented-control order). */
export const OTHER_PLANET_ORDER: readonly OtherPlanet[] = [
  "Mars",
  "Uranus",
  "Neptune",
];

/** Uranus's most recent ring/moon-plane edge-on season (documented). */
export const URANUS_LAST_EQUINOX = "2007";
/** Uranus's next edge-on season (documented, ~84-yr cycle). */
export const URANUS_NEXT_EQUINOX_APPROX = "2049";

// ─────────────────────────────── phenomena ─────────────────────────────────

export interface PhenomenonMeta {
  label: string;
  blurb: string;
  emphasize: boolean;
  accent: string;
}

/**
 * Presentation metadata per phenomenon type. Same four types as the Jupiter and
 * Saturn tabs, but the copy states plainly these are rare-to-unobservable from
 * Earth because the disks are tiny (see the config panel's honest framing).
 */
export const PHENOMENON_META: Record<PhenomenonType, PhenomenonMeta> = {
  transit: {
    label: "Transit",
    blurb: "Moon crossing in front of the planet's disk (Earth-line event).",
    emphasize: false,
    accent: "#cbd3e0",
  },
  shadow_transit: {
    label: "Shadow transit",
    blurb: "Moon's shadow on the cloud tops, a small dark dot (Sun-line event).",
    emphasize: true,
    accent: "#d8c48f",
  },
  occultation: {
    label: "Occultation",
    blurb: "Moon hidden behind the planet's disk (Earth-line event).",
    emphasize: false,
    accent: "#8b93a4",
  },
  eclipse: {
    label: "Eclipse",
    blurb: "Moon inside the planet's shadow, darkened even when not behind the disk (Sun-line event).",
    emphasize: false,
    accent: "#7f93c8",
  },
};

/** Order phenomenon types are listed in summaries. */
export const PHENOMENON_ORDER: readonly PhenomenonType[] = [
  "transit",
  "shadow_transit",
  "occultation",
  "eclipse",
];

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
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

export interface SystemSkyGeometry {
  /**
   * The planet's north pole as a UNIT vector in the plane-of-sky / scene frame:
   * +X west, +Y north, +Z toward Earth (the SAME axes the scene renders the moons
   * in). Feed straight to Quaternion.setFromUnitVectors(up, poleSky) to tilt the
   * oblate disk so its squash-axis matches the moon ellipse.
   */
  poleSky: [number, number, number];
  /** geocentric position angle of the planet's north pole [deg, 0-360), N through E. */
  positionAngleDeg: number;
  /** sub-Earth latitude (system opening) [deg]; matches planetGeocentric().systemTiltDeg. */
  tiltDeg: number;
}

/**
 * Reconstruct lib/other-moons' internal plane-of-sky basis for `planet` at `date`
 * from the planet's apparent RA/Dec (from planetGeocentric) plus the EXPOSED IAU
 * pole constants (OTHER_PLANETS). This duplicates none of the physics, it only
 * re-derives the sky pole so the frontend can orient the disk, and it carries
 * Neptune's WGCCRE pole precession term exactly (Mars and Uranus hold the J2000
 * pole, as the lib does), so the sky basis is identical to the one the moon
 * positions were projected in.
 */
export function systemSkyGeometry(
  planet: OtherPlanet,
  raDeg: number,
  decDeg: number,
  date: Date
): SystemSkyGeometry {
  const p = OTHER_PLANETS[planet];

  // Planet apparent direction (Earth -> planet), J2000 equatorial.
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

  // Planet pole (IAU), carrying Neptune's WGCCRE precession term (matches the lib).
  let poleRa = p.poleRaJ2000Deg;
  let poleDec = p.poleDecJ2000Deg;
  if (p.poleHasPrecessionTerm) {
    const T = (julianEphemerisDate(date) - J2000_JD) / JULIAN_CENTURY_DAYS;
    const N = (357.85 + 52.316 * T) * DEG2RAD;
    poleRa += 0.7 * Math.sin(N);
    poleDec -= 0.51 * Math.cos(N);
  }
  const a0 = poleRa * DEG2RAD;
  const d0 = poleDec * DEG2RAD;
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
    positionAngleDeg: norm360(Math.atan2(-poleWest, poleNorth) * RAD2DEG),
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
