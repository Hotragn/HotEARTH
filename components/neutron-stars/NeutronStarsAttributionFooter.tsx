"use client";

import { DOCS_BASE } from "./neutronStarsUi";

/**
 * Data-credit footer for the Neutron Stars tab. Credits the ATNF Pulsar
 * Catalogue and discovery papers, the ESA/Hubble Crab (CC BY 4.0) and NASA/CXC
 * Vela (public domain) images, states the lighthouse honesty (real model,
 * illustrative beam/surface, real pulse timing, visual spin scaled) and the
 * synthesized-audio note, and links to both docs. Shown on lg+ (the About panel
 * guarantees the same information is reachable on any screen).
 */
export default function NeutronStarsAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[860px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Periods, masses, distances and magnetic fields are cited measurements
        (ATNF Pulsar Catalogue, Manchester et al. 2005, and the discovery papers);
        every derived quantity is computed by lib/neutron-stars, with a canonical
        1.4 Msun / 12 km model flagged where mass and radius are not both measured.
        The rotating-star and sweeping-beam view is an illustrative depiction of
        the real lighthouse model: the pulse timing is real, the mesh spin is
        visually slowed for clarity, and the beam and surface are illustrative. The
        pulse audio is synthesized in-browser at the real spin frequency, not a
        telescope recording.
        <br />
        <span className="text-faint/80">
          ATNF Pulsar Catalogue · ESA/Hubble Crab Nebula (CC BY 4.0) · NASA/CXC
          Chandra Vela (public domain) ·{" "}
          <a
            href={`${DOCS_BASE}/NEUTRON_STARS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/NEUTRON_STARS_PHYSICS.md`}
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
