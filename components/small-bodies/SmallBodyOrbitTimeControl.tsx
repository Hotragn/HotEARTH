"use client";

import { Pause, Play } from "@phosphor-icons/react";

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;
const MONTH_DAYS = 30.4375;

/**
 * Playback speeds in simulated Earth days per real second. Small-body periods
 * span ~3 yr (Encke) to thousands of years (long-period comets), and the
 * interstellar visitors pass through only once, so the useful range is days to
 * a few years per second: at the slow end an inner near-Earth asteroid's ~1 yr
 * loop is legible; at the fast end a Halley-type comet finally moves. Chosen to
 * keep INNER-system motion readable rather than to whip the outer aphelia round.
 */
export const SMALL_BODY_ORRERY_SPEEDS = [
  { label: "10 d/s", daysPerSec: 10 },
  { label: "1 mo/s", daysPerSec: MONTH_DAYS },
  { label: "3 mo/s", daysPerSec: MONTH_DAYS * 3 },
  { label: "1 yr/s", daysPerSec: YEAR_DAYS },
  { label: "3 yr/s", daysPerSec: YEAR_DAYS * 3 },
] as const;

// Scrub window (years relative to "now"): back far enough to replay the
// interstellar fly-throughs (1I ~2017, 2I ~2019) and forward past the Apophis
// 2029 pass and Halley's 2061 return, so a scrub can catch the marquee events.
const SCRUB_MIN_YEARS = -20;
const SCRUB_MAX_YEARS = 60;

interface SmallBodyOrbitTimeControlProps {
  simMs: number;
  nowMs: number;
  playing: boolean;
  onPlayToggle: () => void;
  speedIdx: number;
  onSpeedChange: (idx: number) => void;
  onSeek: (ms: number) => void;
  /** honesty string shown verbatim under the control */
  note: string;
}

/** Compact "YYYY-MM" label for the simulated instant. */
function ymLabel(ms: number): string {
  const d = new Date(ms);
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  return `${d.getUTCFullYear()}-${m}`;
}

/**
 * Orrery time machine for the Comets & Asteroids inner-system view (mirrors the
 * Solar-System / dwarf-planet OrreryTimeControl). Play/Pause advances a simulated
 * clock so every small body rides its REAL orbit at the correct relative speed;
 * the scrub slider ranges from the recent interstellar fly-throughs to Halley's
 * next return; Now snaps back to the live clock. The compression + illustrative
 * honesty note is shown verbatim so nobody mistakes the compressed radii for true
 * distances or the tails for photometry.
 */
export default function SmallBodyOrbitTimeControl({
  simMs,
  nowMs,
  playing,
  onPlayToggle,
  speedIdx,
  onSpeedChange,
  onSeek,
  note,
}: SmallBodyOrbitTimeControlProps) {
  const offsetYears = (simMs - nowMs) / (YEAR_DAYS * DAY_MS);
  const isNow = Math.abs(simMs - nowMs) < 30 * DAY_MS; // within a month of live

  return (
    <section
      aria-label="Orrery time control"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[600px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
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
            onClick={() => onSeek(nowMs)}
            aria-pressed={isNow}
            className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.14em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              isNow
                ? "bg-solar/15 text-solar"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                isNow ? "bg-solar animate-pulse-dot" : "bg-white/30"
              }`}
            />
            Now
          </button>

          <label className="flex min-w-0 grow items-center gap-3">
            <span className="sr-only">Scrub the simulated date</span>
            <input
              type="range"
              min={SCRUB_MIN_YEARS}
              max={SCRUB_MAX_YEARS}
              step={0.05}
              value={Math.max(SCRUB_MIN_YEARS, Math.min(SCRUB_MAX_YEARS, offsetYears))}
              onChange={(e) =>
                onSeek(nowMs + Number(e.target.value) * YEAR_DAYS * DAY_MS)
              }
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[62px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isNow ? "text-faint" : "text-solar"
            }`}
          >
            {ymLabel(simMs)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <div className="flex items-center gap-1">
            {SMALL_BODY_ORRERY_SPEEDS.map((s, i) => (
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
          <span className="ml-auto truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            {isNow
              ? "live · real orbital mechanics"
              : `${offsetYears >= 0 ? "+" : ""}${offsetYears.toFixed(1)} yr`}
          </span>
        </div>

        <p className="mt-2 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-faint">
          {note}
        </p>
      </div>
    </section>
  );
}
