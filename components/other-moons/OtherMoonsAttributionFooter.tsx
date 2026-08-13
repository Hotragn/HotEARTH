"use client";

/**
 * Other Moons data-credit footer (mirrors SaturnMoonsAttributionFooter). States
 * the computed / reused split, the CC-BY obligation for the Solar System Scope
 * Uranus + Neptune textures (a license condition, not a courtesy), the
 * public-domain Mars MOLA (color = elevation), Triton (synthetic north) and the
 * seven new Viking/Voyager moon maps (Phobos/Deimos irregular; the five Uranian
 * maps southern-hemisphere), the illustrative Proteus/Nereid spheres, the
 * config-view + accuracy honesty, and links the two docs.
 */
const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function OtherMoonsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[660px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: moon positions from{" "}
        <span className="text-faint/90">JPL SSD mean orbital elements</span> (Mars
        MAR099, Uranus &amp; Neptune sets; Kepler + IAU WGCCRE poles), planet
        directions from JPL approximate positions
        {" · "}
        Textures: Uranus &amp; Neptune by{" "}
        <span className="text-faint/90">Solar System Scope, CC BY 4.0</span>{" "}
        (required credit; stylized, unlit); Mars MOLA (NASA/USGS, PD, color =
        elevation); Triton + seven Viking/Voyager moon maps NASA/JPL-Caltech/USGS
        (public domain; Phobos/Deimos irregular bodies, the five Uranian maps
        southern-hemisphere with northern gaps, Triton northern hemisphere
        synthetic); Proteus &amp; Nereid illustrative tinted spheres
        <br />
        <span className="text-faint/80">
          Constants: NASA/GSFC fact sheets · a live configuration view, not an
          events clock (disks are tiny from Earth: Mars ~4-25″, Uranus ~3.7″,
          Neptune ~2.3″, so transits/shadows are rare); positions good near epoch,
          degrading with time, Triton and Nereid least accurate, cross-check{" "}
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
            href={`${DOCS_BASE}/OTHER_MOONS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/OTHER_MOONS_PHYSICS.md`}
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
