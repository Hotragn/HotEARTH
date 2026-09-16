/**
 * Every committed data mirror, and how to tell whether it is still current.
 *
 * WHY THIS EXISTS. The site ships forty one JSON files under public/data and
 * claims, on every tab, to be showing real measurements. Sixteen of those files
 * carried a build timestamp; the rest carried none; and the sixteen used SEVEN
 * different key names for the same fact: generated, meta.generated,
 * meta.retrieved, meta.built, meta.fetched_at, fetched, meta.cycle. Nothing read
 * them together, so there was no way, from inside the app, to answer the first
 * question a reader of a data site should ask: how old is this?
 *
 * Worse, there was no way to tell a healthy mirror from a broken one. The fetch
 * scripts are deliberately idempotent: they compare everything except their own
 * timestamp and decline to write when the upstream has not moved, so the
 * expected outcome of most cron runs is NO COMMIT. That is the right design and
 * it means an unchanged file is indistinguishable from a cron that died in
 * March. This module is what makes that distinguishable.
 *
 * THREE KINDS, and the distinction is the repository's own, taken from the
 * script that produces each file rather than invented here.
 *
 *   LIVE       produced by a fetch_ script from an upstream that keeps moving.
 *              Age is meaningful, and a cadence can be exceeded.
 *   PUBLISHED  a specific released version of a catalogue or model that will
 *              not change until its publisher releases the next one. IGRF-14 is
 *              the clearest case: it is fetched once, has no cron on purpose,
 *              and asking how stale it is confuses a publication for a feed.
 *   DERIVED    computed inside this repository from the sources above. Its age
 *              is the age of the code, not of any measurement.
 *
 * WHAT THIS DOES NOT DO. It does not re-document sources or licences. Every tab
 * already carries its own attribution footer naming the instrument, the agency
 * and the terms, and duplicating that here would create the second copy of a
 * constant that lib/repo.ts exists to prevent.
 */

import type { WorldTab } from "@/lib/worlds";

export type MirrorKind = "live" | "published" | "derived";

export interface Mirror {
  /** Web path, which is also the key. Matches a file under public/. */
  path: string;
  label: string;
  /** The tab that reads it, or null for a file several tabs share. */
  world: WorldTab | null;
  kind: MirrorKind;
  /**
   * How often a live mirror is expected to move, in days. Null when the cadence
   * is not the right question: a published catalogue does not have one, and two
   * live mirrors here have no cron at all, which is itself the finding.
   */
  cadenceDays: number | null;
  /** Dot path to the timestamp inside the payload, or null if it carries none. */
  stampPath: string | null;
  /** Why this entry is not the simple case. Shown on the page. */
  note?: string;
}

/**
 * Ordered by how much the age matters, not alphabetically.
 *
 * A reader who opens this page wants to know whether the wind is six hours old
 * before they want to know when the Messier catalogue was published, and a
 * maintainer wants the same order for the opposite reason.
 */
