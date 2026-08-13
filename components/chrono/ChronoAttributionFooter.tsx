"use client";

/**
 * Virtual Earth data credit footer (mirrors the Earth/Mars attribution
 * footers). Honest provenance for the time-machine layer:
 *   Cities over time: Reba, Reitsma & Seto (2016), CC-BY 4.0 — real, shipped
 *   World population: Our World in Data "Population" (HYDE/Gapminder/UN), CC-BY 4.0 — real, shipped
 *   Climate: NASA GISTEMP (temperature) + Law Dome ice core / Mauna Loa (CO2), public domain — real, shipped
 *   Dated events: curated from the historical record (facts from Wikidata, CC0) — real, shipped
 *   Precession: computed from first principles (IAU 2006), lib/precession.ts
 *   Base texture: NASA Blue Marble (shared Earth pipeline)
 */
export default function ChronoAttributionFooter({
  usingFallbackData = false,
}: {
  usingFallbackData?: boolean;
}) {
  return (
    <footer className="pointer-events-none absolute bottom-24 right-5 hidden animate-hud-in md:block lg:bottom-5">
      <p className="text-right font-mono text-[10px] tracking-wide text-faint">
        <a
          href="https://doi.org/10.1038/sdata.2016.34"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Cities: Reba et al. 2016 (CC-BY)
        </a>
        {" · "}
        <a
          href="https://ourworldindata.org/population-growth"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Population: Our World in Data (CC-BY)
        </a>
        {" · "}
        <a
          href="https://data.giss.nasa.gov/gistemp/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Climate: NASA GISTEMP + Law Dome/Mauna Loa
        </a>
        {" · "}
        <a
          href="https://www.wikidata.org/wiki/Wikidata:Licensing"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Events: curated from the historical record (Wikidata, CC0)
        </a>
        {" · "}
        <a
          href="https://en.wikipedia.org/wiki/Axial_precession"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Sky: precession (IAU 2006)
        </a>
        {usingFallbackData && (
          <>
            <br />
            <span className="text-faint/80">
              some layers are showing built-in fallback estimates (data file
              unavailable)
            </span>
          </>
        )}
      </p>
    </footer>
  );
}
