"use client";

import { Pause, Play } from "@phosphor-icons/react";

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365.25;

/**
 * Saturn is interesting on two timescales: the inner moons orbit in days, while
 * the rings open and close over years. So the scrubber reaches ±16 years with a
 * SIGNED-CUBIC mapping (offsetDays = sign(s)·|s|³·MAX): fine, day-scale control
 * near "now" for watching a moon move, stretching to a decade-plus at the ends
 * for watching the ring tilt B swing across a season. Play mode covers the fast
 * end (inner-moon motion); a 30 day/s preset lets you also watch the rings tilt.
 */
export const MAX_SCRUB_DAYS = 16 * DAYS_PER_YEAR; // ≈ 5844 days

/** slider position s in [-1, 1] → offset in days (fine near 0, ±16 yr at ends). */
export function scrubToDays(s: number): number {
  return Math.sign(s) * Math.abs(s) ** 3 * MAX_SCRUB_DAYS;
}
/** inverse: offset in days → slider position s in [-1, 1]. */
export function daysToScrub(days: number): number {
  const c = Math.min(1, Math.abs(days) / MAX_SCRUB_DAYS);
  return Math.sign(days) * Math.cbrt(c);
}

/** Playback speeds, in simulated milliseconds advanced per real second. */
export const PLAY_SPEEDS = [
  { label: "30 min/s", msPerSec: 1_800_000 },
  { label: "2 hr/s", msPerSec: 7_200_000 },
  { label: "6 hr/s", msPerSec: 21_600_000 },
  { label: "1 day/s", msPerSec: 86_400_000 },
  { label: "5 day/s", msPerSec: 432_000_000 },
  { label: "30 day/s", msPerSec: 2_592_000_000 },
] as const;

/** Framed-field zoom presets (half-width in Saturn equatorial radii). */
export const VIEW_PRESETS = [
  { label: "Rings", targetReq: 3.6 }, // Saturn + full rings + Mimas/Enceladus
  { label: "Inner", targetReq: 12 }, // through Rhea (~8.7 Req)
  { label: "Titan", targetReq: 24 }, // Titan (~20.3 Req) and all inner moons
  { label: "Iapetus", targetReq: 62 }, // the whole system (Iapetus ~59 Req)
] as const;

/** Human-readable signed offset from now. */
function formatOffset(offsetDays: number): string {
  const a = Math.abs(offsetDays);
  const sign = offsetDays >= 0 ? "+" : "-";
  if (a < 2) return `${sign}${a.toFixed(2)} d`;
  if (a < 90) return `${sign}${a.toFixed(1)} d`;
  if (a < 2 * DAYS_PER_YEAR) return `${sign}${(a / 30.44).toFixed(1)} mo`;
  return `${sign}${(a / DAYS_PER_YEAR).toFixed(2)} yr`;
}

interface SaturnMoonsTimeControlProps {
  displayedMs: number;
  nowMs: number;
  isLive: boolean;
  playing: boolean;
  onNow: () => void;
  onPlayToggle: () => void;
  /** scrub to now + offsetDays (pauses + leaves live) */
  onScrub: (offsetDays: number) => void;
  speedIdx: number;
  onSpeedChange: (idx: number) => void;
  viewIdx: number;
  onViewChange: (idx: number) => void;
  exaggerate: boolean;
  onExaggerateToggle: () => void;
}

/**
 * Time machine + view controls. Play/Pause advances the displayed instant so an
 * inner moon can be watched sweeping across (or a shadow crossing the disk near
 * equinox); the cubic scrubber reaches ±16 years so the ring opening can be
 * watched swinging across a season; Now snaps back to the live 1 Hz clock. The
 * zoom presets reframe the plane-of-sky view (Rings to watch transits, Iapetus to
 * see the whole system), and the moon-size toggle carries the honesty label:
 * markers are enlarged for visibility.
 */
export default function SaturnMoonsTimeControl({
  displayedMs,
  nowMs,
  isLive,
  playing,
  onNow,
  onPlayToggle,
  onScrub,
  speedIdx,
  onSpeedChange,
  viewIdx,
  onViewChange,
  exaggerate,
  onExaggerateToggle,
}: SaturnMoonsTimeControlProps) {
  const offsetDays = (displayedMs - nowMs) / DAY_MS;
  const sliderValue = daysToScrub(offsetDays);

  return (
    <section
      aria-label="Time and view controls"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[640px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
        {/* row 1: transport + scrub */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onPlayToggle}
            aria-pressed={playing}
            aria-label={playing ? "Pause" : "Play"}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              playing
                ? "bg-solar/20 text-solar"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            {playing ? (
              <Pause size={16} weight="fill" aria-hidden />
            ) : (
              <Play size={16} weight="fill" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={onNow}
            aria-pressed={isLive}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              isLive
                ? "bg-solar/15 text-solar"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                isLive ? "bg-solar animate-pulse-dot" : "bg-white/30"
              }`}
            />
            Now
          </button>

          <label className="flex min-w-0 grow items-center gap-3">
            <span className="sr-only">
              Scrub the displayed date (fine near now, up to ±16 years to watch the
              rings tilt)
            </span>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.001}
              value={sliderValue}
              onChange={(e) => onScrub(scrubToDays(Number(e.target.value)))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[92px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isLive ? "text-faint" : "text-solar"
            }`}
          >
            {isLive ? "NOW" : formatOffset(offsetDays)}
          </span>
        </div>

        {/* row 2: speed + zoom + honesty toggle */}
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-2.5">
          <div className="flex items-center gap-1">
            <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              speed
            </span>
            {PLAY_SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSpeedChange(i)}
                aria-pressed={i === speedIdx}
                className={`cursor-pointer rounded-full px-2 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 ${
                  i === speedIdx ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              zoom
            </span>
            {VIEW_PRESETS.map((v, i) => (
              <button
                key={v.label}
                type="button"
                onClick={() => onViewChange(i)}
                aria-pressed={i === viewIdx}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 ${
                  i === viewIdx ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onExaggerateToggle}
            aria-pressed={exaggerate}
            title="Real Saturn moons are tiny against the disk and rings. Enlarged markers are a legibility choice, not the true angular size."
            className={`ml-auto cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              exaggerate
                ? "border-solar/50 bg-solar/10 text-solar"
                : "border-line text-dim hover:text-ice"
            }`}
          >
            {exaggerate ? "Moon size: exaggerated" : "Moon size: true"}
          </button>
        </div>
      </div>
    </section>
  );
}
