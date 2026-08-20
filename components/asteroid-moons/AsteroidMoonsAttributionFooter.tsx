"use client";

/**
 * Asteroid Moons data-credit footer (mirrors DwarfMoonsAttributionFooter). States
 * the computed / reused / illustrative split, the per-system primary-paper
 * citations, the DART highlight, the comet-no-moons honesty, the schematic-view
 * caveat, the three reused textures (Didymos and Ida public domain, 67P the required
 * ESA/Rosetta/NAVCAM CC BY-SA 3.0 IGO credit), and links the two docs.
 */
const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function AsteroidMoonsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 clears-time-control mx-auto hidden w-fit max-w-[720px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: schematic mutual-orbit geometry from cited primary papers. Didymos
        + Dimorphos and the DART period step change{" "}
        <span className="text-faint/90">
          Thomas et al. (2023); Daly et al. (2023)
        </span>
        ; Ida + Dactyl <span className="text-faint/90">Belton et al. (1996)</span>;
        Sylvia, Kleopatra, Eugenia{" "}
        <span className="text-faint/90">Marchis et al.</span>; Antiope{" "}
        <span className="text-faint/90">Descamps et al.</span>; Kalliope{" "}
        <span className="text-faint/90">Merline / Margot &amp; Brown</span>; Patroclus
        + Menoetius <span className="text-faint/90">Marchis et al. / NASA Lucy (2033)</span>.
        Compiled cross-index: Johnston&apos;s Archive (primary papers are the sources
        of record)
        {" · "}
        Textures: Didymos (NASA / JHU-APL, DART) and Ida (NASA / JPL, Galileo) are
        public-domain single-view photos shown flat; comet 67P is{" "}
        <span className="text-faint/90">ESA/Rosetta/NAVCAM, CC BY-SA 3.0 IGO</span>{" "}
        (comet note only); every moon and un-mapped primary (Kleopatra&apos;s dog-bone
        included) is a labeled illustrative shape
        <br />
        <span className="text-faint/80">
          Comets have no moons: zero confirmed comet satellites; 67P and Arrokoth are
          contact binaries (one body, not a moon), and this tab invents none. A
          schematic mutual-orbit view, not an ephemeris: sizes, separations and
          periods are real and to scale, while orbit orientation and along-orbit phase
          are an adopted convention (Dactyl additionally poorly constrained). These
          systems are unresolvable from Earth, so there is no plane-of-sky and no
          visibility claim.{" "}
          <a
            href={`${DOCS_BASE}/ASTEROID_MOONS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/ASTEROID_MOONS_PHYSICS.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            physics
          </a>
        </span>
      </p>
    </footer>
  );
}
