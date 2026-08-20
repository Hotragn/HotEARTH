/**
 * lib/worlds.ts — single source of truth for every navigable world/view.
 *
 * The nav, command palette, mobile menu and worlds overview all read from this
 * registry. Add a world here and it appears everywhere; nothing else needs to
 * know the list.
 *
 * Honesty rule (project-wide): every label + blurb describes what the view
 * actually renders. No invented capabilities.
 */

/**
 * Stable ids for each world. This union is the app-wide `active` tab contract:
 * every `*App.tsx` passes one of these string literals to <NavShell active=…>.
 * Keep these ids stable — changing one is a breaking change for those files.
 * (Re-exported from components/ui/NavShell.tsx for backwards compatibility.)
 */
export type WorldTab =
  | "earth"
  | "climate"
  | "carbon"
  | "magnetic"
  | "air"
  | "tonight"
  | "quakes"
  | "tides"
  | "aurora"
  | "living"
  | "iss"
  | "mars"
  | "surfaces"
  | "virtual"
  | "moon"
  | "solar"
  | "moons"
  | "jupiter-moons"
  | "saturn-moons"
  | "other-moons"
  | "dwarf-moons"
  | "dwarfs"
  | "small-bodies"
  | "asteroid-moons"
  | "meteor-showers"
  | "sun"
  | "exoplanets"
  | "night-sky"
  | "interstellar"
  | "exo-surfaces"
  | "black-holes"
  | "neutron-stars"
  | "galaxies"
  | "gravitational-waves"
  | "satellites"
  | "eclipses"
  | "stars"
  | "transits";

/**
 * World groups. Designed so a third group can be added by extending this union +
 * WORLD_GROUPS and tagging new worlds with it — no consumer code changes
 * required. "beyond" is that third group: worlds outside our Solar System.
 */
export type WorldGroupId = "earth" | "solar-system" | "beyond";

export interface WorldGroup {
  id: WorldGroupId;
  /** Short trigger label shown in the nav. */
  label: string;
  /** One-line description of the group, for the overview / menus. */
  blurb: string;
}

export interface World {
  id: WorldTab;
  label: string;
  href: string;
  group: WorldGroupId;
  /** One honest line describing what the view renders. */
  blurb: string;
  /** Per-world accent (hex) for dots, tiles and fallbacks. */
  accent: string;
  /** Extra search terms (aliases, body names) for the command palette. */
  keywords: string[];
  /**
   * Optional shipped texture used as a small thumbnail in the overview.
   * Loaded defensively — cards fall back to an accent tile if it is missing.
   */
  thumb?: string;
  /**
   * For group views whose thumbnail is one representative body (e.g. Planets →
   * Jupiter), the name of that body, so the overview can stay honest about what
   * the image shows. Omitted when the thumbnail is the world itself.
   */
  thumbBody?: string;
}

/** Group order drives section order in the nav, palette and overview. */
export const WORLD_GROUPS: readonly WorldGroup[] = [
  {
    id: "earth",
    label: "Earth",
    blurb: "Our home planet, live and through time.",
  },
  {
    id: "solar-system",
    label: "Solar System",
    blurb: "The other worlds, on real orbits.",
  },
  {
    id: "beyond",
    label: "Beyond",
    blurb: "Real planetary systems around other stars.",
  },
] as const;

/**
 * Every world, in canonical order (grouped). This order is used for the empty
 * command palette, the mobile menu and the overview grid.
 */
