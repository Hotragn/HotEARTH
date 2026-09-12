/**
 * Shared UI constants + honesty strings for the Interstellar page. No physics
 * here (that lives in lib/interstellar and lib/swarm); just presentation tokens
 * and the labels the honesty rules require. No em-dashes anywhere (commas /
 * parentheses only), matching the project-wide copy rule.
 */

import type { InterstellarId } from "@/lib/interstellar";

/** The tab accent (matches lib/worlds "interstellar"): a luminous cyan. */
export const INTERSTELLAR_ACCENT = "#7ad7ff";

/** The three internal sub-sections of this page (NOT the global nav). */
export type Section = "arrival" | "visitors" | "swarm";

export interface SectionDef {
  id: Section;
  label: string;
  /** one-line honest description for tooltips / aria. */
  hint: string;
}

export const SECTIONS: readonly SectionDef[] = [
  {
    id: "arrival",
    label: "Arrival",
    hint: "A skippable cinematic intro (original assets, no film material).",
  },
  {
    id: "visitors",
    label: "The Visitors",
    hint: "The three real interstellar objects on their real hyperbolic paths.",
  },
  {
    id: "swarm",
    label: "Swarm Defense",
    hint: "A live simulation of real swarm-robotics algorithms (an educational game).",
  },
] as const;

/** localStorage key remembering the user finished / skipped Arrival. */
export const ARRIVAL_SEEN_KEY = "hot-interstellar-arrival-seen";

// ─────────────────────────── per-object colours ─────────────────────────────

/** A distinct colour per interstellar object (for paths, markers, selectors). */
export const OBJECT_COLOR: Record<InterstellarId, string> = {
  "1I": "#9be7ff", // 'Oumuamua, pale cyan
  "2I": "#7effc4", // Borisov, comet green
  "3I": "#ffb27a", // ATLAS, warm amber (came from the galactic center)
};

// ─────────────────────────── honesty strings ────────────────────────────────

/**
 * The single most important label on the whole page: this is a movie-INSPIRED
 * homage built from original assets, with zero copyrighted film material.
 */
export const HOMAGE_NOTE =
  "A movie-inspired homage with zero copyrighted film assets. No film score or " +
  "sound, no scenes, stills, logos or dialogue, and no film robot. The visual " +
  "backbone is real public-domain NASA/ESA footage and imagery; the guide is an " +
  "original monolith-style design. The interstellar objects are shown as real " +
  "trajectories, not photos, because none has ever been imaged.";

/** Label pinned to the robot guide wherever it appears. */
export const ROBOT_NOTE = "Original design, not from any film.";

/** Accuracy caveat for the Visitors section (osculating two-body). */
export const VISITORS_ACCURACY_NOTE =
  "Real osculating two-body hyperbolae from cited JPL SBDB / MPC elements. No " +
  "planetary perturbations and no non-gravitational (outgassing) forces are " +
  "modeled; 1I/'Oumuamua's measured non-gravitational acceleration is real but " +
  "not modeled here. For a precise ephemeris, cross-check JPL Horizons.";

// ─────────────────────── real NASA / ESA footage + imagery ──────────────────
// The Phase 25 rework anchors the page on genuine public-domain NASA/ESA video
// and photographs (see docs/INTERSTELLAR_DATA_SOURCES.md §3c), not a synthetic
// comp. Paths + verbatim credits live here so the backdrop, onboarding, Visitors
// strip and footer all cite them identically.

/** The HERO video: NASA/STScI galactic-center visualization (silent, PD). */
export const HERO_VIDEO_SRC =
  "/videos/interstellar/galactic-center-multiwavelength.mp4";

/** Verbatim credit for the hero video (docs §3c). */
export const HERO_VIDEO_CREDIT =
  "Video: NASA, ESA, and G. Bacon (STScI); Image Credits: NASA, ESA, CXC, SSC, and STScI";

/** Short caption shown on the backdrop so the footage reads as real, not a comp. */
export const HERO_VIDEO_LABEL =
  "Real NASA/ESA footage: the Milky Way galactic center (where 3I/ATLAS came from).";

export interface RealImage {
  src: string;
  /** short human title. */
  title: string;
  /** verbatim credit (docs §3c). */
  credit: string;
  /** one-line real fact. */
  fact: string;
}

/** The three public-domain stills, used with tasteful motion (docs §3c). */
export const REAL_IMAGERY: readonly RealImage[] = [
  {
    src: "/textures/interstellar/milky-way-galactic-center-spitzer.jpg",
    title: "Galactic center (Spitzer)",
    credit: "NASA/JPL-Caltech (Spitzer Space Telescope)",
    fact: "The crowded heart of the Milky Way, the direction 3I/ATLAS arrived from.",
  },
  {
    src: "/textures/interstellar/pale-blue-dot-voyager.jpg",
    title: "Pale Blue Dot (Voyager 1)",
    credit: "NASA/JPL-Caltech (Voyager 1)",
    fact: "Earth seen from about 6 billion km, the view as a probe leaves the Solar System.",
  },
  {
    src: "/textures/interstellar/hubble-extreme-deep-field.jpg",
    title: "Hubble eXtreme Deep Field",
    credit: "NASA, ESA, and the HUDF/XDF Team (Hubble Space Telescope)",
    fact: "Thousands of galaxies in a patch of sky a tenth the width of the full Moon.",
  },
] as const;

/** The Spitzer galactic-center still, reused as the video's poster / reduced-motion fallback. */
export const HERO_POSTER_SRC = REAL_IMAGERY[0].src;

/** The NASA public-domain audio credit (shown wherever audio is exposed). */
export const AUDIO_CREDIT =
  "NASA / JPL-Caltech, Voyager Plasma Wave Science instrument (University of Iowa)";

/** The public-domain audio file (committed in this repo). */
export const AUDIO_SRC = "/audio/interstellar-plasma-voyager.mp3";

/** Docs base for the two shipped source docs. */
export { DOCS_BASE } from "@/lib/repo";
