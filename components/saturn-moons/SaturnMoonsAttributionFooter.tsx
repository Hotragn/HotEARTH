"use client";

/**
 * Saturn's Moons data-credit footer (mirrors JupiterMoonsAttributionFooter).
 * States the computed / reused split, the CC-BY obligation for the Solar System
 * Scope Saturn + ring textures (a license condition, not a courtesy), the
 * public-domain Cassini moon maps with the Titan near-IR caveat, the accuracy +
 * seasonality honesty, and links the two docs.
 */
const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function SaturnMoonsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 clears-time-control mx-auto hidden w-fit max-w-[620px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: moon positions from{" "}
        <span className="text-faint/90">JPL SSD SAT441 mean elements</span> (Kepler
        + Saturn IAU pole), ring tilt from{" "}
        <span className="text-faint/90">Meeus, Astronomical Algorithms Ch. 45</span>
        {" · "}
        Textures: Saturn &amp; rings by{" "}
        <span className="text-faint/90">Solar System Scope, CC BY 4.0</span>{" "}
        (required credit); seven moon maps NASA/JPL/USGS/SSI Cassini (public
        domain; Titan is near-IR/haze)
        <br />
        <span className="text-faint/80">
          Constants: NASA/GSFC fact sheets · events cluster near each ring-plane
          crossing (last 2025-05-06, next ~2038-2039); positions good to a fraction
          of a Saturn radius near 2000, degrading with time, Iapetus least
          accurate, cross-check{" "}
          <a
            href="https://ssd.jpl.nasa.gov/horizons/"
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            JPL Horizons
          </a>{" "}
          / IMCCE PHESAT ·{" "}
          <a
            href={`${DOCS_BASE}/SATURN_MOONS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/SATURN_MOONS_PHYSICS.md`}
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
