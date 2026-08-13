/**
 * Eclipses: the published NASA canon, 2001-2100.
 *
 * Every eclipse here is a row from the Five Millennium Canon of Solar and Lunar
 * Eclipses (Espenak & Meeus), shipped at public/data/eclipses/canon.json. This
 * module does NOT predict eclipses. Predicting them properly means Besselian
 * elements and local circumstances, and a naive implementation would produce
 * confidently wrong times, so we ship the authoritative catalogue and compute
 * only what follows from it unambiguously:
 *
 *  - which eclipse is next, and how long until it
 *  - saros series grouping, and the saros interval the data itself exhibits
 *  - how central an eclipse is, from the tabulated gamma
 *  - great-circle distance to the tabulated greatest-eclipse point
 *
 * That last one is explicitly NOT a visibility calculation, and the helper name
 * and docs say so. Same null-safety contract as the other libs.
 */

/** T total, A annular, H hybrid (annular-total), P partial. */
export type SolarEclipseType = "T" | "A" | "H" | "P";
/** T total, P partial, N penumbral. */
export type LunarEclipseType = "T" | "P" | "N";

export interface SolarEclipse {
  id: string;
  /** Terrestrial Dynamical Time of greatest eclipse, as tabulated. */
  td: string;
  dT: number | null;
  saros: number | null;
  type: string;
  qual: string;
  /** Distance of the shadow axis from Earth's centre, in Earth radii. */
  gamma: number | null;
  /** Eclipse magnitude: >1 means the Moon fully covers the Sun. */
  mag: number | null;
  /** Greatest-eclipse point. */
  lat: number | null;
  lon: number | null;
  sunAlt: number | null;
  pathKm: number | null;
  /** Central duration in seconds. */
  durS: number | null;
}

export interface LunarEclipse {
  id: string;
  td: string;
  dT: number | null;
  saros: number | null;
  type: string;
  qual: string;
  gamma: number | null;
  penMag: number | null;
  /** Umbral magnitude: >1 means the Moon is fully inside the umbra. */
  umbMag: number | null;
  penMin: number | null;
  parMin: number | null;
  totMin: number | null;
  lat: number | null;
  lon: number | null;
}

export interface EclipseCanon {
  meta: {
    source: string;
    urls: { solar: string; lunar: string };
    credit: string;
    license: string;
    retrieved: string;
    span: string;
    timeScale: string;
    counts: { solar: number; lunar: number };
    note: string;
  };
  solar: SolarEclipse[];
  lunar: LunarEclipse[];
}

/**
 * The saros: 6585.3213 days, or 18 years 11 days 8 hours. Eclipses separated by
 * one saros are near-repeats because the Moon returns to the same phase, the
 * same distance and the same node. The extra 8 hours is why each repeat lands
 * about 120 degrees further west.
 */
export const SAROS_DAYS = 6585.3213;

export const SOLAR_TYPE_LABEL: Record<string, string> = {
  T: "Total",
  A: "Annular",
  H: "Hybrid",
  P: "Partial",
};

export const LUNAR_TYPE_LABEL: Record<string, string> = {
  T: "Total",
  P: "Partial",
  N: "Penumbral",
};

export const SOLAR_TYPE_NOTE: Record<string, string> = {
  T: "The Moon covers the Sun completely: the corona becomes visible along a narrow path.",
  A: "The Moon is too far from Earth to cover the Sun, leaving a ring of sunlight.",
  H: "Rare: the same eclipse is annular at some points along the path and total at others.",
  P: "The shadow axis misses Earth; nowhere sees more than a bite out of the Sun.",
};

export const LUNAR_TYPE_NOTE: Record<string, string> = {
  T: "The Moon passes entirely into Earth's umbra and usually turns red, lit only by sunlight refracted through Earth's atmosphere.",
  P: "Part of the Moon enters the umbra, giving a clear dark bite.",
  N: "The Moon only crosses the faint penumbra; the dimming is subtle and easy to miss.",
};

/** Parse the shipped canon. Returns null if unusable. */
export function parseCanon(json: unknown): EclipseCanon | null {
  const doc = json as EclipseCanon | null;
  if (!doc || !doc.meta || !Array.isArray(doc.solar) || !Array.isArray(doc.lunar)) {
    return null;
  }
  const ok = (e: { id?: unknown; td?: unknown }) =>
    typeof e?.id === "string" && typeof e?.td === "string" && isFinite(Date.parse(e.td as string));
  const solar = doc.solar.filter(ok);
  const lunar = doc.lunar.filter(ok);
  if (solar.length === 0 && lunar.length === 0) return null;
  return { meta: doc.meta, solar, lunar };
}

