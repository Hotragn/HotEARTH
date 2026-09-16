"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import {
  EXO_SYSTEMS_PATH,
  parseExoCatalog,
  systemDerived,
  type ExoCatalog,
  type ExoSystemData,
} from "@/lib/exo-facts";
import ExoSystemBrowser from "./ExoSystemBrowser";
import ExoSystemCanvas from "./ExoSystemCanvas";
import ExoSystemOverview from "./ExoSystemOverview";
import ExoSystemTimeControl, { EXO_SPEEDS } from "./ExoSystemTimeControl";
import ExoPlanetDetailCanvas from "./ExoPlanetDetailCanvas";
import ExoPlanetHud from "./ExoPlanetHud";
import ExoAttributionFooter from "./ExoAttributionFooter";

/**
 * Exoplanets tab shell. Three views share one client bundle:
 *   • the SYSTEM BROWSER (default), a fast, searchable/sortable DOM list of the
 *     real catalogue systems (no 3D), with a headline stat row;
 *   • the SYSTEM ARCHITECTURE view: a 3D scene of one host star and its planets
 *     on their real relative orbits (radius-compressed), a computed habitable
 *     zone shaded green, and an optional overlay of our Solar System's orbits;
 *   • a per-planet DETAIL view: an illustrative sphere (no imagery) + the
 *     measured parameters, opened by clicking a planet.
 *
 * The catalogue (public/data/exoplanets/systems.json) is fetched once and parsed
 * defensively: a missing/broken file degrades to a graceful empty state, never
 * a crash. Animation time lives in a ref read per-frame by the scene (no
 * per-frame React work); state drives only the HUD, ticked ~3 Hz.
 */
export default function ExoApp() {
  const [catalog, setCatalog] = useState<ExoCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [focusHost, setFocusHost] = useState<string | null>(null);
  const [focusPlanet, setFocusPlanet] = useState<string | null>(null);

  // ── Architecture animation time (sim days) ─────────────────────────────────
  const simDaysRef = useRef(0);
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [compareOn, setCompareOn] = useState(false);

  // ── Defensive data load (never blocks / crashes the route) ─────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(EXO_SYSTEMS_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setCatalog(parseExoCatalog(raw));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const systems = catalog?.systems ?? [];

  const focusSystem: ExoSystemData | null = useMemo(
    () => systems.find((s) => s.hostname === focusHost) ?? null,
    [systems, focusHost]
  );
  const derived = useMemo(
    () => (focusSystem ? systemDerived(focusSystem) : null),
    [focusSystem]
  );

  // Innermost measured period → set a watchable animation rate (relative speeds
  // stay physical; this only maps wall-time to sim-days). Falls back to 10 d.
  const innerPeriodDays = useMemo(() => {
    if (!focusSystem) return 10;
    const periods = focusSystem.planets
      .map((p) => p.period_days)
      .filter((d): d is number => typeof d === "number" && d > 0);
    return periods.length ? Math.min(...periods) : 10;
  }, [focusSystem]);
  const daysPerSec = (innerPeriodDays / 5) * EXO_SPEEDS[speedIdx].mult;

  const openSystem = useCallback((hostname: string) => {
    simDaysRef.current = 0;
    setFocusPlanet(null);
    setPlaying(true);
    setFocusHost(hostname);
  }, []);

  const backToBrowser = useCallback(() => {
    setFocusHost(null);
    setFocusPlanet(null);
  }, []);

  const focusPlanetData =
    focusSystem && focusPlanet
      ? focusSystem.planets.find((p) => p.name === focusPlanet) ?? null
      : null;

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {/* ── Scene layer ── */}
      {focusSystem && focusPlanetData ? (
        <ExoPlanetDetailCanvas
          key={focusPlanet ?? ""}
          planet={focusPlanetData}
          star={focusSystem.star}
        />
      ) : focusSystem && derived ? (
        <ExoSystemCanvas
          key={focusHost ?? ""}
          system={focusSystem}
          derived={derived}
          simDaysRef={simDaysRef}
          playing={playing}
          daysPerSec={daysPerSec}
          compareOn={compareOn}
          onFocusPlanet={setFocusPlanet}
        />
      ) : null}

      {/* ── HUD layer ── (view content first, NavShell last so its dropdowns
          paint above the full-height browser overlay) */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {focusSystem === null ? (
          <ExoSystemBrowser
            catalog={catalog}
            loaded={loaded}
            onOpenSystem={openSystem}
          />
        ) : focusPlanetData ? (
          <ExoPlanetHud
            planet={focusPlanetData}
            system={focusSystem}
            onBack={() => setFocusPlanet(null)}
          />
        ) : (
          derived && (
            <>
              <ExoSystemOverview
                system={focusSystem}
                derived={derived}
                onBack={backToBrowser}
                onFocusPlanet={setFocusPlanet}
                compareOn={compareOn}
              />
              <ExoSystemTimeControl
                playing={playing}
                onPlayToggle={() => setPlaying((p) => !p)}
                speedIdx={speedIdx}
                onSpeedChange={setSpeedIdx}
                compareOn={compareOn}
                onCompareToggle={() => setCompareOn((c) => !c)}
              />
            </>
          )
        )}

        <ExoAttributionFooter acknowledgment={catalog?.meta.acknowledgment} />

        <NavShell onAbout={() => setAboutOpen(true)} active="exoplanets" />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
