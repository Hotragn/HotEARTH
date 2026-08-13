"use client";

import { DOCS_BASE } from "./blackHolesUi";

/**
 * Data-credit footer for the Black Holes tab. Credits the EHT (CC BY 4.0),
 * GRAVITY, LIGO/Virgo and Gaia catalog measurements, the ESO Milky Way panorama
 * the render bends, states the lensing-render honesty (real bending, illustrative
 * disk, non-spinning Schwarzschild) and links to both docs. Shown on lg+ (the
 * About panel guarantees the same information is reachable on any screen).
 */
export default function BlackHolesAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[820px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Catalog masses, distances and shadow sizes are cited measurements
        (GRAVITY 2023, EHT 2019 and 2022, Miller-Jones et al. 2021, El-Badry et
        al. 2023, Abbott et al. 2016); every general-relativity quantity is
        computed by lib/black-holes. The centrepiece is a physically-based lensing
        render (real light-bending, illustrative accretion disk, non-spinning
        Schwarzschild), not a photograph; the EHT images are radio reconstructions
        from 2017 data, not optical photos.
        <br />
        <span className="text-faint/80">
          EHT Collaboration (CC BY 4.0) · ESO/S. Brunier Milky Way panorama (CC BY
          4.0) · NASA/GRAVITY/LIGO/Gaia ·{" "}
          <a
            href={`${DOCS_BASE}/BLACK_HOLES_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/BLACK_HOLES_PHYSICS.md`}
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
