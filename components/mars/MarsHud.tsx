"use client";

import { formatMTC, marsClock } from "@/lib/mars-time";

const SOL_MS = 88_775_244;

/**
 * Top-left honest readout: Ls + season, Mars Sol Date, Coordinated Mars Time,
 * subsolar point, and a dust-storm-season indicator. Everything traces to the
 * Mars24 algorithm (lib/mars-time). Labeled as real orbital mechanics.
 *
 * Driven by `nowMs` + `offsetSols` from the parent's 1Hz tick: no per-frame
 * React work (the globe reads the same offset via a ref).
 */
export default function MarsHud({
  nowMs,
  offsetSols,
}: {
  nowMs: number;
  offsetSols: number;
}) {
  const date = new Date(nowMs + offsetSols * SOL_MS);
  const c = marsClock(date);

  const subLat = `${Math.abs(c.subsolar.lat).toFixed(1)}°${c.subsolar.lat >= 0 ? "N" : "S"}`;
  const subLon = `${Math.abs(c.subsolar.lon).toFixed(1)}°${c.subsolar.lon >= 0 ? "E" : "W"}`;

  return (
    <section
      aria-label="Mars orbital state"
      className="pointer-events-auto absolute left-3 top-20 w-[248px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Areocentric season
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-medium text-ice">
            Ls {c.ls.toFixed(1)}°
          </span>
        </div>
        <p className="mt-0.5 text-sm text-[#e2703a]">{c.season}</p>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat label="Mars Sol Date" value={c.msd.toFixed(2)} />
          <Stat label="Mars Time" value={formatMTC(c.mtc)} />
          <Stat label="Subsolar lat" value={subLat} title="Solar declination, subsolar latitude" />
          <Stat label="Subsolar lon" value={subLon} />
        </div>

        {/* dust-storm-season indicator, climatological season, not a forecast */}
        <div
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2"
          title="Climatological dust-storm season (Ls 180–360, peak ~240–300). This is the season storms historically cluster in, NOT a prediction of a specific storm."
        >
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-full"
            style={{
              backgroundColor: c.dust.active ? "#e2703a" : "rgba(255,255,255,0.22)",
              boxShadow: c.dust.peak ? "0 0 0 4px rgba(226,112,58,0.18)" : "none",
            }}
          />
          <div className="min-w-0">
            <p className="truncate text-xs text-ice">{c.dust.label}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
              climatology · not a forecast
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[13px] tracking-wide text-dim">
        {value}
      </p>
    </div>
  );
}
