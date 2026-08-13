"use client";

/**
 * Always-on data credit (planetary-data-ingestion skill: attribution lives
 * in the footer, the about panel, and docs/DATA_SOURCES.md). On phones the
 * HUD is tight, so the full list lives in the About modal instead.
 */
export default function AttributionFooter({
  windActive = false,
}: {
  /** appends the NOAA GFS credit while the wind layer is on */
  windActive?: boolean;
}) {
  return (
    <footer className="pointer-events-none absolute bottom-5 corner-safe-right hidden animate-hud-in md:block">
      <p className="font-mono text-[10px] tracking-wide text-faint">
        <a
          href="https://worldview.earthdata.nasa.gov/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          NASA GIBS/Worldview
        </a>
        {" · "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Open-Meteo
        </a>
        {" · "}
        <a
          href="https://www.naturalearthdata.com/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto transition-colors duration-200 hover:text-dim"
        >
          Natural Earth
        </a>
        {windActive && (
          <>
            {" · "}
            <a
              href="https://www.nco.ncep.noaa.gov/pmb/products/gfs/"
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto transition-colors duration-200 hover:text-dim"
            >
              Wind: NOAA GFS
            </a>
          </>
        )}
      </p>
    </footer>
  );
}
