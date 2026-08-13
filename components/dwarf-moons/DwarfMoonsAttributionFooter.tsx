"use client";

/**
 * Dwarf Moons data-credit footer (mirrors OtherMoonsAttributionFooter). States
 * the computed / reused / illustrative split, the per-system citations, the
 * two-tier honesty (Pluto real positions vs Eris/Haumea/Makemake orbit-real /
 * position-illustrative, MK2 additionally poorly constrained), the config-view
 * honesty (unresolvable from Earth, not an events tab), the two public-domain
 * New Horizons maps, and links the two docs.
 */
const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function DwarfMoonsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[680px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: moon configurations by Kepler propagation of published mean
        elements. Pluto system{" "}
        <span className="text-faint/90">
          Brozovic &amp; Jacobson (2024), real positions
        </span>
        ; Eris (Dysnomia){" "}
        <span className="text-faint/90">Holler et al. (2021)</span>; Haumea (Hiʻiaka,
        Namaka) <span className="text-faint/90">Ragozzine &amp; Brown (2009)</span>,
        ring &amp; shape <span className="text-faint/90">Ortiz et al. (2017)</span>;
        Makemake (MK2) <span className="text-faint/90">Parker et al. (2016)</span>.
        Parent sky positions from lib/dwarf-planets (JPL SBDB mean elements), real
        for all four
        {" · "}
        Textures: Pluto &amp; Charon are public-domain New Horizons maps
        (NASA/JHUAPL/SwRI); every other body is a labeled illustrative tinted sphere
        (Haumea's triaxial shape and ring are illustrative geometry from measured
        dimensions)
        <br />
        <span className="text-faint/80">
          Two tiers, never blurred: Pluto = real along-orbit positions;
          Eris/Haumea/Makemake = real orbit, illustrative phase; Makemake's MK2
          additionally poorly constrained. A configuration view, not an events tab:
          these systems are unresolvable from Earth (Pluto's disk ~0.1 arcsec), so
          nothing here is an observable transit or shadow. Cross-check{" "}
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
            href={`${DOCS_BASE}/DWARF_MOONS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/DWARF_MOONS_PHYSICS.md`}
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
