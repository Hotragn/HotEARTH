"use client";

import { DOCS_BASE } from "./galaxiesUi";

/**
 * Data-credit footer for the Galaxies tab. Credits the SDSS DR17 redshift
 * catalog (with the Abdurro'uf 2022 citation and the SDSS acknowledgment), the
 * ESA/Hubble and ESA/Webb images (CC BY 4.0), and NED/SIMBAD for the catalog
 * distances; states the redshift-space / fingers-of-god and Hubble-tension
 * honesty; and links to both docs. Shown on lg+ (the About panel guarantees the
 * same information is reachable on any screen).
 */
export default function GalaxiesAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[900px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        The cosmic web is 18,000 real SDSS DR17 galaxies (Abdurro&apos;uf et al.
        2022, ApJS 259, 35), measured RA/Dec/redshift, mapped to 3D by
        lib/galaxies at the adopted H0 = 70 km/s/Mpc. The radial axis is
        redshift-space (cz/H0): fingers-of-god cluster elongation is real, and the
        depth scale moves with the unresolved Hubble tension (Planck 67.4 vs SH0ES
        73). Named-galaxy distances and types are published NED/SIMBAD ladder
        values with real method-dependent uncertainty.
        <br />
        <span className="text-faint/80">
          SDSS DR17 (SkyServer) · ESA/Hubble &amp; ESA/Webb images (CC BY 4.0) ·
          NED / SIMBAD ·{" "}
          <a
            href={`${DOCS_BASE}/GALAXIES_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/GALAXIES_PHYSICS.md`}
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
