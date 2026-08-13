"use client";

import { TEXTURE_CAVEAT, hasRealMap, type DwarfBodyName } from "@/lib/dwarf-facts";

/**
 * Dwarf-planet attribution footer (mirrors SolarAttributionFooter /
 * MoonsAttributionFooter). ALL dwarf maps this phase are public domain — no
 * CC-BY obligation — so they are credited as a courtesy:
 *   • Pluto & Charon — NASA / JHU-APL / SwRI (New Horizons)
 *   • Ceres          — NASA / JPL-Caltech / UCLA / MPS / DLR / IDA (Dawn)
 * Orbital + physical constants are JPL SBDB / mission papers. Eris, Haumea and
 * Makemake have NO map — their appearance is explicitly illustrative. Full
 * attribution and the key measured-fact papers live in the About panel.
 */
export default function DwarfAttributionFooter({
  focus,
  usingFallbackTexture = false,
}: {
  /** current detail body, or null in the orrery overview */
  focus: DwarfBodyName | null;
  usingFallbackTexture?: boolean;
}) {
  const imaged = focus ? hasRealMap(focus) : false;
  const caveat = focus ? TEXTURE_CAVEAT[focus] : undefined;
  const isCeres = focus === "Ceres";
  const isPlutoSystem = focus === "Pluto" || focus === "Charon";

  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[340px] animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        <a
          href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Orbits &amp; constants: JPL SBDB
        </a>
        {isPlutoSystem && (
          <>
            <br />
            <span>Map: NASA / JHU-APL / SwRI (New Horizons, PD)</span>
          </>
        )}
        {isCeres && (
          <>
            <br />
            <span>Map: NASA / JPL-Caltech / UCLA / MPS / DLR / IDA (Dawn, PD)</span>
          </>
        )}
        {focus && !imaged && (
          <>
            <br />
            <span className="text-faint/80">
              Appearance illustrative — never visited; no surface map
            </span>
          </>
        )}
        {caveat && (
          <>
            <br />
            <span className="text-faint/80">{caveat.label}</span>
          </>
        )}
        {usingFallbackTexture && imaged && (
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
