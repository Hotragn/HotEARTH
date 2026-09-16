"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import {
  PARENT_ORDER,
  laplaceResonance,
  moonOrreryLayout,
  type MoonName,
  type ParentPlanet,
} from "@/lib/moons";
import {
  MOON_CONSTANTS_PATH,
  MOON_PHENOMENA_PATH,
  PARENT_ACCENT,
  isDetailMoon,
  parseMoonConstants,
  parseMoonPhenomena,
  type MoonConstantsMap,
  type MoonPhenomenaMap,
} from "@/lib/moon-facts";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import MoonsOverviewCanvas from "./MoonsOverviewCanvas";
import MoonDetailCanvas from "./MoonDetailCanvas";
import MoonHud from "./MoonHud";
import MoonTimeControl from "./MoonTimeControl";
import MoonsAttributionFooter from "./MoonsAttributionFooter";

/** Mini-orrery playback speeds (simulated Earth days per real second). */
const ORRERY_SPEEDS = [
  { label: "1×", daysPerSec: 1 },
  { label: "4×", daysPerSec: 4 },
  { label: "12×", daysPerSec: 12 },
] as const;

/**
 * Major Moons tab shell. Two views share one client bundle:
 *   • the overview (default), a per-parent mini-orrery (Jupiter / Saturn /
 *     Neptune, selectable) with the moons at their real relative orbital speeds,
 *     plus a prominent Laplace-resonance callout for Jupiter's Galileans;
 *   • a per-moon detail globe, opened by clicking a moon.
 *
 * Time is held in refs read per-frame by the canvases (no per-frame React work):
 * the overview advances `simMsRef`; each detail globe reads `detailOffsetDaysRef`.
 * State drives only the HUD readouts, ticked ~1Hz. Everything is real orbital
 * mechanics (lib/moons); the honest compression note comes straight from
 * moonOrreryLayout().note. phenomena.json + constants.json are fetched once and
 * parsed defensively: the UI degrades gracefully to lib data if either is
 * missing.
 */
