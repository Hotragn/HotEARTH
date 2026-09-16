"use client";

import { PLANETS, planetState } from "@/lib/planets";
import type { DetailPlanetName } from "@/lib/planet-facts";

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;

interface PlanetTimeControlProps {
  name: DetailPlanetName;
  /** Earth-day offset from now, 0 = live; scrubs across one full orbit */
  offsetDays: number;
  onChange: (days: number) => void;
  nowMs: number;
}

/**
 * Season/terminator time machine for a detail globe: scrub across one full
 * orbital period and watch the sub-solar latitude (season) advance, the honest
 * slow signal, most dramatic on Uranus (~42-yr seasons). Mirrors MarsTimeControl.
 * The globe reads the same offset via a ref per-frame, so this owns only the HUD
 * readouts. The season PHASE is an adopted reference (see lib/planets), so it is
 * labelled "modelled season", not a calendar date.
 */
export default function PlanetTimeControl({
  name,
  offsetDays,
  onChange,
  nowMs,
}: PlanetTimeControlProps) {
  const periodDays = PLANETS[name].physical.orbitalPeriodYears * YEAR_DAYS;
  const step = Math.max(1, Math.round(periodDays / 2000));
  const isLive = offsetDays === 0;
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const st = planetState(name, date);
  const years = offsetDays / YEAR_DAYS;
  const subLat = `${Math.abs(st.subsolar.lat).toFixed(1)}°${st.subsolar.lat >= 0 ? "N" : "S"}`;

  return (
    <section
      aria-label={`${name} season control`}
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
              Scrub forward across one full orbit ({PLANETS[name].physical.orbitalPeriodYears.toFixed(1)} years)
            </span>
            <input
              type="range"
              min={0}
              max={Math.round(periodDays)}
              step={step}
              value={Math.min(offsetDays, Math.round(periodDays))}
              onChange={(e) => onChange(Number(e.target.value))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[86px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isLive ? "text-faint" : "text-solar"
            }`}
          >
            {isLive ? "NOW" : `+${years.toFixed(years < 1 ? 2 : 1)} yr`}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span className="font-mono text-[11px] tracking-wide text-dim" title="Modelled season (adopted reference), not a calendar date">
            {st.season} · subsolar {subLat}
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-faint">
            {isLive ? "real orbital mechanics · JPL" : "modelled season"}
          </span>
        </div>
      </div>
    </section>
  );
}
