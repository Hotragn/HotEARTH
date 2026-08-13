"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  auroraVerdict,
  gScale,
  geomagneticLatitude,
  parseKpForecast,
  parseKpMinute,
  parseOvation,
  parseSolarWind,
  type KpSample,
  type OvationGrid,
  type SolarWind,
} from "@/lib/aurora";
import { moonTonight, nightWindow } from "@/lib/tonight";
import { OBSERVER_STORAGE_KEY, PRESET_PLACES } from "@/components/tonight/tonightUi";
import AuroraGlobe from "./AuroraGlobe";
import {
  AuroraHonesty,
  GeomagneticCard,
  KpStrip,
  SolarWindCard,
  VerdictCard,
} from "./AuroraPanels";
import {
  FEED_KP_FORECAST,
  FEED_KP_MINUTE,
  FEED_OVATION,
  FEED_WIND_MAG,
  FEED_WIND_SPEED,
  SWPC_PAGE,
} from "./auroraUi";

/**
 * Aurora: the link between the Sun tab and the Earth tabs.
 *
 * This app already had the Sun on one side and Earth's sky on the other, with
 * nothing joining them. The aurora IS that join: the solar wind arrives, the
 * field reconnects, particles follow field lines down into the atmosphere, and
 * the result is a ring of light around a pole that is not the geographic one.
 *
 * Four NOAA SWPC feeds, live, public domain, no key. The tab computes what they
 * do not carry: geomagnetic coordinates, the oval edge for the current Kp, how
 * far an aurora at real emission altitudes stays above the horizon, and a
 * verdict for the place the visitor already told the Tonight tab about. It also
 * borrows lib/tonight to answer the question that decides most aurora nights
 * and that space-weather sites usually ignore: is it even dark there.
 */

/** The comparison that makes the geomagnetic point land. */
const COMPARISON_CITIES = [
  { name: "Edinburgh", lat: 55.953, lon: -3.188 },
  { name: "Moscow", lat: 55.756, lon: 37.617 },
  { name: "Vancouver", lat: 49.283, lon: -123.121 },
  { name: "Paris", lat: 48.857, lon: 2.352 },
];

