"use client";

import {
  dayLengthDays,
  isRetrograde,
  moonSubSolarPoint,
  type MoonName,
} from "@/lib/moons";

const DAY_MS = 86_400_000;

interface MoonTimeControlProps {
  name: MoonName;
  /** Earth-day offset from now, 0 = live; scrubs across one full orbit */
  offsetDays: number;
  onChange: (days: number) => void;
  nowMs: number;
}

/**
 * Orbit/terminator time machine for a detail globe: scrub across one full
 * orbital period and watch the sub-solar longitude sweep the surface, the
 * honest, computed signal for a tidally-locked moon (retrograde Triton sweeps
 * the other way). Mirrors PlanetTimeControl. The globe reads the same offset via
 * a ref per-frame, so this owns only the HUD readouts. The absolute phase is an
 * adopted J2000 convention (see lib/moons), so the sweep RATE + DIRECTION are
 * physical while the label stays a relative "+N d", not a calendar date.
 */
export default function MoonTimeControl({
  name,
  offsetDays,
  onChange,
  nowMs,
}: MoonTimeControlProps) {
  const periodDays = dayLengthDays(name);
  const step = Math.max(0.01, periodDays / 400);
  const isLive = offsetDays === 0;
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const sub = moonSubSolarPoint(name, date);
  const subLon = `${Math.abs(sub.lon).toFixed(0)}°${sub.lon >= 0 ? "E" : "W"}`;
  const retro = isRetrograde(name);

  return (
    <section
      aria-label={`${name} orbit control`}
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
              Scrub forward across one full orbit ({periodDays.toFixed(2)} Earth
              days)
            </span>
            <input
              type="range"
              min={0}
              max={periodDays}
              step={step}
              value={Math.min(offsetDays, periodDays)}
              onChange={(e) => onChange(Number(e.target.value))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[78px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isLive ? "text-faint" : "text-solar"
            }`}
          >
            {isLive ? "NOW" : `+${offsetDays.toFixed(2)} d`}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span
            className="font-mono text-[11px] tracking-wide text-dim"
            title="Live sub-solar longitude: sweeps once per orbit (tidal lock)"
          >
            sub-solar {subLon}
            {retro ? " · retrograde sweep" : ""}
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            {isLive ? "live · tidally locked" : "one orbit = one solar day"}
          </span>
        </div>
      </div>
    </section>
  );
}
