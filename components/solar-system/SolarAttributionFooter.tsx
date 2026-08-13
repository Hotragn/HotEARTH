"use client";

import type { DetailPlanetName } from "@/lib/planet-facts";

/**
 * Solar System attribution footer (mirrors MarsAttributionFooter).
 *
 * LICENSE OBLIGATION: the Saturn, Uranus, Neptune and Saturn-ring textures are
 * CC BY 4.0 by Solar System Scope and MUST be credited wherever shown, so the
 * CC BY line is always present in this phase. Mercury/Venus/Jupiter textures are
 * public-domain NASA/JPL/USGS (courtesy credit). Zonal-wind sources are cited
 * per body. Full attribution also lives in the About panel.
 */

/** CC BY 4.0 bodies (Solar System Scope). */
const CC_BY_BODIES: DetailPlanetName[] = ["Saturn", "Uranus", "Neptune"];

/** Measured zonal-wind profile sources, per body. */
const WIND_SOURCE: Partial<Record<DetailPlanetName, string>> = {
  Jupiter: "Winds: Barrado-Izagirre et al. 2013",
  Saturn: "Winds: García-Melendo et al. 2011",
  Neptune: "Winds: Sromovsky et al. 1993",
};

export default function SolarAttributionFooter({
  focus,
  usingFallbackTexture = false,
}: {
  /** current detail planet, or null in the orrery view */
  focus: DetailPlanetName | null;
  usingFallbackTexture?: boolean;
}) {
  const isCCBY = focus ? CC_BY_BODIES.includes(focus) : false;
  const windLine = focus ? WIND_SOURCE[focus] : undefined;

  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[320px] animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        <a
          href="https://ssd.jpl.nasa.gov/planets/approx_pos.html"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Orbits: JPL/NASA
        </a>
        {focus === "Saturn" && (
          <>
            {" · "}
            <span>Rings: Solar System Scope, CC BY 4.0</span>
          </>
        )}
        {windLine && (
          <>
            {" · "}
            <span>{windLine}</span>
          </>
        )}
        <br />
        <a
          href="https://www.solarsystemscope.com/textures/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Textures by Solar System Scope (solarsystemscope.com), CC BY 4.0
        </a>
        {focus && !isCCBY && (
          <>
            <br />
            <span className="text-faint/80">{focus} texture: NASA/JPL/USGS (public domain)</span>
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
