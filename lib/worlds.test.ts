import { describe, expect, it } from "vitest";
import {
  WORLDS,
  WORLD_GROUPS,
  adjacentWorlds,
  fuzzyScore,
  getGroup,
  getGroupForWorld,
  getWorld,
  getWorldsInGroup,
  groupSearchResults,
  groupedWorlds,
  searchWorlds,
  worldScore,
  type WorldTab,
} from "./worlds";

/**
 * The worlds registry is the single source of truth for the nav, command
 * palette, mobile menu and overview. These guard the invariants those UIs
 * depend on, plus the fuzzy-search ranking.
 */
describe("worlds registry", () => {
  it("has the thirty-three world views, all unique", () => {
    expect(WORLDS).toHaveLength(33);
    const ids = WORLDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = WORLDS.map((w) => w.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("matches the current route map exactly", () => {
    const map = Object.fromEntries(WORLDS.map((w) => [w.id, w.href]));
    expect(map).toEqual({
      earth: "/",
      tonight: "/tonight",
      quakes: "/earthquakes",
      aurora: "/aurora",
      living: "/living-earth",
      iss: "/iss",
      mars: "/mars",
      surfaces: "/surfaces",
      virtual: "/virtual-earth",
      moon: "/moon",
      solar: "/solar-system",
      moons: "/moons",
      "jupiter-moons": "/jupiter-moons",
      "saturn-moons": "/saturn-moons",
      "other-moons": "/other-moons",
      "dwarf-moons": "/dwarf-moons",
      dwarfs: "/dwarf-planets",
      "small-bodies": "/small-bodies",
      "asteroid-moons": "/asteroid-moons",
      "meteor-showers": "/meteor-showers",
      sun: "/sun",
      exoplanets: "/exoplanets",
      transits: "/transits",
      "night-sky": "/night-sky",
      interstellar: "/interstellar",
      "exo-surfaces": "/exo-surfaces",
      "black-holes": "/black-holes",
      "neutron-stars": "/neutron-stars",
      galaxies: "/galaxies",
      "gravitational-waves": "/gravitational-waves",
      satellites: "/satellites",
      eclipses: "/eclipses",
      stars: "/stars",
    });
  });

  it("assigns every world to a real group", () => {
    const groupIds = new Set(WORLD_GROUPS.map((g) => g.id));
    for (const w of WORLDS) {
      expect(groupIds.has(w.group)).toBe(true);
    }
  });

  it("splits 9 Earth, 14 Solar System and 10 Beyond worlds", () => {
    expect(getWorldsInGroup("earth").map((w) => w.id)).toEqual([
      "earth",
      "tonight",
      "quakes",
      "aurora",
      "living",
      "virtual",
      "iss",
      "satellites",
      "eclipses",
    ]);
    expect(getWorldsInGroup("solar-system").map((w) => w.id)).toEqual([
      "mars",
      "surfaces",
      "moon",
      "solar",
      "moons",
      "jupiter-moons",
      "saturn-moons",
      "other-moons",
      "dwarf-moons",
      "dwarfs",
      "small-bodies",
      "asteroid-moons",
      "meteor-showers",
      "sun",
    ]);
    expect(getWorldsInGroup("beyond").map((w) => w.id)).toEqual([
      "exoplanets",
      "stars",
      "transits",
      "night-sky",
      "interstellar",
      "exo-surfaces",
      "black-holes",
      "neutron-stars",
      "galaxies",
      "gravitational-waves",
    ]);
  });

  it("gives every world a non-empty label, blurb and hex accent", () => {
    for (const w of WORLDS) {
      expect(w.label.length).toBeGreaterThan(0);
      expect(w.blurb.length).toBeGreaterThan(0);
      expect(w.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(w.keywords.length).toBeGreaterThan(0);
    }
  });

  it("looks worlds and groups up by id", () => {
    expect(getWorld("mars")?.label).toBe("Mars");
    expect(getWorld("solar")?.href).toBe("/solar-system");
    expect(getWorld("nope" as WorldTab)).toBeUndefined();
    expect(getGroup("earth")?.label).toBe("Earth");
    expect(getGroupForWorld("dwarfs")).toBe("solar-system");
    expect(getGroupForWorld("living")).toBe("earth");
  });

  it("groups worlds in canonical order", () => {
    const grouped = groupedWorlds();
    expect(grouped.map((g) => g.group.id)).toEqual([
      "earth",
      "solar-system",
      "beyond",
    ]);
    expect(grouped[0].worlds).toHaveLength(9);
    expect(grouped[1].worlds).toHaveLength(14);
    expect(grouped[2].worlds).toHaveLength(10);
  });

  it("adjacentWorlds steps through canonical order and wraps", () => {
    const first = WORLDS[0];
    const last = WORLDS[WORLDS.length - 1];
    const second = WORLDS[1];

    // wrap-around at both ends
    expect(adjacentWorlds(first.id)?.prev.id).toBe(last.id);
    expect(adjacentWorlds(first.id)?.next.id).toBe(second.id);
    expect(adjacentWorlds(last.id)?.next.id).toBe(first.id);

    // interior step is exactly +/- 1
    expect(adjacentWorlds(second.id)?.prev.id).toBe(first.id);
    expect(adjacentWorlds(second.id)?.next.id).toBe(WORLDS[2].id);
  });

  it("adjacentWorlds returns null for an unknown id", () => {
    expect(adjacentWorlds("not-a-world" as WorldTab)).toBeNull();
  });
});

describe("fuzzyScore", () => {
  it("returns 0 for an empty query", () => {
    expect(fuzzyScore("", "mars")).toBe(0);
    expect(fuzzyScore("   ", "mars")).toBe(0);
  });

  it("ranks exact > prefix > substring > subsequence > no-match", () => {
    const exact = fuzzyScore("mars", "mars");
    const prefix = fuzzyScore("mar", "mars");
    const substring = fuzzyScore("ars", "mars");
    const subseq = fuzzyScore("mrs", "mars");
    const none = fuzzyScore("xyz", "mars");
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(substring);
    expect(substring).toBeGreaterThan(subseq);
    expect(subseq).toBeGreaterThan(none);
    expect(none).toBe(0);
  });

  it("is case-insensitive and trims", () => {
    expect(fuzzyScore("  MARS ", "Mars")).toBe(fuzzyScore("mars", "mars"));
  });
});

describe("searchWorlds", () => {
  it("returns every world in canonical order for an empty query", () => {
    expect(searchWorlds("").map((w) => w.id)).toEqual(WORLDS.map((w) => w.id));
    expect(searchWorlds("   ")).toHaveLength(33);
  });

  it("finds a world by exact label", () => {
    expect(searchWorlds("mars")[0].id).toBe("mars");
  });

  it("finds a world by keyword / body name", () => {
    // "ceres" is unique to the Dwarf Planets (`dwarfs`) world: Ceres has no moons,
    // so it is absent from the Dwarf Moons tab. ("pluto"/"charon"/"eris"/"haumea"/
    // "makemake" are now shared between `dwarfs` and `dwarf-moons`, which ties on
    // score and resolves by canonical order, so they are guarded elsewhere by
    // terms unique to each tab.)
    expect(searchWorlds("ceres")[0].id).toBe("dwarfs");
    expect(searchWorlds("europa")[0].id).toBe("moons");
    expect(searchWorlds("time machine")[0].id).toBe("virtual");
    expect(searchWorlds("city lights")[0].id).toBe("living");
    expect(searchWorlds("orrery")[0].id).toBe("solar");
    expect(searchWorlds("aurora")[0].id).toBe("aurora");
    expect(searchWorlds("northern lights")[0].id).toBe("aurora");
    expect(searchWorlds("kp index")[0].id).toBe("aurora");
    expect(searchWorlds("earthquake")[0].id).toBe("quakes");
    expect(searchWorlds("seismic")[0].id).toBe("quakes");
    expect(searchWorlds("ring of fire")[0].id).toBe("quakes");
    expect(searchWorlds("magnitude")[0].id).toBe("quakes");
    expect(searchWorlds("stargazing")[0].id).toBe("tonight");
    expect(searchWorlds("what can i see tonight")[0].id).toBe("tonight");
    expect(searchWorlds("dark sky")[0].id).toBe("tonight");
    expect(searchWorlds("twilight")[0].id).toBe("tonight");
    // "iss pass" must still resolve to the ISS tracker, not to Tonight, even
    // though Tonight lists passes too: the tracker is the world about the object.
    expect(searchWorlds("iss")[0].id).toBe("iss");
    expect(searchWorlds("space station")[0].id).toBe("iss");
    // and the shower catalogue stays with its own world
    expect(searchWorlds("perseids")[0].id).toBe("meteor-showers");
    expect(searchWorlds("trappist")[0].id).toBe("exoplanets");
    expect(searchWorlds("habitable zone")[0].id).toBe("exoplanets");
    expect(searchWorlds("constellation")[0].id).toBe("night-sky");
    expect(searchWorlds("orion")[0].id).toBe("night-sky");
    expect(searchWorlds("milky way")[0].id).toBe("night-sky");
    expect(searchWorlds("messier")[0].id).toBe("night-sky");
    expect(searchWorlds("apophis")[0].id).toBe("small-bodies");
    expect(searchWorlds("comet")[0].id).toBe("small-bodies");
    expect(searchWorlds("perseids")[0].id).toBe("meteor-showers");
    expect(searchWorlds("geminids")[0].id).toBe("meteor-showers");
    expect(searchWorlds("meteor shower")[0].id).toBe("meteor-showers");
    expect(searchWorlds("meteor")[0].id).toBe("meteor-showers");
    expect(searchWorlds("radiant")[0].id).toBe("meteor-showers");
    expect(searchWorlds("zhr")[0].id).toBe("meteor-showers");
    expect(searchWorlds("aurora")[0].id).toBe("aurora");
    expect(searchWorlds("space weather")[0].id).toBe("sun");
    expect(searchWorlds("sunspot")[0].id).toBe("sun");
    expect(searchWorlds("solar wind")[0].id).toBe("sun");
    // ISS Tracker — guarded by terms unique to it. ("satellite" is intentionally
    // NOT asserted here: it is a shared keyword of the Earth world, which sorts
    // first on the tie, so the honest guard uses ISS-only phrases.)
    expect(searchWorlds("iss")[0].id).toBe("iss");
    expect(searchWorlds("space station")[0].id).toBe("iss");
    // The Satellites tab shares vocabulary with the ISS tracker (both are SGP4 on
    // real element sets), so guard both directions: ISS phrases must still reach
    // the ISS tab, and debris/constellation phrases must reach the catalogue tab.
    // This caught a real regression when "space debris" was a keyword: it shares
    // the token "space" with "space station" and outranked it.
    expect(searchWorlds("starlink")[0].id).toBe("satellites");
    expect(searchWorlds("orbital debris")[0].id).toBe("satellites");
    expect(searchWorlds("kessler")[0].id).toBe("satellites");
    expect(searchWorlds("geostationary")[0].id).toBe("satellites");
    expect(searchWorlds("saros")[0].id).toBe("eclipses");
    expect(searchWorlds("totality")[0].id).toBe("eclipses");
    expect(searchWorlds("lunar eclipse")[0].id).toBe("eclipses");
    // Stars shares vocabulary with Night Sky (same catalogue, different use), so
    // guard both: sky-map phrases stay with night-sky, astrophysics with stars.
    expect(searchWorlds("hr diagram")[0].id).toBe("stars");
    expect(searchWorlds("main sequence")[0].id).toBe("stars");
    expect(searchWorlds("white dwarf")[0].id).toBe("stars");
    expect(searchWorlds("stellar evolution")[0].id).toBe("stars");
    expect(searchWorlds("spot the station")[0].id).toBe("iss");
    expect(searchWorlds("sgp4")[0].id).toBe("iss");
    expect(searchWorlds("tiangong")[0].id).toBe("iss");
    // Jupiter's Moons (Galilean events) — guarded by terms unique to it. "io",
    // "europa", "ganymede" and "callisto" are shared with the Moons world (which
    // sorts first on the tie), so the honest guard uses Jupiter-events-only phrases.
    expect(searchWorlds("galilean")[0].id).toBe("jupiter-moons");
    expect(searchWorlds("shadow transit")[0].id).toBe("jupiter-moons");
    expect(searchWorlds("jovian")[0].id).toBe("jupiter-moons");
    expect(searchWorlds("meeus")[0].id).toBe("jupiter-moons");
    // Saturn's Moons (ring tilt / seasonal events) — guarded by terms unique to
    // it. "saturn" is shared with the Planets (`solar`) world and
    // "titan"/"iapetus"/"enceladus"/"mimas" are shared with the `moons` world,
    // both of which sort first on the tie, so the honest guard uses phrases unique
    // to this tab (multi-word "saturn moons", "ring tilt", "ring plane", plus
    // "phesat", "cassini", "saturnian").
    expect(searchWorlds("saturn moons")[0].id).toBe("saturn-moons");
    expect(searchWorlds("ring tilt")[0].id).toBe("saturn-moons");
    expect(searchWorlds("ring plane")[0].id).toBe("saturn-moons");
    expect(searchWorlds("ring opening")[0].id).toBe("saturn-moons");
    expect(searchWorlds("phesat")[0].id).toBe("saturn-moons");
    expect(searchWorlds("cassini")[0].id).toBe("saturn-moons");
    expect(searchWorlds("saturnian")[0].id).toBe("saturn-moons");
    // Other Moons (Mars/Uranus/Neptune satellites) — guarded by terms unique to
    // it. "uranus" and "neptune" are shared with the Planets (`solar`) world and
    // "triton" is shared with the `moons` world, all of which sort first on the
    // tie, so the honest guard uses terms only this tab carries: the multi-word
    // "other moons" plus the moon names "phobos", "miranda", "oberon", "titania"
    // and "nereid".
    expect(searchWorlds("other moons")[0].id).toBe("other-moons");
    expect(searchWorlds("phobos")[0].id).toBe("other-moons");
    expect(searchWorlds("miranda")[0].id).toBe("other-moons");
    expect(searchWorlds("oberon")[0].id).toBe("other-moons");
    expect(searchWorlds("titania")[0].id).toBe("other-moons");
    expect(searchWorlds("nereid")[0].id).toBe("other-moons");
    // Dwarf Moons (Pluto/Eris/Haumea/Makemake satellites) — guarded by terms
    // unique to it. "pluto"/"charon"/"eris"/"haumea"/"makemake" are shared with the
    // Dwarf Planets (`dwarfs`) world (they tie on score and resolve by canonical
    // order), so the honest guard uses terms only this tab carries: the multi-word
    // "dwarf moons" plus the small-moon names.
    expect(searchWorlds("dwarf moons")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("styx")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("nix")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("hydra")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("kerberos")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("dysnomia")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("hiiaka")[0].id).toBe("dwarf-moons");
    expect(searchWorlds("namaka")[0].id).toBe("dwarf-moons");
    // Asteroid Moons (real binary/multiple asteroid systems + the comet honesty) —
    // guarded by terms UNIQUE to it. Bare "asteroid" and "comet" are shared with the
    // Comets & Asteroids (`small-bodies`) world, which wins those on its exact
    // keyword, so the honest guard uses terms only this tab carries: the multi-word
    // "asteroid moons" plus the system / moon / mission names below.
    expect(searchWorlds("asteroid moons")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("didymos")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("dimorphos")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("dart")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("dactyl")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("kleopatra")[0].id).toBe("asteroid-moons");
    expect(searchWorlds("patroclus")[0].id).toBe("asteroid-moons");
    // Interstellar (the third Beyond world) — guarded by terms UNIQUE to it. Bare
    // "oumuamua", "borisov" and "interstellar" are SHARED with the Comets & Asteroids
    // (`small-bodies`) world, which sorts first on the tie (canonical order), so the
    // honest guard uses terms only this tab carries: the swarm-defense sim vocabulary,
    // the "3i atlas" multi-word designation, "hyperbolic" and "planetary defense".
    expect(searchWorlds("swarm")[0].id).toBe("interstellar");
    expect(searchWorlds("swarm robotics")[0].id).toBe("interstellar");
    expect(searchWorlds("boids")[0].id).toBe("interstellar");
    expect(searchWorlds("3i atlas")[0].id).toBe("interstellar");
    expect(searchWorlds("hyperbolic")[0].id).toBe("interstellar");
    expect(searchWorlds("planetary defense")[0].id).toBe("interstellar");
    // Surfaces (ground-level Mars + Titan) — guarded by terms UNIQUE to it. Bare
    // "mars" is the Mars world's own label, "titan" is shared with the `moons` and
    // `saturn-moons` worlds and "curiosity"/"cassini" are shared with earlier tabs,
    // so the honest guard uses terms only this tab carries: the multi-word
    // "stand on mars", the site names "gale crater" and "jezero", "panorama",
    // "blue sunset", "mount sharp" and "huygens" (verified unclaimed elsewhere).
    expect(searchWorlds("stand on mars")[0].id).toBe("surfaces");
    expect(searchWorlds("gale crater")[0].id).toBe("surfaces");
    expect(searchWorlds("mount sharp")[0].id).toBe("surfaces");
    expect(searchWorlds("jezero")[0].id).toBe("surfaces");
    expect(searchWorlds("panorama")[0].id).toBe("surfaces");
    expect(searchWorlds("blue sunset")[0].id).toBe("surfaces");
    expect(searchWorlds("huygens")[0].id).toBe("surfaces");
    expect(searchWorlds("titan surface")[0].id).toBe("surfaces");
    // Exoplanet Surfaces (the fourth Beyond world) — guarded by terms UNIQUE to
    // it. Bare "trappist", "proxima" and "exoplanet" are SHARED with the
    // Exoplanets (`exoplanets`) world, which sorts first on the tie (canonical
    // order), so the honest guard uses phrases only this tab carries: the
    // multi-word "exoplanet surface", "alien sky", "stand on exoplanet",
    // "red dwarf sky" and "alien world".
    expect(searchWorlds("exoplanet surface")[0].id).toBe("exo-surfaces");
    expect(searchWorlds("exoplanet surfaces")[0].id).toBe("exo-surfaces");
    expect(searchWorlds("alien sky")[0].id).toBe("exo-surfaces");
    expect(searchWorlds("alien world")[0].id).toBe("exo-surfaces");
    expect(searchWorlds("stand on exoplanet")[0].id).toBe("exo-surfaces");
    expect(searchWorlds("red dwarf sky")[0].id).toBe("exo-surfaces");
    // Black Holes (the fifth Beyond world) — guarded by terms UNIQUE to it.
    // "sagittarius a" and "m87" are avoided here because they sit near the
    // Night Sky / Exoplanets vocabulary; the honest guard uses the black-hole
    // physics terms that no other world claims.
    expect(searchWorlds("black hole")[0].id).toBe("black-holes");
    expect(searchWorlds("black holes")[0].id).toBe("black-holes");
    expect(searchWorlds("gravitational lensing")[0].id).toBe("black-holes");
    expect(searchWorlds("event horizon")[0].id).toBe("black-holes");
    expect(searchWorlds("schwarzschild")[0].id).toBe("black-holes");
    expect(searchWorlds("time dilation")[0].id).toBe("black-holes");
    expect(searchWorlds("spaghettification")[0].id).toBe("black-holes");
    expect(searchWorlds("photon ring")[0].id).toBe("black-holes");
    // Neutron Stars (the sixth Beyond world) — guarded by terms UNIQUE to it.
    // These pulsar-physics terms are claimed by no other world (grep-verified),
    // so each resolves to `neutron-stars` first.
    expect(searchWorlds("neutron star")[0].id).toBe("neutron-stars");
    expect(searchWorlds("neutron stars")[0].id).toBe("neutron-stars");
    expect(searchWorlds("pulsar")[0].id).toBe("neutron-stars");
    expect(searchWorlds("magnetar")[0].id).toBe("neutron-stars");
    expect(searchWorlds("lighthouse")[0].id).toBe("neutron-stars");
    expect(searchWorlds("joy division")[0].id).toBe("neutron-stars");
    expect(searchWorlds("millisecond pulsar")[0].id).toBe("neutron-stars");
    // Galaxies (the seventh Beyond world) — guarded by terms UNIQUE to it. Bare
    // "galaxy"/"milky way" are SHARED with the Night Sky (`night-sky`) world,
    // which sorts first on the tie (canonical order), and "hubble" is shared with
    // the ISS world, so the honest guard uses galaxy-specific terms that no other
    // world claims (grep-verified): "cosmic web", "andromeda", "local group",
    // "laniakea", "sdss", "deep field", "large-scale structure", plus the plural
    // "galaxies" (night-sky carries only the singular "galaxy").
    expect(searchWorlds("cosmic web")[0].id).toBe("galaxies");
    expect(searchWorlds("galaxies")[0].id).toBe("galaxies");
    expect(searchWorlds("andromeda")[0].id).toBe("galaxies");
    expect(searchWorlds("local group")[0].id).toBe("galaxies");
    expect(searchWorlds("laniakea")[0].id).toBe("galaxies");
    expect(searchWorlds("sdss")[0].id).toBe("galaxies");
    expect(searchWorlds("deep field")[0].id).toBe("galaxies");
    expect(searchWorlds("large-scale structure")[0].id).toBe("galaxies");
  });

  it("returns nothing for gibberish", () => {
    expect(searchWorlds("qzxwvk")).toEqual([]);
  });

  it("only returns matches (never the whole list) for a real query", () => {
    const results = searchWorlds("mars");
    expect(results.length).toBeLessThan(WORLDS.length);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("worldScore", () => {
  it("scores 0 for an empty query", () => {
    expect(worldScore("", WORLDS[0])).toBe(0);
  });

  it("scores a matching world above a non-matching one", () => {
    const mars = getWorld("mars")!;
    const moon = getWorld("moon")!;
    expect(worldScore("mars", mars)).toBeGreaterThan(worldScore("mars", moon));
  });
});

describe("groupSearchResults", () => {
  it("groups results and drops empty groups", () => {
    // "ceres" is the `dwarfs` world's own keyword (Ceres has no moons), so it wins
    // outright. It also weakly subsequence-matches the Neutron Stars keyword
    // "nuclear density" (c-e-r-e-s), which adds a low-scoring Beyond group after
    // the solar-system one; the leading match is still `dwarfs`.
    const grouped = groupSearchResults(searchWorlds("ceres"));
    expect(grouped[0].group.id).toBe("solar-system");
    expect(grouped[0].worlds[0].id).toBe("dwarfs");
  });

  it("keeps all groups for the full list", () => {
    const grouped = groupSearchResults(searchWorlds(""));
    expect(grouped.map((g) => g.group.id)).toEqual([
      "earth",
      "solar-system",
      "beyond",
    ]);
  });
});
