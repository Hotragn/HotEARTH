"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { latLonToVector3, type LatLon } from "@/lib/geo";
import { sunDirection } from "@/lib/solar";
import { activityIndex, localSolarHours } from "@/lib/activity";
import { fetchCities, formatPop, type City } from "@/lib/cities";
import {
  fetchCurrentTemps,
  type SamplePoint,
  type SampleTemp,
} from "@/lib/openmeteo";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import ForecastPanel from "@/components/ui/ForecastPanel";
import AboutModal from "@/components/ui/AboutModal";
import AttributionFooter from "@/components/ui/AttributionFooter";
import { useBaseTextures } from "@/components/globe/useBaseTextures";
import LivingEarthCanvas from "./LivingEarthCanvas";

/**
 * Living Earth: the human layer of the twin. Everything on screen is real
 * data (Natural Earth cities, the computed solar terminator, live Open-Meteo
 * weather) or a clearly-labeled simulation derived from it (the city
 * activity pulse: see lib/activity.ts and the legend in the stats strip).
 */

/** hover/click hit radius around a city, as cos(angular distance) */
const HOVER_MIN_DOT = Math.cos((2.0 * Math.PI) / 180);
const PICK_MIN_DOT = Math.cos((3.0 * Math.PI) / 180);

/**
 * Fixed 10-city sample for the warmest/coldest HUD stat. Fetched in ONE
 * batched Open-Meteo request, once per session: far inside the 600/min
 * free-tier limit.
 */
