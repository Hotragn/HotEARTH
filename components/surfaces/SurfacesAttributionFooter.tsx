"use client";

/**
 * Surfaces data-credit footer (mirrors AsteroidMoonsAttributionFooter). Carries
 * every mandatory label from docs/SURFACES_DATA_SOURCES.md: live simulation not
 * a camera; the Mars real tier vs Titan illustrative-terrain split; the
 * Saturn-below-the-horizon truth at the Huygens site; the adopted Titan clock;
 * sky palettes as artistic renderings of real cited phenomena; and all four
 * asset credits (MOLA DEM, PIA25407, the verbatim PIA07232 joint credit,
 * PIA19400), with links to both docs.
 */
const DOCS_BASE = "https://github.com/Hotragn/H.O.T-EARTH/blob/main/docs";

export default function SurfacesAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[760px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Live means live simulation (computed sun, clock, sol, season), not a
        camera; no streaming camera exists on any planetary surface. Mars is the
        real tier: terrain{" "}
        <span className="text-faint/90">
          NASA/JPL/GSFC (MOLA Science Team); PDS Geosciences Node
        </span>{" "}
        (public domain, real meter scaling, 463 m/px); panorama{" "}
        <span className="text-faint/90">NASA/JPL-Caltech/MSSS, PIA25407, sol 3509</span>{" "}
        (colors white-balanced by NASA); sunset basis{" "}
        <span className="text-faint/90">
          PIA19400, NASA/JPL-Caltech/MSSS/Texas A&amp;M Univ.
        </span>
        ; clock and sun NASA GISS Mars24 (Allison &amp; McEwen 2000)
        {" · "}
        Titan is the honest-cinematic tier: real Cassini-Huygens facts and one
        real photo,{" "}
        <span className="text-faint/90">
          PIA07232, credit NASA/JPL/ESA/University of Arizona
        </span>
        , inside illustrative terrain (no human-scale Titan imagery exists)
        <br />
        <span className="text-faint/80">
          Sky palettes are artistic renderings of real cited phenomena (the blue
          Mars sunset: Curiosity sol 956), not measured spectra. Saturn is fixed
          in Titan&apos;s sky by tidal locking and is below the horizon at the
          real Huygens site (about -74 deg); it is drawn only from the labeled
          Sub-Saturn viewpoint, at its real ~5.65 deg apparent size, and the haze
          would blur it in reality. Titan&apos;s clock rate is real (~15.95 Earth
          days); its phase epoch is an adopted, labeled convention. Saturn
          texture: Solar System Scope, CC BY 4.0.{" "}
          <a
            href={`${DOCS_BASE}/SURFACES_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/SURFACES_PHYSICS.md`}
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