export const WORLDS: readonly World[] = [
  // --- Earth ---------------------------------------------------------------
  {
    id: "earth",
    label: "Earth",
    href: "/",
    group: "earth",
    blurb: "Live NASA imagery with a physically computed day and night terminator.",
    accent: "#4aa3ff",
    keywords: ["earth", "home", "blue marble", "terminator", "satellite", "gibs", "clouds", "weather", "forecast"],
    thumb: "/textures/earth-day-blue-marble.jpg",
  },
  {
    id: "tonight",
    label: "Tonight",
    href: "/tonight",
    group: "earth",
    blurb:
      "What you can actually see from your own location tonight: when it gets dark, whether the Moon is in the way, and what is up.",
    accent: "#7c9cff",
    thumb: "/textures/night-sky/milkyway.jpg",
    thumbBody: "the Milky Way",
    keywords: [
      "tonight",
      "what can i see tonight",
      "stargazing",
      "observing",
      "dark sky",
      "darkness",
      "sunset",
      "sunrise",
      "twilight",
      "astronomical twilight",
      "moonrise",
      "moonset",
      "moon phase",
      "visible planets",
      "planets tonight",
      "iss pass",
      "my location",
      "observing planner",
      "midnight sun",
      "polar night",
    ],
  },
  {
    id: "air",
    label: "Air",
    href: "/air",
    group: "earth",
    blurb:
      "What you are breathing, scored by two countries that disagree, with the pollutant responsible named.",
    accent: "#8fd0e8",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "air",
      "air quality",
      "aqi",
      "pollution",
      "pm2.5",
      "pm25",
      "pm10",
      "particulate",
      "smoke",
      "wildfire smoke",
      "ozone",
      "smog",
      "nitrogen dioxide",
      "no2",
      "sulphur dioxide",
      "breathing",
      "asthma",
      "who guideline",
      "epa",
      "cams",
      "copernicus",
    ],
  },
  {
    id: "climate",
    label: "Climate",
    href: "/climate",
    group: "earth",
    blurb:
      "The instrumental record from two independent analyses, and the difference between a headline number and a trend.",
    accent: "#ff9b7a",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "climate",
      "climate change",
      "global warming",
      "temperature record",
      "anomaly",
      "warming stripes",
      "baseline",
      "gistemp",
      "hadcrut",
      "hadcrut5",
      "ipcc",
      "pre-industrial",
      "1.5 degrees",
      "trend",
      "warmest year",
      "instrumental record",
      "nasa giss",
      "met office",
    ],
  },
  {
    id: "carbon",
    label: "Carbon",
    href: "/carbon",
    group: "earth",
    blurb:
      "The Keeling curve since March 1958, and the annual wobble on it that is northern vegetation growing and rotting.",
    accent: "#ffc46b",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "carbon",
      "carbon dioxide",
      "co2",
      "keeling curve",
      "mauna loa",
      "ppm",
      "methane",
      "ch4",
      "greenhouse gas",
      "greenhouse gases",
      "seasonal cycle",
      "biosphere",
      "photosynthesis",
      "growth rate",
      "global warming potential",
      "gwp",
      "pre-industrial",
      "keeling",
      "noaa gml",
      "scripps",
    ],
  },
  {
    id: "magnetic",
    label: "Magnetic",
    href: "/magnetic",
    group: "earth",
    blurb:
      "Your compass does not point north. The whole field, the three poles and a century of drift, computed from 195 numbers.",
    accent: "#ff7a7a",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "magnetic",
      "magnetic field",
      "geomagnetic",
      "compass",
      "declination",
      "magnetic north",
      "true north",
      "inclination",
      "dip",
      "igrf",
      "magnetic pole",
      "north magnetic pole",
      "dip pole",
      "pole reversal",
      "south atlantic anomaly",
      "dipole",
      "nanotesla",
      "navigation",
      "agonic line",
      "core",
    ],
  },
  {
    id: "quakes",
    label: "Seismic Earth",
    href: "/earthquakes",
    group: "earth",
    blurb:
      "Every earthquake the USGS has located this week, live, with the energy and the Gutenberg-Richter law computed from the catalogue.",
    accent: "#ff8b5e",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "earthquake",
      "earthquakes",
      "seismic",
      "seismology",
      "quake",
      "magnitude",
      "richter",
      "gutenberg-richter",
      "b-value",
      "epicentre",
      "epicenter",
      "hypocentre",
      "aftershock",
      "fault",
      "tectonic",
      "plate boundary",
      "ring of fire",
      "subduction",
      "usgs",
      "tsunami",
      "moment magnitude",
      "seismic moment",
    ],
  },
  {
    id: "aurora",
    label: "Aurora",
    href: "/aurora",
    group: "earth",
    blurb:
      "NOAA's live auroral oval on the globe, and whether it reaches your geomagnetic latitude tonight.",
    accent: "#5ce6a5",
    thumb: "/textures/earth-night-black-marble.jpg",
    thumbBody: "Earth at night",
    keywords: [
      "aurora",
      "aurora borealis",
      "aurora australis",
      "northern lights",
      "southern lights",
      "geomagnetic",
      "geomagnetic storm",
      "kp",
      "kp index",
      "magnetosphere",
      "ovation",
      "g scale",
      "substorm",
      "bz",
    ],
  },
  {
    id: "tides",
    label: "Tides",
    href: "/tides",
    group: "earth",
    blurb:
      "Newton's equilibrium tide computed from the real Moon and Sun, plotted against a live tide gauge to show how wrong a correct theory can be.",
    accent: "#4fc3f7",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "tide",
      "tides",
      "tidal",
      "high tide",
      "low tide",
      "spring tide",
      "neap tide",
      "tide gauge",
      "sea level",
      "ocean",
      "equilibrium tide",
      "tidal range",
      "bay of fundy",
      "amphidromic",
      "m2",
      "lunar day",
      "noaa",
      "water level",
    ],
  },
  {
    id: "living",
    label: "Living Earth",
    href: "/living-earth",
    group: "earth",
    blurb: "City lights and simulated human activity across the night side.",
    accent: "#3ecf8e",
    keywords: ["living earth", "city", "cities", "lights", "night", "black marble", "population", "activity"],
    thumb: "/textures/earth-night-black-marble.jpg",
  },
  {
    id: "virtual",
    label: "Virtual Earth",
    href: "/virtual-earth",
    group: "earth",
    blurb: "Earth replayed through deep time, under a slowly precessing night sky.",
    accent: "#b98bff",
    keywords: ["virtual earth", "time machine", "chrono", "history", "precession", "deep time", "paleo", "past", "era"],
    thumb: "/textures/earth-day-blue-marble.jpg",
  },
  {
    id: "iss",
    label: "ISS Tracker",
    href: "/iss",
    group: "earth",
    blurb:
      "The real ISS propagated live by SGP4 from a current orbital element set, with its ground track and your visible passes.",
    accent: "#c0d0e8",
    keywords: [
      "iss",
      "space station",
      "satellite",
      "orbit",
      "tle",
      "sgp4",
      "spot the station",
      "tiangong",
      "hubble",
      "pass",
    ],
    thumb: "/textures/earth-day-blue-marble.jpg",
  },
  {
    id: "satellites",
    label: "Satellites & Debris",
    href: "/satellites",
    group: "earth",
    blurb:
      "The real tracked catalogue overhead: working constellations and three fragmentation debris clouds, propagated live with SGP4.",
    accent: "#7dffc0",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "satellites",
      "satellite",
      "debris",
      "orbital debris",
      "starlink",
      "oneweb",
      "megaconstellation",
      "gps",
      "geostationary",
      "geo belt",
      "leo",
      "meo",
      "kessler",
      "sgp4",
      "tle",
      "celestrak",
      "conjunction",
      "fengyun",
      "iridium 33",
      "cosmos 1408",
      "asat",
      "congestion",
    ],
  },
  {
    id: "eclipses",
    label: "Eclipses",
    href: "/eclipses",
    group: "earth",
    blurb:
      "Every solar and lunar eclipse of this century from NASA's published canon, with saros series and the greatest-eclipse point.",
    accent: "#ffb86b",
    thumb: "/textures/earth-day-blue-marble.jpg",
    thumbBody: "Earth",
    keywords: [
      "eclipse",
      "eclipses",
      "solar eclipse",
      "lunar eclipse",
      "totality",
      "total eclipse",
      "annular",
      "hybrid eclipse",
      "penumbral",
      "umbra",
      "saros",
      "gamma",
      "greatest eclipse",
      "blood moon",
      "corona",
      "espenak",
      "canon",
      "syzygy",
    ],
  },
  // --- Solar System --------------------------------------------------------
  {
    id: "mars",
    label: "Mars",
    href: "/mars",
    group: "solar-system",
    blurb: "Real Mars orbital time from Mars24, plus seasonal climatology.",
    accent: "#e06246",
    keywords: ["mars", "red planet", "mars24", "sol", "ls", "climatology", "dust", "viking"],
    thumb: "/textures/mars-mola-colorized.jpg",
  },
  {
    id: "surfaces",
    label: "Surfaces",
    href: "/surfaces",
    group: "solar-system",
    blurb:
      "Stand on Mars, on real NASA terrain under a live computed sun, and on Titan's honest cinematic twilight where Saturn fills the sky.",
    accent: "#e8a87c",
    keywords: [
      "surfaces",
      "surface",
      "stand on mars",
      "gale crater",
      "mount sharp",
      "jezero",
      "panorama",
      "curiosity",
      "perseverance",
      "huygens",
      "titan surface",
      "sunset",
      "blue sunset",
      "first person",
    ],
    thumb: "/textures/surfaces/mars-panorama.jpg",
  },
  {
    id: "moon",
    label: "Moon",
    href: "/moon",
    group: "solar-system",
    blurb: "Computed lunar phase and libration over measured surface temperatures.",
    accent: "#c7ccd6",
    keywords: ["moon", "luna", "lunar", "phase", "libration", "diviner", "temperature", "lroc"],
    thumb: "/textures/moon-lroc.jpg",
  },
  {
    id: "solar",
    label: "Planets",
    href: "/solar-system",
    group: "solar-system",
    blurb: "An orrery of all eight planets at their real heliocentric longitudes.",
    accent: "#f2a63b",
    keywords: ["solar system", "planets", "orrery", "orbits", "mercury", "venus", "jupiter", "saturn", "uranus", "neptune", "heliocentric"],
    thumb: "/textures/planets/jupiter.jpg",
    thumbBody: "Jupiter",
  },
  {
    id: "moons",
    label: "Moons",
    href: "/moons",
    group: "solar-system",
    blurb: "Mini-orreries of the giant planets' major moons.",
    accent: "#6fd6c9",
    keywords: ["moons", "satellites", "europa", "io", "ganymede", "callisto", "titan", "enceladus", "triton", "mimas", "iapetus"],
    thumb: "/textures/moons/europa.jpg",
    thumbBody: "Europa",
  },
  {
    id: "jupiter-moons",
    label: "Jupiter's Moons",
    href: "/jupiter-moons",
    group: "solar-system",
    blurb:
      "The four Galilean moons in live positions, with shadow transits, eclipses and occultations computed from Meeus.",
    accent: "#d9a066",
    keywords: [
      "jupiter",
      "galilean",
      "io",
      "europa",
      "ganymede",
      "callisto",
      "shadow transit",
      "transit",
      "eclipse",
      "occultation",
      "jovian",
      "telescope",
      "meeus",
    ],
    thumb: "/textures/planets/jupiter.jpg",
    thumbBody: "Jupiter",
  },
  {
    id: "saturn-moons",
    label: "Saturn's Moons",
    href: "/saturn-moons",
    group: "solar-system",
    blurb:
      "Saturn's major moons strung along the tilted rings, with transits and shadow events that cluster near each ring-plane crossing.",
    accent: "#d8c48f",
    keywords: [
      "saturn",
      "titan",
      "rhea",
      "dione",
      "tethys",
      "enceladus",
      "mimas",
      "iapetus",
      "rings",
      "ring plane",
      "ring tilt",
      "ring opening",
      "shadow transit",
      "occultation",
      "cassini",
      "phesat",
      "saturnian",
      "meeus",
    ],
    thumb: "/textures/planets/saturn.jpg",
    thumbBody: "Saturn",
  },
  {
    id: "other-moons",
    label: "Other Moons",
    href: "/other-moons",
    group: "solar-system",
    blurb:
      "Mars, Uranus and Neptune's moons at real positions: a side-tipped Uranus, retrograde Triton, and Phobos racing around Mars.",
    accent: "#7f9fe0",
    keywords: [
      "other moons",
      "mars moons",
      "phobos",
      "deimos",
      "uranus",
      "miranda",
      "ariel",
      "umbriel",
      "titania",
      "oberon",
      "neptune",
      "triton",
      "proteus",
      "nereid",
      "retrograde",
      "ice giant",
    ],
    thumb: "/textures/planets/uranus.jpg",
    thumbBody: "Uranus",
  },
  {
    id: "dwarf-moons",
    label: "Dwarf Moons",
    href: "/dwarf-moons",
    group: "solar-system",
    blurb:
      "Pluto's true binary with Charon and its four small moons, plus the moons of Eris, Haumea and Makemake.",
    accent: "#c9a98c",
    keywords: [
      "dwarf moons",
      "pluto",
      "charon",
      "styx",
      "nix",
      "kerberos",
      "hydra",
      "eris",
      "dysnomia",
      "haumea",
      "hiiaka",
      "namaka",
      "makemake",
      "mk2",
      "binary",
      "barycenter",
    ],
    thumb: "/textures/dwarf-planets/pluto.jpg",
    thumbBody: "Pluto",
  },
  {
    id: "dwarfs",
    label: "Dwarf Planets",
    href: "/dwarf-planets",
    group: "solar-system",
    blurb: "The IAU dwarf planets on their real, eccentric orbits.",
    accent: "#d59adf",
    keywords: ["dwarf planets", "dwarfs", "pluto", "ceres", "charon", "haumea", "makemake", "eris", "kuiper", "tno"],
    thumb: "/textures/dwarf-planets/pluto.jpg",
    thumbBody: "Pluto",
  },
  {
    id: "small-bodies",
    label: "Comets & Asteroids",
    href: "/small-bodies",
    group: "solar-system",
    blurb:
      "Real comet and near-Earth-asteroid orbits from JPL, with factual close approaches — hazards stated plainly.",
    accent: "#5fd3e6",
    keywords: [
      "comet",
      "asteroid",
      "near-earth",
      "neo",
      "pha",
      "potentially hazardous",
      "small bodies",
      "halley",
      "apophis",
      "bennu",
      "eros",
      "vesta",
      "oumuamua",
      "borisov",
      "interstellar",
      "close approach",
    ],
    thumb: "/textures/small-bodies/eros.jpg",
    thumbBody: "Eros",
  },
  {
    id: "asteroid-moons",
    label: "Asteroid Moons",
    href: "/asteroid-moons",
    group: "solar-system",
    blurb:
      "Real binary and multiple asteroid systems, from the DART-altered Didymos to Ida's Dactyl; comets, honestly, have no moons.",
    accent: "#9ba1a6",
    keywords: [
      "asteroid moons",
      "binary asteroid",
      "didymos",
      "dimorphos",
      "dart",
      "ida",
      "dactyl",
      "sylvia",
      "kleopatra",
      "antiope",
      "kalliope",
      "eugenia",
      "patroclus",
      "triple asteroid",
      "contact binary",
      "comet moons",
    ],
    thumb: "/textures/small-bodies/didymos.jpg",
    thumbBody: "Didymos",
  },
  {
    id: "meteor-showers",
    label: "Meteor Showers",
    href: "/meteor-showers",
    group: "solar-system",
    blurb:
      "Annual meteor showers at their real radiants, activity windows and parent bodies — ZHR is an idealized peak rate; observed rates run lower.",
    accent: "#4fe3b0",
    keywords: [
      "meteor",
      "meteor shower",
      "meteor showers",
      "shooting star",
      "radiant",
      "zhr",
      "fireball",
      "meteoroid",
      "debris stream",
      "perseids",
      "geminids",
      "leonids",
      "quadrantids",
      "orionids",
      "eta aquariids",
      "lyrids",
      "taurids",
      "draconids",
      "ursids",
      "solar longitude",
    ],
  },
  {
    id: "sun",
    label: "Sun",
    href: "/sun",
    group: "solar-system",
    blurb: "The Sun in six wavelengths, with live NOAA space weather.",
    accent: "#ffa41b",
    keywords: [
      "sun",
      "solar",
      "space weather",
      "solar wind",
      "sunspot",
      "flare",
      "kp",
      "corona",
      "solar cycle",
      "sdo",
      "swpc",
      "geomagnetic storm",
      "coronal hole",
      "photosphere",
      "magnetogram",
    ],
    thumb: "/textures/sun/aia171.jpg",
  },
  // --- Beyond ---------------------------------------------------------------
  {
    id: "exoplanets",
    label: "Exoplanets",
    href: "/exoplanets",
    group: "beyond",
    blurb:
      "Real exoplanet systems from the NASA Exoplanet Archive — orbits to scale, computed habitable zones, illustrative worlds.",
    accent: "#8f7dff",
    keywords: [
      "exoplanets",
      "exoplanet",
      "systems",
      "other stars",
      "habitable zone",
      "trappist-1",
      "proxima centauri",
      "kepler",
      "hot jupiter",
      "51 pegasi",
      "hr 8799",
      "nasa exoplanet archive",
      "beyond",
    ],
  },
  {
    id: "stars",
    label: "Stars",
    href: "/stars",
    group: "beyond",
    blurb:
      "How stars live and die: 8,787 real stars on a Hertzsprung-Russell diagram, derived from measured colour and parallax.",
    accent: "#ffe9a8",
    keywords: [
      "stars",
      "star",
      "hr diagram",
      "hertzsprung",
      "russell",
      "main sequence",
      "red giant",
      "supergiant",
      "white dwarf",
      "red dwarf",
      "stellar evolution",
      "spectral type",
      "luminosity",
      "absolute magnitude",
      "colour index",
      "temperature",
      "sirius",
      "betelgeuse",
      "vega",
      "proxima",
      "hyg",
      "hipparcos",
    ],
  },
  {
    id: "transits",
    label: "Transits",
    href: "/transits",
    group: "beyond",
    blurb:
      "How we know those planets are there: the dip in starlight, computed from the measured radii the Exoplanets tab reports.",
    accent: "#8fd3ff",
    thumb: "/textures/planets/jupiter.jpg",
    thumbBody: "Jupiter",
    keywords: [
      "transit",
      "transits",
      "transit method",
      "light curve",
      "transit depth",
      "ingress",
      "egress",
      "kepler",
      "tess",
      "photometry",
      "radius ratio",
      "hd 209458",
      "trappist-1",
      "hot jupiter",
      "limb darkening",
      "detection",
    ],
  },
  {
    id: "night-sky",
    label: "Night Sky",
    href: "/night-sky",
    group: "beyond",
    blurb:
      "A star map of ~9,000 real measured stars on the celestial sphere, with constellation figures marked as a cultural overlay and a sky-from-your-location mode.",
    accent: "#8aa0ff",
    keywords: [
      "star",
      "stars",
      "star map",
      "starmap",
      "night sky",
      "planetarium",
      "constellation",
      "constellations",
      "milky way",
      "messier",
      "deep sky",
      "celestial sphere",
      "sidereal",
      "sirius",
      "vega",
      "orion",
      "big dipper",
      "hipparcos",
      "hyg",
      "hygdb",
      "nebula",
      "galaxy",
      "cluster",
      "beyond",
    ],
  },
  {
    id: "interstellar",
    label: "Interstellar",
    href: "/interstellar",
    group: "beyond",
    blurb:
      "The three interstellar visitors on their real hyperbolic paths, plus a live swarm-robotics defense simulation; a movie-inspired homage with original assets.",
    accent: "#7ad7ff",
    keywords: [
      "interstellar",
      "oumuamua",
      "borisov",
      "atlas",
      "3i atlas",
      "interstellar object",
      "hyperbolic",
      "swarm",
      "swarm robotics",
      "boids",
      "planetary defense",
      "visitor",
      "robot",
    ],
  },
  {
    id: "exo-surfaces",
    label: "Exoplanet Surfaces",
    href: "/exo-surfaces",
    group: "beyond",
    blurb:
      "Stand under alien skies computed from real data: TRAPPIST-1's giant red sun and moon-sized sibling worlds; the ground is imagined, the sky is real.",
    accent: "#e0a25e",
    keywords: [
      "exoplanet surface",
      "exoplanet surfaces",
      "alien sky",
      "alien world",
      "trappist-1e",
      "proxima b",
      "toi-700",
      "red dwarf sky",
      "another planet",
      "stand on exoplanet",
    ],
  },
  {
    id: "black-holes",
    label: "Black Holes",
    href: "/black-holes",
    group: "beyond",
    blurb:
      "Real black holes to scale with a physically-based gravitational-lensing view: the EHT's Sgr A* and M87*, warped starlight, time dilation you can dial, and the honest physics of the horizon.",
    accent: "#b060ff",
    thumb: "/textures/black-holes/m87-eht.jpg",
    keywords: [
      "black hole",
      "black holes",
      "gravitational lensing",
      "event horizon",
      "schwarzschild",
      "sagittarius a",
      "m87",
      "eht",
      "event horizon telescope",
      "time dilation",
      "spaghettification",
      "accretion disk",
      "photon ring",
      "gargantua",
      "hawking",
      "beyond",
    ],
  },
  {
    id: "neutron-stars",
    label: "Neutron Stars",
    href: "/neutron-stars",
    group: "beyond",
    blurb:
      "City-sized stars spinning up to 716 times a second: real pulsars you can see sweep and hear tick at their true rate, from the Crab to a magnetar, with the physics of nuclear-density matter.",
    accent: "#5ad2e6",
    thumb: "/textures/neutron-stars/crab-nebula.jpg",
    keywords: [
      "neutron star",
      "neutron stars",
      "pulsar",
      "pulsars",
      "magnetar",
      "millisecond pulsar",
      "crab pulsar",
      "vela",
      "lighthouse",
      "spin",
      "joy division",
      "nuclear density",
      "bell burnell",
      "atnf",
      "beyond",
    ],
  },
  {
    id: "galaxies",
    label: "Galaxies",
    href: "/galaxies",
    group: "beyond",
    blurb:
      "From Andromeda to the real cosmic web: 18,000 SDSS galaxies mapped in 3D, the Hubble classification, and a zoom from Earth to the observable universe.",
    accent: "#ffd27a",
    thumb: "/textures/galaxies/andromeda.jpg",
    keywords: [
      "galaxy",
      "galaxies",
      "cosmic web",
      "andromeda",
      "m31",
      "whirlpool",
      "sombrero",
      "local group",
      "supercluster",
      "laniakea",
      "hubble",
      "redshift",
      "sdss",
      "deep field",
      "large-scale structure",
      "hubble tension",
      "beyond",
    ],
  },
  {
    id: "gravitational-waves",
    label: "Gravitational Waves",
    href: "/gravitational-waves",
    group: "beyond",
    blurb:
      "282 real LIGO, Virgo and KAGRA detections. The masses and distances are published; the chirp you see and hear is computed from them.",
    accent: "#8fd3ff",
    keywords: [
      "gravitational waves",
      "ligo",
      "virgo",
      "kagra",
      "gw150914",
      "gw170817",
      "merger",
      "chirp",
      "chirp mass",
      "ringdown",
      "strain",
      "inspiral",
      "binary black hole",
      "neutron star merger",
      "kilonova",
      "gwosc",
      "gwtc",
      "spacetime",
      "interferometer",
      "beyond",
    ],
  },
] as const;

