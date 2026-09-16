"use client";

import {
  CHRONO_MAX_YEAR,
  CHRONO_MIN_YEAR,
  CHRONO_SPEEDS,
  formatYear,
  formatYearShort,
  progressToYear,
  yearToProgress,
} from "@/lib/chrono-clock";
import { Pause, Play } from "@phosphor-icons/react";

/**
 * Timeline transport for the Virtual Earth tab: play/pause, speed presets, and
 * a scrubber across the full historical span. Mirrors the Earth/Mars
 * TimeControl visual language; the scene reads the running year via a ref
 * per-frame, so this component owns only the transport UI + the year readout
 * the parent hands it (driven by a ~10Hz tick, not per-frame React work).
 */
export default function ChronoTimeControl({
  year,
  playing,
  speedIndex,
  onTogglePlay,
  onSpeedChange,
  onScrub,
}: {
  year: number;
  playing: boolean;
  speedIndex: number;
  onTogglePlay: () => void;
  onSpeedChange: (index: number) => void;
  /** scrubber moved to a year (also pauses playback in the parent) */
  onScrub: (year: number) => void;
}) {
  const progress = yearToProgress(year);

  return (
    <section
      aria-label="Timeline control"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[640px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
        {/* prominent current year */}
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span
              className="font-display text-2xl font-medium tracking-tight text-ice"
              style={{ textShadow: "0 0 22px rgba(114,86,214,0.35)" }}
            >
              {formatYear(year)}
            </span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            {playing ? "playing" : "paused"}
          </span>
        </div>

        {/* transport row */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-pressed={playing}
            aria-label={playing ? "Pause timeline" : "Play timeline"}
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7256d6]/70 ${
              playing
                ? "bg-[#7256d6]/20 text-[#b9a6ff]"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            {playing ? (
              <Pause size={16} weight="fill" aria-hidden />
            ) : (
              <Play size={16} weight="fill" aria-hidden />
            )}
          </button>

          <label className="flex min-w-0 grow items-center gap-3">
            <span className="sr-only">Scrub the timeline year</span>
            <input
              type="range"
              min={0}
              max={1000}
              step={1}
              value={Math.round(progress * 1000)}
              onChange={(e) =>
                onScrub(progressToYear(Number(e.target.value) / 1000))
              }
              className="time-scrubber w-full min-w-0"
            />
          </label>
        </div>

        {/* span endpoints + speed presets */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-2">
          <div className="flex items-center gap-1.5">
            {CHRONO_SPEEDS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSpeedChange(i)}
                aria-pressed={i === speedIndex}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 ${
                  i === speedIndex
                    ? "bg-[#7256d6]/20 text-[#b9a6ff]"
                    : "bg-white/5 text-faint hover:bg-white/10 hover:text-dim"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[10px] tracking-wide text-faint">
            {formatYearShort(CHRONO_MIN_YEAR)} – {formatYearShort(CHRONO_MAX_YEAR)}
          </span>
        </div>
      </div>
    </section>
  );
}
