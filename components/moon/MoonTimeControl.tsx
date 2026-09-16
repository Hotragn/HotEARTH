"use client";

import { SYNODIC_MONTH_DAYS, moonPhase } from "@/lib/lunar";

const DAY_MS = 86_400_000;

/** Cool silver accent for the Moon. */
const MOON_ACCENT = "#c3c9d6";

interface MoonTimeControlProps {
  /** days relative to now, 0 = live; scrub across one full synodic month */
  offsetDays: number;
  onChange: (days: number) => void;
  /** live wall-clock ms, ticked 1Hz by the parent */
  nowMs: number;
}

/**
 * Synodic-month time machine: scrub the terminator / phase across a full lunar
 * day-night cycle (~29.53 Earth days) and watch the illuminated fraction and
 * phase name advance. Mirrors MarsTimeControl / the Earth TimeControl visual
 * language; the globe reads the offset via a ref per-frame, so this component
 * only owns the HUD readouts.
 */
export default function MoonTimeControl({
  offsetDays,
  onChange,
  nowMs,
}: MoonTimeControlProps) {
  const isLive = offsetDays === 0;
  const simDate = new Date(nowMs + offsetDays * DAY_MS);
  const p = moonPhase(simDate);
  const illumPct = (p.illuminatedFraction * 100).toFixed(0);

  return (
    <section
      aria-label="Lunar month control"
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
                ? "bg-white/10 text-ice"
                : "bg-white/5 text-dim hover:bg-white/10 hover:text-ice"
            }`}
          >
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: isLive ? MOON_ACCENT : "rgba(255,255,255,0.3)",
              }}
            />
            Now
          </button>

          <label className="flex min-w-0 grow items-center gap-3">
            <span className="sr-only">
              Scrub forward across a full synodic month (29.53 days)
            </span>
            <input
              type="range"
              min={0}
              max={SYNODIC_MONTH_DAYS}
              step={0.1}
              value={offsetDays}
              onChange={(e) => onChange(Number(e.target.value))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className="w-[92px] shrink-0 text-right font-mono text-[11px] tracking-wide"
            style={{ color: isLive ? undefined : MOON_ACCENT }}
          >
            {isLive ? "NOW" : `+${offsetDays.toFixed(1)} d`}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span
            className="font-mono text-[11px] tracking-wide text-dim"
            title="Phase & illuminated fraction for the scrubbed date: computed, Meeus lunar theory"
          >
            {p.name} · {illumPct}%
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            {isLive
              ? "computed illumination · Meeus"
              : `lunar age ${p.ageDays.toFixed(1)} d`}
          </span>
        </div>
      </div>
    </section>
  );
}
