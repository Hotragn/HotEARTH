"use client";

import { ArrowsLeftRight, Pause, Play } from "@phosphor-icons/react";
import { HZ_GREEN } from "@/lib/exo-facts";

/**
 * Animation speed multipliers. The base rate is set per-system from the
 * innermost planet's period (so it is always watchable); these only scale
 * wall-time → sim-days. The RELATIVE speeds between planets stay physical
 * whatever the multiplier: that is the honest part.
 */
export const EXO_SPEEDS = [
  { label: "0.5×", mult: 0.5 },
  { label: "1×", mult: 1 },
  { label: "2×", mult: 2 },
  { label: "4×", mult: 4 },
] as const;

interface ExoSystemTimeControlProps {
  playing: boolean;
  onPlayToggle: () => void;
  speedIdx: number;
  onSpeedChange: (idx: number) => void;
  compareOn: boolean;
  onCompareToggle: () => void;
}

/**
 * Bottom-center control for the architecture view: play/pause the orbital
 * animation, choose a playback multiplier, and toggle the "compare to our Solar
 * System" overlay. Deliberately has NO absolute-date scrubber: an exoplanet's
 * absolute orbital phase is unknown, so a calendar date would be a fiction.
 */
export default function ExoSystemTimeControl({
  playing,
  onPlayToggle,
  speedIdx,
  onSpeedChange,
  compareOn,
  onCompareToggle,
}: ExoSystemTimeControlProps) {
  return (
    <section
      aria-label="Architecture animation control"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[560px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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

          <div className="flex items-center gap-1">
            {EXO_SPEEDS.map((s, i) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSpeedChange(i)}
                aria-pressed={i === speedIdx}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide transition-colors duration-200 ${
                  i === speedIdx ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onCompareToggle}
            aria-pressed={compareOn}
            className={`ml-auto flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
              compareOn
                ? "bg-[#5aa9ff]/15 text-[#5aa9ff]"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            <ArrowsLeftRight size={13} weight="bold" aria-hidden />
            Compare
          </button>
        </div>

        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          <span>
            Relative orbital speeds are physical; absolute phase is illustrative.
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: HZ_GREEN }}
            />
            habitable zone shaded
          </span>
        </p>
      </div>
    </section>
  );
}
