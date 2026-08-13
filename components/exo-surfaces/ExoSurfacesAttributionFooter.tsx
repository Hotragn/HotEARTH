"use client";

import {
  EXO_PRIMARY_CITATION,
  NASA_EXOPLANET_ARCHIVE_ACK,
} from "@/lib/exo-facts";
import { DOCS_BASE } from "./exoSurfacesUi";

/**
 * Exoplanet Surfaces data-credit footer. Honors the existing NASA Exoplanet
 * Archive acknowledgment (verbatim, as the Exoplanets tab does), notes the
 * reused lib/exoplanets + lib/exo-surfaces, states that ALL ground is
 * illustrative (no exoplanet surface imagery exists), and links to both docs.
 * Shown on lg+ (the About panel guarantees it is reachable on any screen size).
 */
export default function ExoSurfacesAttributionFooter({
  acknowledgment,
}: {
  acknowledgment?: string;
}) {
  const ack =
    acknowledgment && acknowledgment.length > 0
      ? acknowledgment
      : NASA_EXOPLANET_ARCHIVE_ACK;

  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[760px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        The sky and every physical number are computed from measured NASA Exoplanet
        Archive parameters via reused lib/exoplanets and lib/exo-surfaces; no API
        keys, no runtime fetch beyond the committed catalogue. All ground and
        terrain is original, illustrative work: no exoplanet surface has ever been
        imaged, so none is used.
        <br />
        <span className="text-faint/80">
          {ack} {EXO_PRIMARY_CITATION}{" "}
          <a
            href={`${DOCS_BASE}/EXO_SURFACES_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/EXOPLANETS_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            exoplanet catalogue
          </a>
        </span>
      </p>
    </footer>
  );
}
