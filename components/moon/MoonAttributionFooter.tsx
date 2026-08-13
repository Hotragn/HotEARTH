"use client";

/**
 * Moon data credit footer (mirrors MarsAttributionFooter / Earth's
 * AttributionFooter). Sources (see docs/MOON_DATA_SOURCES.md):
 *   Surface temperature: LRO Diviner — NASA PDS Geosciences Node (public domain)
 *   Illumination & libration: computed (Meeus lunar theory)
 *   Basemap: NASA SVS / LROC / ASU (public domain)
 */
export default function MoonAttributionFooter({
  usingFallbackTexture = false,
}: {
  /** notes that the surface is procedural until the real texture lands */
  usingFallbackTexture?: boolean;
}) {
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] tracking-wide text-faint">
        <a
          href="https://pds-geosciences.wustl.edu/missions/lro/diviner.htm"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Temp: LRO Diviner / NASA PDS
        </a>
        {" · "}
        <span title="Illumination & libration computed from Meeus lunar theory (no runtime API)">
          Geometry: Meeus (computed)
        </span>
        {" · "}
        <a
          href="https://svs.gsfc.nasa.gov/4720"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Basemap: NASA SVS / LROC
        </a>
        {usingFallbackTexture && (
          <>
            <br />
            <span className="text-faint/80">
              surface shown procedurally · awaiting real basemap
            </span>
          </>
        )}
      </p>
    </footer>
  );
}
