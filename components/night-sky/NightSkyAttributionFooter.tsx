"use client";

import { NIGHT_SKY_ATTRIBUTIONS } from "@/lib/star-facts";

/**
 * Night Sky attribution footer. Displaying all five credits is a HARD
 * REQUIREMENT of the licenses (CC BY / CC BY-SA), so the exact strings are
 * rendered verbatim here — star data (HYG, CC BY-SA 4.0), constellation lines
 * (van der Sluys, CC BY 4.0), deep-sky objects (OpenNGC, CC BY-SA 4.0), star
 * names (IAU WGSN) and the Milky Way panorama (ESO/S. Brunier, CC BY 4.0). The
 * full set also appears in the About panel, which is reachable at any screen
 * size. Shown on md+.
 */
export default function NightSkyAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[340px] animate-hud-in md:block">
      <ul className="space-y-0.5 text-right font-mono text-[9px] leading-relaxed tracking-wide text-faint">
        {NIGHT_SKY_ATTRIBUTIONS.map((a) => (
          <li key={a.href}>
            <a
              href={a.href}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto transition-colors duration-200 hover:text-dim"
            >
              {a.text}
            </a>
          </li>
        ))}
      </ul>
    </footer>
  );
}
