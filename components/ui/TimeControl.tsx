"use client";

import { useEffect, useState } from "react";
import { subsolarPoint } from "@/lib/solar";

interface TimeControlProps {
  /** hours relative to now, -24..+24; 0 = live */
  offsetHours: number;
  onChange: (hours: number) => void;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatOffset(hours: number): string {
  const sign = hours >= 0 ? "+" : "−";
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `T${sign}${pad(h)}:${pad(m)}`;
}

/**
 * Terminator time machine: live solar time plus a ±24h scrubber.
 * The globe reads the offset via a ref per-frame; this component only owns
 * the HUD readouts (1Hz tick: no per-frame React work).
 */
export default function TimeControl({ offsetHours, onChange }: TimeControlProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLive = offsetHours === 0;
  const simDate = new Date(nowMs + offsetHours * 3_600_000);
  const sub = subsolarPoint(simDate);
  const clock = `${pad(simDate.getUTCHours())}:${pad(simDate.getUTCMinutes())}:${pad(
    simDate.getUTCSeconds()
  )} UTC`;

  return (
    <section
      aria-label="Time control"
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
            Live
          </button>

          <label className="flex min-w-0 grow items-center gap-3">
            <span className="sr-only">
              Scrub the sun position up to 24 hours forward or back
            </span>
            <input
              type="range"
              min={-24}
              max={24}
              step={0.25}
              value={offsetHours}
              onChange={(e) => onChange(Number(e.target.value))}
              className="time-scrubber w-full min-w-0"
            />
          </label>

          <span
            className={`w-[74px] shrink-0 text-right font-mono text-[11px] tracking-wide ${
              isLive ? "text-faint" : "text-solar"
            }`}
          >
            {isLive ? "LIVE" : formatOffset(offsetHours)}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
          <span className="font-mono text-[11px] tracking-wide text-dim">
            {clock}
          </span>
          <span
            className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-faint"
            title="The point on Earth where the sun is directly overhead right now: computed with the NOAA solar position algorithm"
          >
            Subsolar {Math.abs(sub.lat).toFixed(1)}°{sub.lat >= 0 ? "N" : "S"}{" "}
            {Math.abs(sub.lon).toFixed(1)}°{sub.lon >= 0 ? "E" : "W"}
          </span>
        </div>
      </div>
    </section>
  );
}