export const MIRRORS: readonly Mirror[] = [
  {
    path: "/data/wind/current.json",
    label: "GFS 10 m wind field",
    world: "earth",
    kind: "live",
    cadenceDays: 0.25,
    stampPath: "meta.cycle",
    note:
      "The cycle the forecast was initialised from, not when it was fetched: a six hour old cycle is the newest that exists.",
  },
  {
    path: "/data/iss/tle.json",
    label: "ISS orbital elements",
    world: "iss",
    kind: "live",
    cadenceDays: 0.5,
    stampPath: "meta.fetched_at",
    note:
      "A TLE degrades one to three km a day, so this is the one mirror where a week is genuinely too old.",
  },
  {
    path: "/data/rotation/rotation.json",
    label: "Earth orientation, IERS",
    world: "rotation",
    kind: "live",
    cadenceDays: 7,
    stampPath: "generated",
  },
  {
    path: "/data/ice/sea-ice.json",
    label: "Sea ice index, NSIDC",
    world: "ice",
    kind: "live",
    cadenceDays: 31,
    stampPath: "generated",
  },
  {
    path: "/data/ozone/ozone.json",
    label: "Ozone record",
    world: "ozone",
    kind: "live",
    cadenceDays: 31,
    stampPath: "generated",
  },
  {
    path: "/data/rivers/rivers.json",
    label: "Peak streamflow, USGS",
    world: "rivers",
    kind: "live",
    cadenceDays: 31,
    stampPath: "generated",
  },
  {
    path: "/data/sealevel/sea-level.json",
    label: "Sea level",
    world: "sea-level",
    kind: "live",
    cadenceDays: 31,
    stampPath: "generated",
  },
  {
    path: "/data/carbon/greenhouse-gases.json",
    label: "Greenhouse gases, NOAA GML",
    world: "carbon",
    kind: "live",
    cadenceDays: 31,
    stampPath: "meta.generated",
  },
  {
    path: "/data/climate/global-temperature.json",
    label: "Global temperature",
    world: "climate",
    kind: "live",
    cadenceDays: 31,
    stampPath: "meta.generated",
  },
  {
    path: "/data/sun/spaceweather.json",
    label: "Space weather, NOAA SWPC",
    world: "sun",
    kind: "live",
    cadenceDays: null,
    stampPath: null,
    note:
      "Fetched from a feed that keeps moving, with no cron and no timestamp in the payload. The sun tab reads SWPC live and falls back to this, so a stale copy is a degraded fallback rather than a wrong number on screen. Named here because an undated fallback is how that stops being true quietly.",
  },
  {
    path: "/data/sun/solar_cycle.json",
    label: "Solar cycle, NOAA SWPC",
    world: "sun",
    kind: "live",
    cadenceDays: null,
    stampPath: null,
    note:
      "Same fetch script and the same gap: SWPC revises this monthly and the copy here records no date.",
  },
  {
    path: "/data/magnetic/igrf14.json",
    label: "IGRF-14 coefficients",
    world: "magnetic",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
    note:
      "A frozen publication, not a feed. IGRF-14 was released once and will not change until IGRF-15, so it is fetched once and deliberately has no cron.",
  },
  {
    path: "/data/eclipses/canon.json",
    label: "Five millennium eclipse canon, NASA",
    world: "eclipses",
    kind: "published",
    cadenceDays: null,
    stampPath: "meta.retrieved",
  },
  {
    path: "/data/gravitational-waves/gwtc.json",
    label: "Gravitational wave transient catalogue",
    world: "gravitational-waves",
    kind: "published",
    cadenceDays: null,
    stampPath: "meta.retrieved",
  },
  {
    path: "/data/satellites/catalog.json",
    label: "Satellite and debris catalogue",
    world: "satellites",
    kind: "published",
    cadenceDays: null,
    stampPath: "meta.retrieved",
    note:
      "A snapshot of a catalogue that moves daily. Kept as a snapshot on purpose, and the tab says the orbits it draws are from that date rather than from now.",
  },
  {
    path: "/data/night-sky/stars.json",
    label: "Star catalogue, Hipparcos",
    world: "night-sky",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/night-sky/constellations.json",
    label: "Constellation figures",
    world: "night-sky",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/night-sky/messier.json",
    label: "Messier catalogue",
    world: "night-sky",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/galaxies/cosmic-web.json",
    label: "Galaxy redshift survey",
    world: "galaxies",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/galaxies/cosmic-web.meta.json",
    label: "Galaxy survey provenance",
    world: "galaxies",
    kind: "published",
    cadenceDays: null,
    stampPath: "fetched",
  },
  {
    path: "/data/exoplanets/systems.json",
    label: "Exoplanet systems, NASA archive",
    world: "exoplanets",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
    note:
      "The archive gains planets every week. This is the snapshot the tab was built against, and the count on screen is that snapshot's count.",
  },
  {
    path: "/data/small-bodies/objects.json",
    label: "Comets and asteroids, JPL",
    world: "small-bodies",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/meteor-showers/showers.json",
    label: "Meteor shower parameters, IMO",
    world: "meteor-showers",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/mars/climatology.json",
    label: "Mars surface climatology",
    world: "mars",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/moon/diurnal_temperature.json",
    label: "Lunar surface temperature, Diviner",
    world: "moon",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/planets/constants.json",
    label: "Planetary constants",
    world: "solar",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/planets/saturn_rings.json",
    label: "Saturn ring geometry",
    world: "saturn-moons",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/planets/zonal_winds.json",
    label: "Planetary zonal winds",
    world: "solar",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/moons/constants.json",
    label: "Moon constants",
    world: "moons",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/moons/phenomena.json",
    label: "Moon phenomena",
    world: "moons",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/dwarf-planets/constants.json",
    label: "Dwarf planet constants",
    world: "dwarfs",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/dwarf-planets/phenomena.json",
    label: "Dwarf planet phenomena",
    world: "dwarfs",
    kind: "published",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/cities.json",
    label: "City gazetteer",
    world: null,
    kind: "published",
    cadenceDays: null,
    stampPath: "meta.generated",
  },
  {
    path: "/data/history/events.json",
    label: "Historical events",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/history/population.json",
    label: "World population over time",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/history/climate.json",
    label: "Palaeoclimate series",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
  },
  {
    path: "/data/history/cities_over_time.json",
    label: "Cities over time",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: "meta.built",
  },
  {
    path: "/data/mars/seasonal_pressure.json",
    label: "Mars seasonal pressure",
    world: "mars",
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
    note:
      "An intermediate product of the Mars pressure climatology build. Published for inspection; no tab reads it.",
  },
  {
    path: "/data/model/coefficients.json",
    label: "Surface temperature model coefficients",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
    note:
      "Trained in this repository by model/train.py. Published for inspection; no tab reads it.",
  },
  {
    path: "/data/model/accuracy.json",
    label: "Surface temperature model accuracy",
    world: null,
    kind: "derived",
    cadenceDays: null,
    stampPath: "generated",
    note:
      "The measured skill of the model above, published so the claim can be checked. No tab reads it.",
  },
  {
    path: "/data/surfaces/mars-gale-heightmap.json",
    label: "Gale crater heightmap",
    world: "surfaces",
    kind: "derived",
    cadenceDays: null,
    stampPath: null,
  },] as const;

