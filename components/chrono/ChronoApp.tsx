"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import {
  CHRONO_MAX_YEAR,
  CHRONO_SPEEDS,
  DEFAULT_SPEED_INDEX,
  advanceYear,
  clampYear,
} from "@/lib/chrono-clock";
import {
  fetchHistoricalCities,
  type HistoricalCity,
} from "@/lib/chrono-cities";
import {
  fetchEvents,
  type EventCatalog,
} from "@/lib/chrono-events";
import {
  fetchPopulationSeries,
  type PopulationSeries,
} from "@/lib/chrono-population";
import {
  fetchClimateSeries,
  type ClimateSeries,
} from "@/lib/chrono-climate";
import { regionSeedFromLatLon } from "@/lib/chrono-era";
import ChronoCanvas, { type LodLevel } from "./ChronoCanvas";
import ChronoHud from "./ChronoHud";
import ChronoTimeControl from "./ChronoTimeControl";
import EraScenePanel from "./EraScenePanel";
import ChronoAttributionFooter from "./ChronoAttributionFooter";

/**
 * Virtual Earth: a deep-zoomable time-machine globe that plays through
 * history. Mirrors MarsApp: full-viewport canvas + HUD overlay, dynamically
 * imported (see ChronoShell) so the r3f bundle only loads on this route.
 *
 * The simulated year lives in a ref (read per-frame by the scene) and is
 * advanced by a single RAF loop here; a ~10Hz snapshot drives the HUD so React
 * never re-renders per frame. Everything shown is real data (or interpolation)
 * except the clearly-labeled procedural Era Scene.
 */

// starting year: deep enough to watch civilization emerge, not the very edge
const START_YEAR = -3200;

export default function ChronoApp() {
  // --- simulated clock (ref = per-frame truth; state = HUD snapshots) ------
  const simYearRef = useRef<number>(START_YEAR);
  const [displayYear, setDisplayYear] = useState<number>(START_YEAR);
  const [playing, setPlaying] = useState<boolean>(true);
  const [speedIndex, setSpeedIndex] = useState<number>(DEFAULT_SPEED_INDEX);
  // mutable mirrors read inside the RAF loop without re-subscribing it
  const playingRef = useRef(playing);
  const speedRef = useRef(speedIndex);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    speedRef.current = speedIndex;
  }, [speedIndex]);

  // --- single RAF playback loop -------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSnapshot = 0;

    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.1); // clamp long frames/tab-switch
      last = t;

      if (playingRef.current) {
        const yps = CHRONO_SPEEDS[speedRef.current].yearsPerSecond;
        const next = advanceYear(simYearRef.current, dt, yps);
        simYearRef.current = next;
        // arrived at the present → stop (playback "reaches now")
        if (next >= CHRONO_MAX_YEAR) {
          playingRef.current = false;
          setPlaying(false);
        }
      }

      // push a HUD snapshot ~10x/sec (no per-frame React work)
      if (t - lastSnapshot > 100) {
        lastSnapshot = t;
        setDisplayYear(simYearRef.current);
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const handleScrub = useCallback((year: number) => {
    const y = clampYear(year);
    simYearRef.current = y;
    setDisplayYear(y);
    setPlaying(false); // scrubbing pauses playback
  }, []);

  // --- data (all defensive: fetch → built-in fallback) --------------------
  const [cities, setCities] = useState<HistoricalCity[] | null>(null);
  const [population, setPopulation] = useState<PopulationSeries | null>(null);
  const [events, setEvents] = useState<EventCatalog | null>(null);
  const [climate, setClimate] = useState<ClimateSeries | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetchHistoricalCities(c.signal)
      .then((cat) => setCities(cat.cities))
      .catch(() => {
        /* fetchHistoricalCities never rejects, but stay safe */
      });
    fetchPopulationSeries(c.signal).then(setPopulation).catch(() => {});
    fetchEvents(c.signal).then(setEvents).catch(() => {});
    fetchClimateSeries(c.signal).then(setClimate).catch(() => {});
    return () => c.abort();
  }, []);

  // --- LOD (from the canvas) + era-scene toggle ---------------------------
  const [lod, setLod] = useState<LodLevel>("far");
  const [eraSceneOn, setEraSceneOn] = useState(true);
  const [usingFallbackTexture, setUsingFallbackTexture] = useState(false);

  const [aboutOpen, setAboutOpen] = useState(false);

  const dataReady = cities && population && events && climate;
  const usingFallbackData =
    (population?.usingFallback ?? true) ||
    (events?.usingFallback ?? true) ||
    (climate?.usingFallback ?? true);

  // region seed for the era scene: derived from the current view center. We
  // keep it simple/stable, the opening framing over the mid-Atlantic, since
  // the era scene is stylized, not place-specific.
  const regionSeed = regionSeedFromLatLon(20, -20);

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {dataReady ? (
        <ChronoCanvas
          cities={cities}
          events={events.events}
          simYearRef={simYearRef}
          onLodChange={setLod}
          onFallbackTexture={setUsingFallbackTexture}
        />
      ) : (
        <BootScreen label="Winding the clock" />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="virtual" />

        {dataReady && (
          <>
            <ChronoHud
              year={displayYear}
              lod={lod}
              population={population}
              events={events}
              climate={climate}
            />

            {/* era-scene toggle (top-right, above the panel) */}
            <div className="pointer-events-auto absolute right-3 top-[4.5rem] animate-hud-in sm:right-5 sm:top-[4.5rem]">
              {lod !== "close" && (
                <button
                  type="button"
                  onClick={() => setEraSceneOn((v) => !v)}
                  aria-pressed={eraSceneOn}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-200 hud-panel ${
                    eraSceneOn ? "text-[#b9a6ff]" : "text-faint hover:text-dim"
                  }`}
                  title="Zoom in close to reveal the procedural era scene"
                >
                  Era scenes {eraSceneOn ? "on" : "off"} · zoom in
                </button>
              )}
            </div>

            {/* procedural era vignette: only when zoomed close + enabled */}
            {eraSceneOn && lod === "close" && (
              <EraScenePanel
                year={displayYear}
                regionSeed={regionSeed}
                onClose={() => setEraSceneOn(false)}
              />
            )}

            <ChronoTimeControl
              year={displayYear}
              playing={playing}
              speedIndex={speedIndex}
              onTogglePlay={togglePlay}
              onSpeedChange={setSpeedIndex}
              onScrub={handleScrub}
            />

            <ChronoAttributionFooter
              usingFallbackData={usingFallbackData || usingFallbackTexture}
            />
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