// --- lookups ---------------------------------------------------------------

export function getWorld(id: WorldTab): World | undefined {
  return WORLDS.find((w) => w.id === id);
}

export function getGroup(groupId: WorldGroupId): WorldGroup | undefined {
  return WORLD_GROUPS.find((g) => g.id === groupId);
}

export function getWorldsInGroup(groupId: WorldGroupId): World[] {
  return WORLDS.filter((w) => w.group === groupId);
}

export function getGroupForWorld(id: WorldTab): WorldGroupId | undefined {
  return getWorld(id)?.group;
}

/** All groups paired with their worlds, in canonical order. */
export function groupedWorlds(): Array<{ group: WorldGroup; worlds: World[] }> {
  return WORLD_GROUPS.map((group) => ({
    group,
    worlds: getWorldsInGroup(group.id),
  }));
}

/**
 * Adjacent worlds in canonical (flattened) order, for prev/next step-through
 * navigation. Wraps around both ends so it is never null for a valid world.
 * Returns null for an unknown id (null-safety contract).
 */
export function adjacentWorlds(
  id: WorldTab,
): { prev: World; next: World } | null {
  const i = WORLDS.findIndex((w) => w.id === id);
  if (i < 0) return null;
  const n = WORLDS.length;
  return {
    prev: WORLDS[(i - 1 + n) % n],
    next: WORLDS[(i + 1) % n],
  };
}

