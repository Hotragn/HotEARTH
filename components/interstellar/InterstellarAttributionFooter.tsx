"use client";

import { AUDIO_CREDIT, DOCS_BASE } from "./interstellarUi";

/**
 * Interstellar data-credit footer. States the computed / reused / illustrative
 * split, the movie-inspired-no-copyright statement, the swarm real-algorithm-but-
 * game note, the NASA public-domain audio credit and the original-robot note, and
 * links the two shipped docs. No em-dashes (commas / parentheses only).
 */
export default function InterstellarAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-24 mx-auto hidden w-fit max-w-[760px] px-4 text-center animate-hud-in lg:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Computed: the three interstellar objects&apos; real hyperbolic
        trajectories from cited JPL SBDB / MPC elements (lib/interstellar reusing
        lib/small-bodies), and a live run of real swarm-robotics algorithms
        (Reynolds boids 1987, decentralized task allocation, leaderless local
        consensus) each frame.
        {" · "}
        Reused / real: public-domain NASA/ESA footage and imagery form the visual
        backbone: the silent NASA SVS galactic-center video (Video: NASA, ESA, and
        G. Bacon (STScI)), the Spitzer galactic center (NASA/JPL-Caltech), the
        Voyager Pale Blue Dot (NASA/JPL-Caltech) and the Hubble eXtreme Deep Field
        (NASA, ESA, and the HUDF/XDF Team). Plus NASA Voyager plasma-wave audio
        (public domain, <span className="text-faint/90">{AUDIO_CREDIT}</span>), off
        by default.
        <br />
        <span className="text-faint/80">
          Movie-inspired homage with zero copyrighted film assets (no score, scenes,
          stills, logos, dialogue or film robot). The guide is an original
          monolith-style design; the visuals above are real public-domain NASA/ESA
          footage, not film frames and not a synthetic comp. The interstellar objects
          are shown as real trajectories and points, not photographs, because none
          has ever been imaged (the footage is the real environment, not the objects).
          Swarm Defense is a live educational model, not a real defense system, not
          real robots and not telemetry. Osculating two-body hyperbolae only (no
          perturbations, no outgassing); cross-check JPL Horizons.{" "}
          <a
            href={`${DOCS_BASE}/INTERSTELLAR_DATA_SOURCES.md`}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto transition-colors duration-200 hover:text-dim"
          >
            data sources
          </a>{" "}
          ·{" "}
          <a
            href={`${DOCS_BASE}/INTERSTELLAR_PHYSICS.md`}
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