export default function MoonsApp() {
  const [focus, setFocus] = useState<MoonName | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [parent, setParent] = useState<ParentPlanet>("Jupiter");

  // ── Mini-orrery time ───────────────────────────────────────────────────────
  const simMsRef = useRef<number>(Date.now());
  const [playing, setPlaying] = useState(true);
  const [speedIdx, setSpeedIdx] = useState(0);

  // ── Detail-globe time (orbit scrub) ────────────────────────────────────────
  const detailOffsetDaysRef = useRef(0);
  const [detailOffsetDays, setDetailOffsetDaysState] = useState(0);
  const setDetailOffsetDays = useCallback((d: number) => {
    detailOffsetDaysRef.current = d;
    setDetailOffsetDaysState(d);
  }, []);

  // 1Hz wall-clock tick for HUD readouts.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Defensive data loading (never blocks the scene) ────────────────────────
  const [phenomena, setPhenomena] = useState<MoonPhenomenaMap | null>(null);
  const [constants, setConstants] = useState<MoonConstantsMap | null>(null);
  useEffect(() => {
    let cancelled = false;
    const safeJson = (url: string) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([
      safeJson(MOON_PHENOMENA_PATH),
      safeJson(MOON_CONSTANTS_PATH),
    ]).then(([ph, co]) => {
      if (cancelled) return;
      setPhenomena(parseMoonPhenomena(ph));
      setConstants(parseMoonConstants(co));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const compressionNote = useMemo(
    () => moonOrreryLayout(parent, new Date(), { mode: "log" }).note,
    [parent]
  );
  const laplace = useMemo(() => laplaceResonance(), []);

  const openFocus = useCallback(
    (name: MoonName) => {
      if (!isDetailMoon(name)) return;
      setDetailOffsetDays(0);
      setUsingFallback(false);
      setFocus(name);
    },
    [setDetailOffsetDays]
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {focus === null ? (
        <MoonsOverviewCanvas
          parent={parent}
          simMsRef={simMsRef}
          playing={playing}
          speedDaysPerSec={ORRERY_SPEEDS[speedIdx].daysPerSec}
          onFocus={openFocus}
        />
      ) : (
        <MoonDetailCanvas
          key={focus}
          name={focus}
          timeOffsetDaysRef={detailOffsetDaysRef}
          onFallback={setUsingFallback}
        />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="moons" />

        {focus === null ? (
          <>
            <OverviewPanel
              parent={parent}
              onParentChange={setParent}
              playing={playing}
              onPlayToggle={() => setPlaying((p) => !p)}
              speedIdx={speedIdx}
              onSpeedChange={setSpeedIdx}
              note={compressionNote}
            />
            {parent === "Jupiter" && (
              <LaplaceCallout
                ratios={laplace.ratios}
                isLaplace={laplace.isLaplace}
                note={laplace.note}
              />
            )}
          </>
        ) : (
          <>
            <MoonHud
              name={focus}
              nowMs={nowMs}
              offsetDays={detailOffsetDays}
              phenomena={phenomena?.[focus]}
              constants={constants?.[focus]}
              onBack={() => setFocus(null)}
            />
            <MoonTimeControl
              name={focus}
              offsetDays={detailOffsetDays}
              onChange={setDetailOffsetDays}
              nowMs={nowMs}
            />
          </>
        )}

        <MoonsAttributionFooter focus={focus} usingFallbackTexture={usingFallback} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

function OverviewPanel({
  parent,
  onParentChange,
  playing,
  onPlayToggle,
  speedIdx,
  onSpeedChange,
  note,
}: {
  parent: ParentPlanet;
  onParentChange: (p: ParentPlanet) => void;
  playing: boolean;
  onPlayToggle: () => void;
  speedIdx: number;
  onSpeedChange: (i: number) => void;
  note: string;
}) {
  return (
    <section
      aria-label="Major moons overview"
      className="pointer-events-auto absolute left-3 top-20 w-[262px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Major moons · mini-orrery
        </p>
        <p className="mt-1.5 text-sm text-ice">
          {parent}&apos;s moons, orbiting live
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          Each moon sits at its real orbital angle for the simulated moment, so
          inner moons whip around while outer ones amble. Click a moon to open
          its globe.
        </p>

        {/* parent selector */}
        <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
          {PARENT_ORDER.map((p) => {
            const activeP = p === parent;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onParentChange(p)}
                aria-pressed={activeP}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors duration-200 ${
                  activeP
                    ? "bg-white/10 text-ice"
                    : "text-dim hover:bg-white/5 hover:text-ice"
                }`}
                style={activeP ? { color: PARENT_ACCENT[p] } : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* playback */}
        <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={onPlayToggle}
            aria-pressed={playing}
            aria-label={playing ? "Pause" : "Play"}
            className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              playing
                ? "bg-solar/20 text-solar"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            {playing ? (
              <Pause size={14} weight="fill" aria-hidden />
            ) : (
              <Play size={14} weight="fill" aria-hidden />
            )}
          </button>
          <div className="flex items-center gap-1">
            {ORRERY_SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSpeedChange(i)}
                aria-pressed={i === speedIdx}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 ${
                  i === speedIdx
                    ? "bg-white/10 text-ice"
                    : "text-faint hover:text-dim"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          {note}
        </p>
      </div>
    </section>
  );
}

function LaplaceCallout({
  ratios,
  isLaplace,
  note,
}: {
  ratios: [number, number, number];
  isLaplace: boolean;
  note: string;
}) {
  return (
    <section
      aria-label="Laplace resonance"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[440px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
            Laplace resonance
          </p>
          {isLaplace && (
            <span className="rounded-full border border-solar/40 bg-solar/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar">
              locked
            </span>
          )}
        </div>
        <p className="mt-1.5 font-display text-lg text-ice">
          Io : Europa : Ganymede ≈{" "}
          <span className="text-solar">
            {ratios[0].toFixed(0)} : {ratios[1].toFixed(2)} : {ratios[2].toFixed(2)}
          </span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          {note} The three are mean-motion locked to ≈ 1 : 2 : 4, so a triple
          conjunction never happens, and the forced eccentricity drives Io&apos;s
          volcanism and the Galilean oceans.
        </p>
      </div>
    </section>
  );
}