// --- fuzzy search (command palette) ----------------------------------------

/**
 * Lightweight, dependency-free fuzzy score of `query` against a single
 * `target` string. Higher is better; 0 means no match. Deterministic and pure
 * so it can be unit-tested in isolation.
 *
 * Ranking, best to worst: exact > prefix > substring > subsequence. Shorter and
 * earlier matches rank above longer / later ones.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return 0;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 800 - t.length;
  const idx = t.indexOf(q);
  if (idx !== -1) return 500 - idx;
  // subsequence: every query char appears in order somewhere in the target
  let ti = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const next = t.indexOf(q[qi], ti);
    if (next === -1) return 0;
    ti = next + 1;
  }
  return Math.max(1, 100 - ti);
}

/**
 * Score a world against a query. The query is split into whitespace tokens with
 * AND semantics: every token must match at least one of the world's targets
 * (label, slug or a keyword) or the whole world scores 0. This lets multi-word
 * queries like "city lights", "time machine" or "red planet" find the right
 * world even when the words live in different keywords. The label is weighted
 * slightly above keywords.
 */
export function worldScore(query: string, world: World): number {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const slug = world.href.replace(/[/-]+/g, " ").trim();
  const targets = [world.label, slug, ...world.keywords].filter(Boolean);
  let total = 0;
  for (const token of tokens) {
    let best = 0;
    for (const target of targets) {
      const weight = target === world.label ? 1.2 : 1;
      best = Math.max(best, fuzzyScore(token, target) * weight);
    }
    if (best === 0) return 0; // AND: an unmatched token disqualifies the world
    total += best;
  }
  return total;
}

/**
 * Search all worlds. Empty query returns every world in canonical order;
 * otherwise returns matches sorted by score (stable on ties by canonical
 * order).
 */
export function searchWorlds(query: string): World[] {
  const q = query.trim();
  if (q.length === 0) return [...WORLDS];
  return WORLDS.map((w, i) => ({ w, i, s: worldScore(q, w) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.w);
}

/** Group an already-ordered list of worlds for sectioned display. */
export function groupSearchResults(
  worlds: World[],
): Array<{ group: WorldGroup; worlds: World[] }> {
  return WORLD_GROUPS.map((group) => ({
    group,
    worlds: worlds.filter((w) => w.group === group.id),
  })).filter((g) => g.worlds.length > 0);
}
