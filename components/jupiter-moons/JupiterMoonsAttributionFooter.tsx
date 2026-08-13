"use client";

/**
 * Jupiter's Moons data-credit footer (mirrors IssAttributionFooter). States the
 * computed / reused split and the accuracy bound honestly, cites the method
 * (Meeus Ch. 44), the reused public-domain textures, and links the two docs.
 */
const DOCS_BASE =
  "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function JupiterMoonsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[560px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: positions &amp; events from{" "}
        <span className="text-faint/90">
          Meeus, Astronomical Algorithms (2nd ed.), Ch. 44
        </span>{" "}
        (Lieske E5 / Sampson theory)
        {" · "}
        Imagery: NASA/JPL/SSI Jupiter map, USGS Galilean moon maps (public domain)
        <br />
        <span className="text-faint/80">
          Constants: NASA/GSFC fact sheets · times good to a few minutes (worse
          near quadrature), cross-check{" "}
          <a
            href="https://ssd.jpl.nasa.gov/horizons/"
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            JPL Horizons
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/JUPITER_MOONS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/JUPITER_MOONS_PHYSICS.md`}
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
