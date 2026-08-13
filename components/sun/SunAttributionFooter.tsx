"use client";

/**
 * Sun tab data-credit footer (mirrors MarsAttributionFooter / SolarAttribution).
 * Both sources are public domain; credit is courtesy, not a license condition.
 *   Imagery: NASA/SDO and the AIA, EVE, HMI science teams (full-disk snapshots).
 *   Space weather + forecasts: NOAA Space Weather Prediction Center (SWPC).
 * Full detail + the measured/forecast/computed split live in the About panel.
 */
export default function SunAttributionFooter() {
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden max-w-[320px] animate-hud-in md:block">
      <p className="text-right font-mono text-[10px] leading-relaxed tracking-wide text-faint">
        <a
          href="https://sdo.gsfc.nasa.gov/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Imagery: NASA/SDO (AIA/EVE/HMI teams)
        </a>
        {" · "}
        <a
          href="https://www.swpc.noaa.gov/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Space weather: NOAA/SWPC
        </a>
        <br />
        <span className="text-faint/80">
          Public domain · full-disk snapshots, false-colour by wavelength
        </span>
      </p>
    </footer>
  );
}
