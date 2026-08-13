"use client";

import {
  appearanceFor,
  is67P,
  type SmallBodyObject,
} from "@/lib/small-body-facts";

/**
 * Comets & Asteroids attribution footer (mirrors DwarfAttributionFooter /
 * ExoAttributionFooter). Always credits the JPL Small-Body Database + CNEOS (a
 * courtesy credit — this is freely-usable US-Government data). On a detail body
 * with real imagery it adds that body's exact credit; for 67P this is the
 * mandatory ESA/Rosetta/NAVCAM, CC BY-SA 3.0 IGO line. The full attribution set
 * lives in the About panel.
 */
export default function SmallBodyAttributionFooter({
  focus,
}: {
  focus: SmallBodyObject | null;
}) {
  const appearance = focus ? appearanceFor(focus) : null;
  const showImageryCredit =
    focus !== null && appearance !== null && appearance.kind !== "lump";

  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[340px] animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        <a
          href="https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Orbits &amp; close approaches: JPL SBDB / CNEOS
        </a>
        {showImageryCredit && appearance && (
          <>
            <br />
            <span className={is67P(focus!) ? "text-dim" : "text-faint/80"}>
              {appearance.credit}
            </span>
          </>
        )}
      </p>
    </footer>
  );
}
