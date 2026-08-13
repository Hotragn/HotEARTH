"use client";

/**
 * ISS tab data-credit footer (mirrors SunAttributionFooter / MarsAttribution).
 * States the measured / computed split honestly and points to the About panel
 * for the full attribution. Orbital data is public domain; SGP4 is satellite.js
 * (MIT); the optional live cross-check is wheretheiss.at.
 */
export default function IssAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-4 mx-auto hidden w-fit max-w-[520px] px-4 text-center animate-hud-in md:block">
      <p className="font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        Measured:{" "}
        <a
          href="https://celestrak.org/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          orbital elements — US Space Force (18 SDS) via CelesTrak
        </a>
        {" · "}
        Computed: position, ground track &amp; passes via{" "}
        <a
          href="https://github.com/shashwatak/satellite-js"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          SGP4 (satellite.js, MIT)
        </a>
        <br />
        <span className="text-faint/80">
          Imagery: NASA Blue/Black Marble · live cross-check: wheretheiss.at ·
          accuracy degrades with TLE age
        </span>
      </p>
    </footer>
  );
}
