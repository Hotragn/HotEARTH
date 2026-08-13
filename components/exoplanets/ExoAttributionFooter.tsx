"use client";

import {
  EXO_PRIMARY_CITATION,
  NASA_EXOPLANET_ARCHIVE_ACK,
} from "@/lib/exo-facts";

/**
 * Exoplanets attribution footer. Displaying the NASA Exoplanet Archive
 * acknowledgment is a HARD REQUIREMENT of using the archive, so the exact
 * `meta.acknowledgment` string is rendered verbatim here (falling back to the
 * constant if the file is missing), alongside the primary citation and — because
 * WASP survey planets are included — the WASP acknowledgment. The full set also
 * appears in the About panel. Shown on md+ (the About panel guarantees it is
 * always reachable on any screen size).
 */
export default function ExoAttributionFooter({
  acknowledgment,
}: {
  acknowledgment?: string;
}) {
  const ack = acknowledgment && acknowledgment.length > 0
    ? acknowledgment
    : NASA_EXOPLANET_ARCHIVE_ACK;

  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[320px] animate-hud-in md:block">
      <p className="text-right font-mono text-[9px] leading-relaxed tracking-wide text-faint">
        <span className="block">{ack}</span>
        <span className="mt-1 block text-faint/80">{EXO_PRIMARY_CITATION}</span>
        <span className="mt-0.5 block text-faint/80">
          Incl. WASP survey — Butters et al. (2010).
        </span>
        <a
          href="https://exoplanetarchive.ipac.caltech.edu/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto mt-0.5 inline-block transition-colors duration-200 hover:text-dim"
        >
          NASA Exoplanet Archive ↗
        </a>
      </p>
    </footer>
  );
}