/** Grace beyond the cadence before a live mirror is called stale, as a factor. */
export const STALE_FACTOR = 2;

/** The key names found in the payloads, for the test that keeps the list honest. */
export const KNOWN_STAMP_PATHS = [
  "generated",
  "fetched",
  "meta.generated",
  "meta.retrieved",
  "meta.built",
  "meta.fetched_at",
  "meta.cycle",
] as const;

/* --------------------------------------------------------- reading the stamp */

/**
 * Pull a timestamp out of a payload by its declared dot path.
 *
 * Deliberately refuses to go looking. An earlier version of this searched the
 * payload for anything that parsed as a date, which found the wrong field twice:
 * the wind file's `meta.generated` instead of its `meta.cycle`, and an
 * observation epoch inside the ISS elements instead of the fetch time. A
 * declared path that stops resolving is a loud failure; a search that finds
 * something plausible is a quiet one.
 */
export function readStamp(payload: unknown, stampPath: string | null): string | null {
  if (!stampPath || !payload || typeof payload !== "object") return null;
  let node: unknown = payload;
  for (const key of stampPath.split(".")) {
    if (!node || typeof node !== "object" || Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[key];
  }
  return typeof node === "string" && node.length > 0 ? node : null;
}

/** Milliseconds since an ISO timestamp, or null if it will not parse. */
export function parseStamp(stamp: string | null): number | null {
  if (!stamp) return null;
  // The payloads are not uniform: some carry a Z, some an offset, some a bare
  // date. Date.parse handles all three; a bare date is treated as UTC midnight,
  // which is the right reading for a file built by a scheduled job.
  const t = Date.parse(stamp.length === 10 ? `${stamp}T00:00:00Z` : stamp);
  return Number.isNaN(t) ? null : t;
}

export type FreshnessState =
  /** Inside its cadence. */
  | "current"
  /** Past its cadence but inside the grace factor: a run may simply be late. */
  | "due"
  /** Past cadence times the grace factor. Something is probably broken. */
  | "stale"
  /** A published version, where age is information rather than a verdict. */
  | "published"
  /** Computed here; its age is the age of the code. */
  | "derived"
  /** No timestamp in the payload, so the question cannot be answered. */
  | "undated";

export interface Freshness {
  mirror: Mirror;
  stamp: string | null;
  ageDays: number | null;
  state: FreshnessState;
  /** True only for a live mirror that has actually exceeded its grace. */
  needsAttention: boolean;
}

/**
 * What the age of one mirror means.
 *
 * `now` is passed in rather than read, so a test can ask what this page will say
 * in six months and so the page can compute against the reader's clock instead
 * of against the build.
 */
export function freshness(mirror: Mirror, stamp: string | null, now: number): Freshness {
  const at = parseStamp(stamp);
  const ageDays = at === null ? null : (now - at) / 86_400_000;

  if (mirror.kind === "published" || mirror.kind === "derived") {
    return { mirror, stamp, ageDays, state: mirror.kind, needsAttention: false };
  }
  if (at === null || mirror.cadenceDays === null) {
    return { mirror, stamp, ageDays, state: "undated", needsAttention: false };
  }
  const days = ageDays ?? 0;
  if (days <= mirror.cadenceDays) {
    return { mirror, stamp, ageDays, state: "current", needsAttention: false };
  }
  if (days <= mirror.cadenceDays * STALE_FACTOR) {
    return { mirror, stamp, ageDays, state: "due", needsAttention: false };
  }
  return { mirror, stamp, ageDays, state: "stale", needsAttention: true };
}

/** The live mirrors, in registry order. */
export const LIVE_MIRRORS = MIRRORS.filter((m) => m.kind === "live");

/**
 * Live mirrors with no timestamp in the payload, which is a real gap and is
 * listed rather than smoothed over. The test below requires that every live
 * mirror is either dated or named here, so a new undated feed cannot be added
 * without this list growing and somebody noticing.
 */
export const UNDATED_LIVE = MIRRORS.filter(
  (m) => m.kind === "live" && m.stampPath === null
).map((m) => m.path);

/* ----------------------------------------------------------- what is claimed */

export const WHY_NO_CHANGE_IS_HEALTHY_NOTE =
  "Most scheduled runs are expected to change nothing. Every fetch script compares the whole payload except its own timestamp against what is already committed, and declines to write when the upstream has not moved. That keeps the repository from collecting a commit a month for numbers nobody published, and it means an unchanged file looks exactly like a job that stopped running. The age below is what tells those apart, which is the only reason this page exists.";

export const KINDS_NOTE =
  "Age means three different things here. A live mirror comes from an upstream that keeps moving, so an age past its cadence is a problem. A published mirror is one released version of a catalogue, so its age is how long ago the publisher released it and nothing is wrong with a number in the thousands of days. A derived file is computed in this repository, so its age is the age of the code. Sorting all three into one column and calling the big numbers stale would be the easiest wrong thing this page could do.";

export const CADENCE_IS_A_CHOICE_NOTE =
  "The cadences are chosen here, not published by anybody. They are set slightly looser than the job that fills each file, so a run that slips by a day does not raise an alarm, and they say nothing about how often the upstream agency actually revises its data. What they are good for is catching the case this page was built for: a job that has silently stopped.";

export const BUILD_AGE_NOTE =
  "There is a benign cause of a stale reading, and it is the common one: this page reports what the build it is part of contains, not what the repository contains now. The sub-daily mirrors, the wind field and the ISS elements, are replaced every six and twelve hours, so any build made from a branch that has not caught up with those commits will show both of them as days old and stale together. Two high-cadence mirrors going stale by the same amount at the same time is a sign the build is old. One going stale on its own, or a monthly one going stale, is a sign the job is.";

export const UNDATED_NOTE =
  "Two live mirrors carry no timestamp at all, so the question this page asks cannot be answered for them. Both come from the same fetch script, both are read from an upstream that keeps moving, and neither has a cron. They are listed as undated rather than assumed fine, because the alternative is a page that looks complete and is not.";