const TEMP_SAMPLE: readonly SamplePoint[] = [
  { name: "Tokyo", lat: 35.69, lon: 139.75 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Singapore", lat: 1.29, lon: 103.86 },
  { name: "Cairo", lat: 30.06, lon: 31.25 },
  { name: "Moscow", lat: 55.75, lon: 37.62 },
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "Lagos", lat: 6.45, lon: 3.39 },
  { name: "New York", lat: 40.75, lon: -73.98 },
  { name: "São Paulo", lat: -23.56, lon: -46.63 },
  { name: "Anchorage", lat: 61.22, lon: -149.9 },
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export default function LivingEarthApp() {
  const { base, bootError } = useBaseTextures();
  const timeOffsetHoursRef = useRef(0); // Living Earth always runs live

  // --- city catalog (static asset built from Natural Earth) ---------------
  const [cities, setCities] = useState<City[] | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [cityRetryNonce, setCityRetryNonce] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCityError(null);
    fetchCities(controller.signal)
      .then((catalog) => setCities(catalog.cities))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setCityError(err instanceof Error ? err.message : "cities failed");
      });
    return () => controller.abort();
  }, [cityRetryNonce]);

  // unit vectors per city, for nearest-city hit tests and the night count
  const unitVecs = useMemo(() => {
    if (!cities) return null;
    const v = new Float32Array(cities.length * 3);
    for (let i = 0; i < cities.length; i++) {
      const [x, y, z] = latLonToVector3(cities[i].lat, cities[i].lon, 1);
      v[i * 3] = x;
      v[i * 3 + 1] = y;
      v[i * 3 + 2] = z;
    }
    return v;
  }, [cities]);

  const findNearest = useCallback(
    (latLon: LatLon, minDot: number): number => {
      if (!cities || !unitVecs) return -1;
      const [x, y, z] = latLonToVector3(latLon.lat, latLon.lon, 1);
      let best = -1;
      let bestDot = minDot;
      for (let i = 0; i < cities.length; i++) {
        const d =
          x * unitVecs[i * 3] + y * unitVecs[i * 3 + 1] + z * unitVecs[i * 3 + 2];
        if (d > bestDot) {
          bestDot = d;
          best = i;
        }
      }
      return best;
    },
    [cities, unitVecs]
  );

  // --- hover: tooltip following the cursor --------------------------------
  const [hovered, setHovered] = useState<City | null>(null);
  const hoveredIdx = useRef(-1);
  const tipRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  const positionTip = useCallback(() => {
    const el = tipRef.current;
    if (el) {
      el.style.transform = `translate(${mouse.current.x + 16}px, ${
        mouse.current.y + 16
      }px)`;
    }
  }, []);

  useLayoutEffect(positionTip, [hovered, positionTip]);

  const handleHover = useCallback(
    (latLon: LatLon | null) => {
      const idx = latLon ? findNearest(latLon, HOVER_MIN_DOT) : -1;
      if (idx !== hoveredIdx.current) {
        hoveredIdx.current = idx;
        setHovered(idx >= 0 && cities ? cities[idx] : null);
      }
    },
    [cities, findNearest]
  );

  // --- selection: reuse the Earth tab's forecast panel --------------------
  const [selected, setSelected] = useState<City | null>(null);
  const handlePick = useCallback(
    (latLon: LatLon | null) => {
      if (!latLon) {
        setSelected(null);
        return;
      }
      const idx = findNearest(latLon, PICK_MIN_DOT);
      setSelected(idx >= 0 && cities ? cities[idx] : null);
    },
    [cities, findNearest]
  );
  // stable LatLon identity per selection: ForecastPanel refetches on change
  const selectedLatLon = useMemo<LatLon | null>(
    () => (selected ? { lat: selected.lat, lon: selected.lon } : null),
    [selected]
  );

  // --- world stats: % of cities in night (real terminator) ----------------
  const [nightPct, setNightPct] = useState<number | null>(null);
  useEffect(() => {
    if (!unitVecs) return;
    const n = unitVecs.length / 3;
    const compute = () => {
      const [sx, sy, sz] = sunDirection(new Date());
      let night = 0;
      for (let i = 0; i < n; i++) {
        if (
          sx * unitVecs[i * 3] +
            sy * unitVecs[i * 3 + 1] +
            sz * unitVecs[i * 3 + 2] <
          0
        ) {
          night++;
        }
      }
      setNightPct(Math.round((100 * night) / n));
    };
    compute();
    const id = setInterval(compute, 15_000);
    return () => clearInterval(id);
  }, [unitVecs]);

  // --- world stats: warmest/coldest of the fixed sample (once per session) -
  const [temps, setTemps] = useState<SampleTemp[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchCurrentTemps(TEMP_SAMPLE, controller.signal)
      .then(setTemps)
      .catch(() => {
        /* stat is optional: drop it quietly rather than hammer the API */
      });
    return () => controller.abort();
  }, []);
  const warmest = useMemo(
    () =>
      temps && temps.length > 0
        ? temps.reduce((a, b) => (b.temperature > a.temperature ? b : a))
        : null,
    [temps]
  );
  const coldest = useMemo(
    () =>
      temps && temps.length > 0
        ? temps.reduce((a, b) => (b.temperature < a.temperature ? b : a))
        : null,
    [temps]
  );

  const [aboutOpen, setAboutOpen] = useState(false);

  if (bootError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-abyss px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-solar">
          Boot failure
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">
          Base textures failed to load ({bootError}). Check that
          public/textures is deployed, then reload.
        </p>
      </div>
    );
  }

  return (
    <main
      className={`fixed inset-0 overflow-hidden bg-abyss ${
        hovered ? "cursor-pointer" : ""
      }`}
      onPointerMove={(e) => {
        mouse.current = { x: e.clientX, y: e.clientY };
        positionTip();
      }}
    >
      {base ? (
        <LivingEarthCanvas
          dayTexture={base.day}
          nightTexture={base.night}
          timeOffsetHoursRef={timeOffsetHoursRef}
          cities={cities}
          selected={selectedLatLon}
          onPick={handlePick}
          onHover={handleHover}
        />
      ) : (
        <BootScreen label="Waking the cities" />
      )}

      {/* HUD */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell active="living" onAbout={() => setAboutOpen(true)} />

        {/* world stats strip + honest simulation legend */}
        <section
          aria-label="World stats"
          className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[620px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
        >
          <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
            {cityError ? (
              <p className="font-mono text-[11px] leading-relaxed text-solar">
                City data failed to load ({cityError}).{" "}
                <button
                  type="button"
                  onClick={() => setCityRetryNonce((n) => n + 1)}
                  className="cursor-pointer underline decoration-solar/50 underline-offset-2 hover:text-ice"
                >
                  Retry
                </button>
              </p>
            ) : (
              <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-[11px] tracking-wide text-dim">
                <span>
                  <span className="text-ice">
                    {cities ? cities.length.toLocaleString() : "–"}
                  </span>{" "}
                  <span className="text-faint">cities</span>
                </span>
                <span>
                  <span className="text-ice">
                    {nightPct !== null ? `${nightPct}%` : "–"}
                  </span>{" "}
                  <span className="text-faint">in night</span>
                </span>
                {warmest && coldest && (
                  <>
                    <span>
                      <span className="text-faint">warmest of 10 sampled</span>{" "}
                      <span className="text-ice">
                        {warmest.name} {Math.round(warmest.temperature)}°C
                      </span>
                    </span>
                    <span>
                      <span className="text-faint">coldest</span>{" "}
                      <span className="text-ice">
                        {coldest.name} {Math.round(coldest.temperature)}°C
                      </span>
                    </span>
                  </>
                )}
              </div>
            )}
            <p className="mt-2 border-t border-line pt-2 text-[10px] leading-relaxed text-faint">
              Night-side cities glow along the real computed terminator. City
              activity is a simulation driven by real local time and
              population: not measured data.
            </p>
          </div>
        </section>

        {/* city weather panel: the Earth tab's ForecastPanel, reused */}
        {selected && selectedLatLon && (
          <ForecastPanel
            picked={selectedLatLon}
            onClose={() => setSelected(null)}
            label="City weather · live"
            title={selected.name}
            subtitle={`${selected.country} · pop ${formatPop(selected.pop)}`}
            extra={<ActivityExtra city={selected} />}
          />
        )}

        <AttributionFooter />
      </div>

      {/* hover tooltip, positioned directly from pointer events */}
      {hovered && (
        <div
          ref={tipRef}
          className="pointer-events-none fixed left-0 top-0 z-20 will-change-transform"
        >
          <div className="hud-panel rounded-xl px-3 py-2">
            <p className="text-xs font-medium text-ice">{hovered.name}</p>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              {hovered.country} · pop {formatPop(hovered.pop)}
            </p>
          </div>
        </div>
      )}

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

/**
 * The simulated-activity block inside the city panel. Kept honest; shows the
 * inputs (local solar time, population) and states that it is a simulation.
 */
function ActivityExtra({ city }: { city: City }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const activity = activityIndex(city.lon, nowMs);
  const solarH = localSolarHours(city.lon, nowMs);
  const hh = Math.floor(solarH);
  const mm = Math.floor((solarH - hh) * 60);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
        Simulated activity
      </p>
      <div className="mt-3 flex items-center gap-3">
        <span className="relative h-1 grow rounded-full bg-white/8" aria-hidden>
          <span
            className="absolute left-0 top-0 h-1 rounded-full"
            style={{
              width: `${Math.round(activity * 100)}%`,
              background: "linear-gradient(to right, #5f83ad, #f2a63b)",
            }}
          />
        </span>
        <span className="font-mono text-sm text-ice">
          {Math.round(activity * 100)}
          <span className="text-faint">%</span>
        </span>
      </div>
      <p className="mt-2 font-mono text-[11px] text-dim">
        local solar {pad(hh)}:{pad(mm)}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-faint">
        Simulation from real local time and population (diurnal commute
        curve), not measured data.
      </p>
    </div>
  );
}