export default function AuroraApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const [kpMinute, setKpMinute] = useState<KpSample[]>([]);
  const [kpForecast, setKpForecast] = useState<KpSample[]>([]);
  const [grid, setGrid] = useState<OvationGrid | null>(null);
  const [wind, setWind] = useState<SolarWind>({
    speedKmS: null,
    btNt: null,
    bzNt: null,
    time: null,
  });

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  /** The observer, shared with Tonight and Seismic Earth through one key. */
  const [observer, setObserver] = useState<{ latDeg: number; lonDeg: number } | null>(
    null
  );
  const [placeLabel, setPlaceLabel] = useState<string>(PRESET_PLACES[0].label);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OBSERVER_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { latDeg?: number; lonDeg?: number; label?: string };
        if (
          typeof s?.latDeg === "number" &&
          typeof s?.lonDeg === "number" &&
          Number.isFinite(s.latDeg) &&
          Number.isFinite(s.lonDeg)
        ) {
          setObserver({ latDeg: s.latDeg, lonDeg: s.lonDeg });
          setPlaceLabel(s.label ?? "your location");
          return;
        }
      }
    } catch {
      /* private mode: fall through to the preset */
    }
    setObserver({ latDeg: PRESET_PLACES[0].latDeg, lonDeg: PRESET_PLACES[0].lonDeg });
  }, []);

  // ── the live feeds ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const get = (url: string) =>
      fetch(url, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    Promise.all([
      get(FEED_KP_MINUTE),
      get(FEED_KP_FORECAST),
      get(FEED_OVATION),
      get(FEED_WIND_SPEED),
      get(FEED_WIND_MAG),
    ]).then(([kpm, kpf, ov, ws, wm]) => {
      if (cancelled) return;
      const minute = parseKpMinute(kpm);
      const forecast = parseKpForecast(kpf);
      const parsedGrid = parseOvation(ov);
      setKpMinute(minute);
      setKpForecast(forecast);
      setGrid(parsedGrid);
      setWind(parseSolarWind(ws, wm));
      // Kp is the one thing the page cannot do without: no Kp, no verdict.
      setFailed(minute.length === 0 && forecast.length === 0);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ── the computed answer ───────────────────────────────────────────────────

  /** Current Kp: the latest measured minute, else the latest observed forecast row. */
  const kp = useMemo(() => {
    if (kpMinute.length > 0) return kpMinute[kpMinute.length - 1].kp;
    const observed = kpForecast.filter((s) => s.observed);
    return observed.length > 0 ? observed[observed.length - 1].kp : null;
  }, [kpMinute, kpForecast]);

  const verdict = useMemo(
    () => (observer && kp !== null ? auroraVerdict(observer.latDeg, observer.lonDeg, kp, grid) : null),
    [observer, kp, grid]
  );

  const g = useMemo(() => (kp === null ? null : gScale(kp)), [kp]);

  /**
   * Borrowed from the Tonight tab: a strong oval over a sky that never gets
   * dark is not an aurora you will see, and that is exactly the situation at
   * aurora latitudes in midsummer.
   */
  const darkness = useMemo(() => {
    if (!observer) return { darkHours: null as number | null, moonNote: null as string | null };
    const night = nightWindow(now, { latDeg: observer.latDeg, lonDeg: observer.lonDeg });
    if (!night) return { darkHours: null, moonNote: null };
    const moon = moonTonight(night, { latDeg: observer.latDeg, lonDeg: observer.lonDeg }, now);
    const moonNote =
      moon && moon.upDuringDark && moon.illuminatedFraction > 0.5
        ? `A ${Math.round(moon.illuminatedFraction * 100)}% Moon is up during the dark hours, which will wash out a faint display.`
        : null;
    return { darkHours: night.darkHours, moonNote };
  }, [observer, now]);

  const comparisons = useMemo(
    () =>
      COMPARISON_CITIES.map((c) => ({
        name: c.name,
        geographic: c.lat,
        geomagnetic: geomagneticLatitude(c.lat, c.lon) ?? 0,
      })),
    []
  );

  /** Observed minutes plus the forecast, for one continuous strip. */
  const strip = useMemo(() => kpForecast, [kpForecast]);

  if (loading) {
    return <BootScreen label="Reading NOAA space weather" />;
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {!failed && (
        <AuroraGlobe grid={grid} observer={observer} autoRotate={autoRotate} />
      )}

      {/*
        Chrome at z-40, matching the site convention: tab content below 40, nav
        at 40, modals at 55+.
      */}
      <div
        className="pointer-events-none absolute inset-0 z-40"
        onPointerDown={() => setAutoRotate(false)}
      >
        <NavShell onAbout={() => setAboutOpen(true)} active="aurora" />

        {failed ? (
          <div className="pointer-events-auto absolute inset-x-0 top-1/2 mx-auto max-w-lg -translate-y-1/2 px-5">
            <div className="hud-panel rounded-2xl border border-amber-400/25 p-5 text-center">
              <h2 className="font-display text-lg font-medium tracking-tight text-ice">
                NOAA space weather could not be reached
              </h2>
              <p className="mt-2 text-[12px] leading-relaxed text-dim">
                This tab reads live and commits no mirror. Space weather is a
                state of right now: a saved copy of last week&apos;s Kp would
                tell you nothing about tonight, so it shows nothing instead.
              </p>
              <a
                href={SWPC_PAGE}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block font-mono text-[11px] text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
              >
                NOAA&apos;s forecast, direct
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* left column: the answer for this observer */}
            <div className="hud-scroll pointer-events-auto absolute left-3 top-24 flex max-h-[calc(100dvh-9rem)] w-[340px] flex-col gap-3 overflow-y-auto animate-hud-in sm:left-5 sm:top-28">
              <VerdictCard
                verdict={verdict}
                kp={kp}
                g={g}
                placeLabel={placeLabel}
                darkHours={darkness.darkHours}
                moonNote={darkness.moonNote}
              />
              <GeomagneticCard comparisons={comparisons} />
            </div>

            {/* right column: the drivers and the load-bearing honesty panel */}
            <div className="hud-scroll pointer-events-auto absolute right-3 top-24 flex max-h-[calc(100dvh-9rem)] w-[330px] flex-col gap-3 overflow-y-auto animate-hud-in sm:right-5 sm:top-28">
              <SolarWindCard wind={wind} now={now} />
              <AuroraHonesty grid={grid} now={now} />
            </div>

            {/* centre stage, lower half: the outlook */}
            <div className="pointer-events-auto absolute bottom-3 left-1/2 hidden w-[min(48rem,calc(100vw-46rem))] -translate-x-1/2 animate-hud-in xl:block">
              <KpStrip samples={strip} />
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
