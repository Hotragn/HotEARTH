/**
 * Shared render constants + view-state types for the Night Sky scene.
 *
 * The observer sits at the ORIGIN looking OUT at the inside of a large celestial
 * sphere. Every catalogue direction (RA/Dec, or alt/az in local mode) is placed
 * on this sphere at a common scene radius: RA/Dec fix only the DIRECTION, never
 * true distance (distances are astronomically incommensurable and carried for
 * labels only). The camera orbits the origin at a tiny radius, so it reads as a
 * rotate-in-place planetarium; zoom is by field-of-view, not dolly (dolly is
 * meaningless against a far shell). See lib/celestial.ts for the frame.
 */

import type { MessierObject, Star } from "@/lib/star-facts";

/** Starlight-indigo accent (matches the worlds registry) + a dimmer variant. */
export const NIGHT_SKY_ACCENT = "#8aa0ff";
export const NIGHT_SKY_ACCENT_DIM = "#6f7fc7";

/** Star field shell radius (world units). Large, so parallax is negligible. */
export const STAR_SPHERE_RADIUS = 300;
/** Constellation lines sit just inside the stars so points read on top. */
export const CONSTELLATION_RADIUS = 298;
/** Messier markers, just inside the stars. */
export const MESSIER_RADIUS = 296;
/** Celestial grid (equator / ecliptic) radius. */
export const GRID_RADIUS = 292;
/** Milky Way backdrop, well outside the stars. */
export const MILKY_WAY_RADIUS = 560;

/** Field-of-view zoom bounds (degrees). */
export const DEFAULT_FOV = 55;
export const MIN_FOV = 16;
export const MAX_FOV = 78;

/** What the user is inspecting (drives the DOM detail card). */
export type Selection =
  | { kind: "star"; star: Star }
  | { kind: "messier"; obj: MessierObject }
  | null;

/** Which optional layers are shown. */
export interface LayerState {
  constellationLines: boolean;
  constellationNames: boolean;
  messier: boolean;
  milkyWay: boolean;
  grid: boolean;
}

export const DEFAULT_LAYERS: LayerState = {
  constellationLines: true,
  constellationNames: false,
  messier: true,
  milkyWay: true,
  grid: false,
};

/** Observer position for the "sky from your location" mode. */
export interface Observer {
  label: string;
  lat: number;
  lon: number;
}

/** A small set of preset observing sites (spread across latitude + longitude). */
export const PRESET_CITIES: readonly Observer[] = [
  { label: "Boston, USA", lat: 42.3601, lon: -71.0589 },
  { label: "New York, USA", lat: 40.7128, lon: -74.006 },
  { label: "London, UK", lat: 51.5074, lon: -0.1278 },
  { label: "Reykjavík, Iceland", lat: 64.1466, lon: -21.9426 },
  { label: "Nairobi, Kenya", lat: -1.2921, lon: 36.8219 },
  { label: "Tokyo, Japan", lat: 35.6762, lon: 139.6503 },
  { label: "Sydney, Australia", lat: -33.8688, lon: 151.2093 },
  { label: "Santiago, Chile", lat: -33.4489, lon: -70.6693 },
];

export const DEFAULT_OBSERVER: Observer = PRESET_CITIES[0];

export type ViewMode = "sky" | "local";
