"use client";

import {
  SUN_CHANNELS,
  manifestObservationTimes,
  type SunChannel,
  type SunManifest,
} from "@/lib/sun-facts";

interface SunWavelengthSwitcherProps {
  active: string;
  onSelect: (id: string) => void;
  channel: SunChannel;
  manifest: SunManifest | null;
}

/** "Sat, 18 Jul 2026 21:12:06 GMT" → "2026-07-18 21:12 UTC" (raw on failure). */
function fmtObs(raw: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/**
 * SDO wavelength layer switcher, mirrors Earth's GIBS LayerSwitcher: a
 * radiogroup of the six committed channels as a bottom-centered filmstrip, with
 * an honest caption (what the active channel shows, its temperature, the real
 * observation timestamp, and the "full-disk snapshot, not a map" note).
 */
export default function SunWavelengthSwitcher({
  active,
  onSelect,
  channel,
  manifest,
}: SunWavelengthSwitcherProps) {
  const obsTimes = manifestObservationTimes(manifest);
  const obs = fmtObs(obsTimes[channel.id] ?? null);

  return (
    <section
      aria-label="SDO wavelength"
      className="pointer-events-auto absolute inset-x-3 bottom-6 animate-hud-in sm:inset-x-auto sm:left-1/2 sm:w-[560px] sm:-translate-x-1/2"
    >
      <div className="hud-panel rounded-2xl p-2">
        <div
          role="radiogroup"
          aria-label="SDO wavelength / imager"
          className="flex gap-1 overflow-x-auto"
        >
          {SUN_CHANNELS.map((c) => {
            const isActive = active === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                title={`${c.shows} · ${c.temp}`}
                onClick={() => onSelect(c.id)}
                className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                  isActive ? "bg-white/10 text-ice" : "text-dim hover:bg-white/5 hover:text-ice"
                }`}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200"
                  style={{
                    backgroundColor: isActive ? c.glow : "rgba(255,255,255,0.2)",
                  }}
                />
                <span className="whitespace-nowrap font-medium">{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* honest caption for the active channel */}
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line px-1.5 pt-2">
          <p className="text-[11px] leading-snug text-dim">
            <span className="text-ice">{channel.shows}</span>
            <span className="text-faint"> · {channel.temp}</span>
          </p>
          <p className="font-mono text-[9px] leading-snug tracking-wide text-faint">
            {obs ? `Observed ${obs}` : "NASA/SDO full-disk"} · snapshot, not a map
          </p>
        </div>
      </div>
    </section>
  );
}
