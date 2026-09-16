"use client";

import { SOLS_PER_MARS_YEAR, solarLongitude } from "@/lib/mars-time";

const SOL_MS = 88_775_244;

interface MarsTimeControlProps {
  /** sols relative to now, 0 = live; scrub across one full Mars year */
  offsetSols: number;
  onChange: (sols: number) => void;
  /** live wall-clock ms, ticked 1Hz by the parent */
  nowMs: number;
}

/**
 * Mars-year time machine: scrub the subsolar point / season across a full Mars
 * year (≈668.6 sols ≈ 687 Earth days) and watch Ls advance. Mirrors the Earth
 * TimeControl visual language; the globe reads the offset via a ref per-frame,
 * so this component only owns the HUD readouts.
 */
export default function MarsTimeControl({
  offsetSols,
  onChange,
  nowMs,
}: MarsTimeControlProps) {
  const isLive = offsetSols === 0;
  const simDate = new Date(nowMs + offsetSols * SOL_MS);
  const ls = solarLongitude(simDate);
  const earthDays = (offsetSols * SOL_MS) / 86_400_000;

  return (
    <section
      aria-label="Mars year control"
      className="pointer-events-auto absolute inset-x-3 bottom-3 animate-hud-in sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[540px] sm:max-w-[calc(100vw-2rem)] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onChange(0)}
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
              Scrub forward across a full Mars year (668.6 sols)
            </span>
            <input
              type="range"
              min={0}
              max={Math.round(SOLS_PER_MARS_YEAR)}
              step={1}
              value={offsetSols}
              onChange={(e) => onChange(Number(e.target.value))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[92px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isLive ? "text-faint" : "text-solar"
            }`}
          >
            {isLive ? "NOW" : `+${Math.round(offsetSols)} sols`}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span
            className="font-mono text-[11px] tracking-wide text-dim"
            title="Areocentric solar longitude for the scrubbed date: NASA GISS Mars24"
          >
            Ls {ls.toFixed(1)}°
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {isLive
              ? "real orbital mechanics · Mars24"
              : `${earthDays >= 0 ? "+" : ""}${earthDays.toFixed(0)} Earth days`}
          </span>
        </div>
      </div>
    </section>
  );
}