/** Eclipses at or after `from`, soonest first. Returns [] on bad input. */
export function upcoming<T extends { td: string }>(
  eclipses: T[],
  from: Date = new Date(),
  limit = 10,
): T[] {
  if (!Array.isArray(eclipses) || !(from instanceof Date) || isNaN(from.getTime())) {
    return [];
  }
  const t = from.getTime();
  return eclipses
    .filter((e) => {
      const et = Date.parse(e.td);
      return isFinite(et) && et >= t;
    })
    .sort((a, b) => Date.parse(a.td) - Date.parse(b.td))
    .slice(0, Math.max(0, limit));
}

/** The next eclipse at or after `from`, or null if the catalogue is exhausted. */
export function next<T extends { td: string }>(
  eclipses: T[],
  from: Date = new Date(),
): T | null {
  return upcoming(eclipses, from, 1)[0] ?? null;
}

/** Days from `from` until an eclipse. Negative for past ones. Null if unparseable. */
export function daysUntil(td: string, from: Date = new Date()): number | null {
  const t = Date.parse(td);
  if (!isFinite(t) || isNaN(from.getTime())) return null;
  return (t - from.getTime()) / 86400000;
}

/**
 * How central a solar eclipse is, from the tabulated gamma (the shadow axis's
 * least distance from Earth's centre, in Earth radii).
 *
 * |gamma| near 0 means the axis passes near the centre and the path runs through
 * the tropics; |gamma| near 1 means it grazes a pole; above about 1 the axis
 * misses Earth entirely, which is why those eclipses are only ever partial.
 */
export function centrality(gamma: number | null): {
  absGamma: number;
  label: string;
  axisMissesEarth: boolean;
} | null {
  if (gamma == null || !isFinite(gamma)) return null;
  const a = Math.abs(gamma);
  const axisMissesEarth = a > 1;
  const label = axisMissesEarth
    ? "Shadow axis misses Earth entirely"
    : a < 0.3
      ? "Nearly central: the path crosses low latitudes"
      : a < 0.7
        ? "Off-centre: a mid-latitude path"
        : "Grazing: the path is pushed toward a pole";
  return { absGamma: a, label, axisMissesEarth };
}

/** "6m23s" from seconds. Null in, null out. */
export function durationLabel(seconds: number | null): string | null {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m${String(s).padStart(2, "0")}s`;
}

/** Count eclipses by type code. */
export function countByType<T extends { type: string }>(
  eclipses: T[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of eclipses) {
    if (!e?.type) continue;
    out[e.type] = (out[e.type] ?? 0) + 1;
  }
  return out;
}

/** All eclipses in a saros series, chronologically. */
export function sarosSeries<T extends { saros: number | null; td: string }>(
  eclipses: T[],
  saros: number,
): T[] {
  if (!Array.isArray(eclipses) || !isFinite(saros)) return [];
  return eclipses
    .filter((e) => e.saros === saros)
    .sort((a, b) => Date.parse(a.td) - Date.parse(b.td));
}

/**
 * Mean interval in days between consecutive members of a saros series.
 *
 * Worth computing rather than asserting: it falls out of the catalogue at about
 * 6585.3 days, which is the saros, and that is a genuine check that both our
 * parsing and the data are sane. Returns null with fewer than two members.
 */
export function meanSarosIntervalDays<T extends { saros: number | null; td: string }>(
  eclipses: T[],
  saros: number,
): number | null {
  const series = sarosSeries(eclipses, saros);
  if (series.length < 2) return null;
  let total = 0;
  for (let i = 1; i < series.length; i++) {
    total += Date.parse(series[i].td) - Date.parse(series[i - 1].td);
  }
  return total / (series.length - 1) / 86400000;
}

/**
 * Great-circle distance [km]. Re-exported from lib/geo, which owns every
 * lat/lon convention in this app; see the note there about the two copies this
 * replaced.
 */
export { greatCircleKm } from "./geo";


/**
 * The honest sentence to show next to any distance-to-greatest-eclipse figure,
 * so the number cannot be mistaken for a visibility answer.
 */
export const VISIBILITY_CAVEAT =
  "This is the distance to the single point of greatest eclipse, not a visibility calculation. Whether you can see an eclipse depends on the shadow path and local circumstances, which this tab does not compute. Use NASA's page for that eclipse.";
