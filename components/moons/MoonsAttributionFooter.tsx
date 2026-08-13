"use client";

import type { MoonName } from "@/lib/moons";
import { TEXTURE_CAVEAT } from "@/lib/moon-facts";

/**
 * Major-moons attribution footer (mirrors SolarAttributionFooter /
 * MoonAttributionFooter). ALL moon maps this phase are public domain
 * (NASA / JPL / USGS) — no CC-BY obligation — so we credit them as a courtesy.
 * Specific map credits: Triton mosaic by P. Schenk (LPI); Mimas by
 * NASA/JPL-Caltech/SSI. Orbital + physical constants are JPL SSD satellite
 * parameters. Per-moon texture caveats (Titan near-IR, Triton synthetic north)
 * are echoed here when relevant. Full attribution also lives in the About panel.
 */
export default function MoonsAttributionFooter({
  focus,
  usingFallbackTexture = false,
}: {
  /** current detail moon, or null in the overview */
  focus: MoonName | null;
  usingFallbackTexture?: boolean;
}) {
  const caveat = focus ? TEXTURE_CAVEAT[focus] : undefined;
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[320px] animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        <a
          href="https://ssd.jpl.nasa.gov/sats/elem/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Orbits &amp; constants: JPL SSD
        </a>
        <br />
        <span>Moon maps: NASA / JPL / USGS (public domain)</span>
        {focus === "Triton" && (
          <>
            <br />
            <span className="text-faint/80">Triton mosaic: P. Schenk (LPI)</span>
          </>
        )}
        {focus === "Mimas" && (
          <>
            <br />
            <span className="text-faint/80">Mimas: NASA/JPL-Caltech/SSI</span>
          </>
        )}
        {caveat && (
          <>
            <br />
            <span className="text-faint/80">{caveat.label}</span>
          </>
        )}
        {usingFallbackTexture && (
          <>
            <br />
            <span className="text-faint/80">
              surface shown procedurally · texture unavailable
            </span>
          </>
        )}
      </p>
    </footer>
  );
}
