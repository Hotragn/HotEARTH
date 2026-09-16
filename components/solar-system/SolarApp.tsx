"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { orreryLayout, type PlanetName } from "@/lib/planets";
import { isDetailPlanet, type DetailPlanetName } from "@/lib/planet-facts";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import OrreryCanvas from "./OrreryCanvas";
import OrreryTimeControl, { ORRERY_SPEEDS } from "./OrreryTimeControl";
import PlanetDetailCanvas from "./PlanetDetailCanvas";
import PlanetHud from "./PlanetHud";
import PlanetTimeControl from "./PlanetTimeControl";
import ZonalWindPanel from "./ZonalWindPanel";
import SolarAttributionFooter from "./SolarAttributionFooter";

/**
 * Solar System tab shell. Two views share one client bundle:
 *   • the orrery (default), all eight planets orbiting the Sun in real time;
 *   • a per-planet detail globe, opened by clicking one of the six "other
 *     planets" (Earth and Mars link out to their own tabs).
 *
 * Time is held in refs read per-frame by the canvases (no per-frame React
 * work): the orrery advances `simMsRef`; each detail globe reads
 * `detailOffsetDaysRef`. State drives only the HUD readouts, ticked ~2Hz.
 * Everything is real orbital mechanics (lib/planets); the honest compression
 * note comes straight from orreryLayout().note.
 */
export default function SolarApp() {
  const router = useRouter();
  const [focus, setFocus] = useState<DetailPlanetName | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Orrery time ──────────────────────────────────────────────────────────
  const simMsRef = useRef<number>(Date.now());
  const [simMs, setSimMs] = useState<number>(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(3); // default 1 yr/s

  // ── Detail-globe time (season scrub) ───────────────────────────────────────
  const detailOffsetDaysRef = useRef(0);
  const [detailOffsetDays, setDetailOffsetDaysState] = useState(0);
  const setDetailOffsetDays = useCallback((d: number) => {
    detailOffsetDaysRef.current = d;
    setDetailOffsetDaysState(d);
  }, []);

  // 1Hz real-clock tick for HUD readouts + the "now" baseline.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Mirror the per-frame sim clock into state ~3Hz for the time-control display.
  useEffect(() => {
    const id = setInterval(() => setSimMs(simMsRef.current), 330);
    return () => clearInterval(id);
  }, []);

  const seekOrrery = useCallback((ms: number) => {
    simMsRef.current = ms;
    setSimMs(ms);
  }, []);

  const compressionNote = useMemo(
    () => orreryLayout(new Date(), { mode: "log" }).note,
    []
  );

  const openFocus = useCallback(
    (name: PlanetName) => {
      if (isDetailPlanet(name)) {
        setDetailOffsetDays(0);
        setUsingFallback(false);
        setFocus(name);
      } else if (name === "Earth") {
        router.push("/");
      } else if (name === "Mars") {
        router.push("/mars");
      }
    },
    [router, setDetailOffsetDays]
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {focus === null ? (
        <OrreryCanvas
          simMsRef={simMsRef}
          playing={playing}
          speedDaysPerSec={ORRERY_SPEEDS[speedIdx].daysPerSec}
          onFocus={openFocus}
        />
      ) : (
        <PlanetDetailCanvas
          key={focus}
          name={focus}
          timeOffsetDaysRef={detailOffsetDaysRef}
          onFallback={setUsingFallback}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="solar" />

        {focus === null ? (
          <>
            <section
              aria-label="Orrery"
              className="pointer-events-auto absolute left-3 top-20 w-[248px] animate-hud-in sm:left-5 sm:top-24"
            >
              <div className="hud-panel rounded-2xl p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                  Solar System · orrery
                </p>
                <p className="mt-1.5 text-sm text-ice">All eight planets, live</p>
                <p className="mt-1 text-[11px] leading-relaxed text-dim">
                  Each planet sits at its real heliocentric longitude for the
                  simulated date. Press play to watch them orbit at correct
                  relative speeds. Click a planet to open its globe: Earth and
                  Mars open their own tabs.
                </p>
              </div>
            </section>

            <OrreryTimeControl
              simMs={simMs}
              nowMs={nowMs}
              playing={playing}
              onPlayToggle={() => setPlaying((p) => !p)}
              speedIdx={speedIdx}
              onSpeedChange={setSpeedIdx}
              onSeek={seekOrrery}
              note={compressionNote}
            />
          </>
        ) : (
          <>
            <PlanetHud
              name={focus}
              nowMs={nowMs}
              offsetDays={detailOffsetDays}
              onBack={() => setFocus(null)}
            />
            <ZonalWindPanel name={focus} />
            <PlanetTimeControl
              name={focus}
              offsetDays={detailOffsetDays}
              onChange={setDetailOffsetDays}
              nowMs={nowMs}
            />
          </>
        )}

        <SolarAttributionFooter focus={focus} usingFallbackTexture={usingFallback} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
