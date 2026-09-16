"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DWARFS, neptuneResonance } from "@/lib/dwarf-planets";
import {
  DWARF_CONSTANTS_PATH,
  DWARF_PHENOMENA_PATH,
  isDwarfBody,
  parseDwarfConstants,
  parseDwarfPhenomena,
  type DwarfBodyName,
  type DwarfConstantsMap,
  type DwarfPhenomenaMap,
} from "@/lib/dwarf-facts";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import DwarfOrreryCanvas from "./DwarfOrreryCanvas";
import DwarfOrreryTimeControl, { DWARF_ORRERY_SPEEDS } from "./DwarfOrreryTimeControl";
import DwarfDetailCanvas from "./DwarfDetailCanvas";
import DwarfHud from "./DwarfHud";
import DwarfTimeControl from "./DwarfTimeControl";
import DwarfAttributionFooter from "./DwarfAttributionFooter";

/**
 * Dwarf Planets tab shell. Two views share one client bundle:
 *   • the mini-orrery (default), the five dwarf planets on their real,
 *     eccentric, radius-compressed orbits, with Neptune's orbit as the trans-
 *     Neptunian reference ring and a live Pluto–Neptune 3:2 resonance callout;
 *   • a per-body detail globe, opened by clicking a dwarf planet (and Charon,
 *     reached from Pluto's HUD: the Pluto–Charon binary).
 *
 * Time is held in refs read per-frame by the canvases (no per-frame React
 * work): the orrery advances `simMsRef`; each detail globe reads
 * `detailOffsetDaysRef`. State drives only the HUD readouts, ticked ~1–3 Hz.
 * Everything is real orbital mechanics (lib/dwarf-planets); the honest
 * compression note comes straight from the orrery layout. phenomena.json +
 * constants.json are fetched once and parsed defensively: the UI degrades
 * gracefully to lib data if either is missing.
 */
export default function DwarfApp() {
  const [focus, setFocus] = useState<DwarfBodyName | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  // ── Orrery time ──────────────────────────────────────────────────────────
  const simMsRef = useRef<number>(Date.now());
  const [simMs, setSimMs] = useState<number>(() => Date.now());
  // Paused on load (like the Solar-System orrery): the huge period range means
  // inner Ceres blurs at speed, so let the viewer press play when ready.
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(2); // default 10 yr/s

  // ── Detail-globe time (rotation scrub) ─────────────────────────────────────
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

  // ── Defensive data loading (never blocks the scene) ────────────────────────
  const [phenomena, setPhenomena] = useState<DwarfPhenomenaMap | null>(null);
  const [constants, setConstants] = useState<DwarfConstantsMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    const safeJson = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([
      safeJson(DWARF_PHENOMENA_PATH),
      safeJson(DWARF_CONSTANTS_PATH),
    ]).then(([ph, co]) => {
      if (cancelled) return;
      setPhenomena(parseDwarfPhenomena(ph));
      setConstants(parseDwarfConstants(co));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const compressionNote =
    "Angular positions are real heliocentric longitudes; radial distances are log-compressed for visibility.";
  const resonance = useMemo(() => neptuneResonance(), []);

  const openFocus = useCallback(
    (name: DwarfBodyName) => {
      if (!isDwarfBody(name)) return;
      setDetailOffsetDays(0);
      setUsingFallback(false);
      setFocus(name);
    },
    [setDetailOffsetDays]
  );

  const rotationUncertain =
    focus && focus !== "Charon" ? DWARFS[focus].physical.rotationUncertain : false;

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {focus === null ? (
        <DwarfOrreryCanvas
          simMsRef={simMsRef}
          playing={playing}
          speedDaysPerSec={DWARF_ORRERY_SPEEDS[speedIdx].daysPerSec}
          onFocus={openFocus}
        />
      ) : (
        <DwarfDetailCanvas
          key={focus}
          name={focus}
          timeOffsetDaysRef={detailOffsetDaysRef}
          onFallback={setUsingFallback}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="dwarfs" />

        {focus === null ? (
          <>
            <OverviewPanel resonance={resonance} />
            <DwarfOrreryTimeControl
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
            <DwarfHud
              name={focus}
              nowMs={nowMs}
              offsetDays={detailOffsetDays}
              phenomena={phenomena?.[focus]}
              constants={constants?.[focus]}
              onBack={() => setFocus(null)}
              onNavigate={openFocus}
            />
            <DwarfTimeControl
              name={focus}
              offsetDays={detailOffsetDays}
              onChange={setDetailOffsetDays}
              nowMs={nowMs}
              rotationUncertain={rotationUncertain}
            />
          </>
        )}

        <DwarfAttributionFooter focus={focus} usingFallbackTexture={usingFallback} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

function OverviewPanel({
  resonance,
}: {
  resonance: ReturnType<typeof neptuneResonance>;
}) {
  return (
    <section
      aria-label="Dwarf planets overview"
      className="pointer-events-auto absolute left-3 top-20 w-[268px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-13rem)] overflow-y-auto rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Dwarf planets · mini-orrery
        </p>
        <p className="mt-1.5 text-sm text-ice">Five distant worlds, live</p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          Each dwarf planet sits at its real heliocentric longitude and rides its
          real, eccentric orbit: from Ceres in the asteroid belt (~2.8 AU) out to
          Eris (~68 AU). Only the radial distance is log-compressed so all five
          fit on screen. Press play to watch them orbit at correct relative
          speeds; click a body to open its globe.
        </p>

        {/* trans-Neptunian reference + Pluto's resonance */}
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
              Beyond Neptune
            </p>
            {resonance.isThreeToTwo && (
              <span className="rounded-full border border-solar/40 bg-solar/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar">
                3:2 locked
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
            The blue ring is Neptune&apos;s orbit (~
            {resonance.neptuneSemiMajorAU.toFixed(0)} AU): the trans-Neptunian
            datum. Pluto, Haumea, Makemake and Eris all live beyond it. Pluto&apos;s
            orbit even dips inside Neptune&apos;s (perihelion ~
            {resonance.plutoPerihelionAU.toFixed(1)} AU), yet the{" "}
            <span className="text-ice">
              {resonance.periodRatioPlutoOverNeptune.toFixed(2)}:1 ≈ 3:2
            </span>{" "}
            resonance keeps them forever apart.
          </p>
          <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
            {resonance.note}
          </p>
        </div>

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          No weather out here: orbits and rotation are computed; features are
          measured by spacecraft where one has visited (Pluto, Charon, Ceres).
        </p>
      </div>
    </section>
  );
}
