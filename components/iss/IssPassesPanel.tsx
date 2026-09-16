"use client";

import { useState } from "react";
import { Crosshair, Eye, EyeSlash } from "@phosphor-icons/react";
import type { IssPass } from "@/lib/iss";
import { PRESET_CITIES, compass16, type Observer } from "@/lib/iss-facts";

/**
 * "Spot the Station": the headline feature. Pick an observing site (preset city,
 * typed lat/lon, or optional device geolocation) and see the next passes over the
 * coming days, each with a VISIBLE badge when it is a genuine naked-eye pass
 * (station sunlit while your sky is dark) versus a daytime / shadow pass that you
 * cannot see. All from lib/iss `nextPasses` (SGP4 look angles + the sunlit test).
 */
export default function IssPassesPanel({
  observer,
  onObserverChange,
  passes,
  computing,
  days,
}: {
  observer: Observer;
  onObserverChange: (o: Observer) => void;
  passes: IssPass[] | null;
  computing: boolean;
  days: number;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const presetLabel =
    PRESET_CITIES.find((c) => c.label === observer.label)?.label ?? "custom";

  const useMyLocation = () => {
    setGeoError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Geolocation not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        onObserverChange({
          label: "My location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          altitudeM: Number.isFinite(pos.coords.altitude ?? NaN)
            ? (pos.coords.altitude as number)
            : 0,
        }),
      () => setGeoError("Location permission denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  const visibleCount = passes?.filter((p) => p.visible).length ?? 0;

  return (
    <section
      aria-label="Visible ISS passes over your location"
      className="hud-scroll pointer-events-auto absolute right-3 top-20 z-10 max-h-[calc(100dvh-6.5rem)] w-[320px] overflow-y-auto animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-ice">Visible passes</h2>
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            next {days} days
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          When to look up. A pass is naked-eye visible when the station is sunlit and
          your sky is dark.
        </p>

        {/* observer controls */}
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="iss-city">
              Observing site
            </label>
            <select
              id="iss-city"
              value={presetLabel}
              onChange={(e) => {
                const city = PRESET_CITIES.find((c) => c.label === e.target.value);
                if (city) onObserverChange(city);
              }}
              className="cursor-pointer rounded-lg border border-line bg-black/30 px-2 py-1.5 font-mono text-[11px] text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
            >
              {presetLabel === "custom" && <option value="custom">Custom</option>}
              {PRESET_CITIES.map((c) => (
                <option key={c.label} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={useMyLocation}
              title="Use my device location (optional; never required)"
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
            >
              <Crosshair size={13} weight="light" aria-hidden />
              My location
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <NumField
              label="lat"
              value={observer.lat}
              min={-90}
              max={90}
              onCommit={(v) =>
                onObserverChange({
                  label: "Custom",
                  lat: v,
                  lon: observer.lon,
                  altitudeM: observer.altitudeM,
                })
              }
            />
            <NumField
              label="lon"
              value={observer.lon}
              min={-180}
              max={180}
              onCommit={(v) =>
                onObserverChange({
                  label: "Custom",
                  lat: observer.lat,
                  lon: v,
                  altitudeM: observer.altitudeM,
                })
              }
            />
            <span className="ml-auto font-mono text-[9px] text-faint">
              {observer.label}
            </span>
          </div>
          {geoError && (
            <p className="mt-1.5 font-mono text-[10px] text-solar">
              {geoError}: using the selected place.
            </p>
          )}
        </div>

        {/* passes list */}
        <div className="mt-3 border-t border-line pt-3">
          {computing ? (
            <p className="py-6 text-center font-mono text-[11px] text-faint">
              Computing passes…
            </p>
          ) : !passes || passes.length === 0 ? (
            <p className="py-6 text-center text-[11px] leading-relaxed text-faint">
              No passes above 10° in the next {days} days for this site.
            </p>
          ) : (
            <>
              <p className="mb-2 font-mono text-[10px] text-faint">
                {passes.length} pass{passes.length === 1 ? "" : "es"} · {visibleCount}{" "}
                naked-eye visible
              </p>
              <ul className="space-y-2">
                {passes.map((p, i) => (
                  <PassRow key={i} pass={p} />
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function PassRow({ pass }: { pass: IssPass }) {
  const day = pass.start.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const hhmm = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const mins = Math.floor(pass.durationSeconds / 60);
  const secs = Math.round(pass.durationSeconds % 60);

  return (
    <li
      className={`rounded-xl border px-3 py-2.5 ${
        pass.visible ? "border-solar/40 bg-solar/[0.06]" : "border-line bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] text-ice">{day}</span>
        {pass.visible ? (
          <span className="flex items-center gap-1 rounded-full bg-solar/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-solar">
            <Eye size={11} weight="fill" aria-hidden />
            visible
          </span>
        ) : (
          <span
            className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint"
            title={
              pass.satSunlit
                ? "Your sky is too bright (daytime / twilight)."
                : "The station is in Earth's shadow during this pass."
            }
          >
            <EyeSlash size={11} weight="fill" aria-hidden />
            {pass.satSunlit ? "daytime" : "shadow"}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-dim">
        <span>{hhmm(pass.start)}</span>
        <span className="text-faint">▸</span>
        <span className="text-ice">{hhmm(pass.maxElevationTime)}</span>
        <span className="text-faint">▸</span>
        <span>{hhmm(pass.end)}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px] text-faint">
        <span>
          max {pass.maxElevationDeg.toFixed(0)}° {compass16(pass.maxAzimuth)}
        </span>
        <span>
          {mins}m {secs}s
        </span>
        <span>
          {compass16(pass.startAzimuth)} → {compass16(pass.endAzimuth)}
        </span>
      </div>
    </li>
  );
}

function NumField({
  label,
  value,
  min,
  max,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? value.toFixed(2);
  return (
    <label className="flex items-center gap-1 font-mono text-[10px] text-faint">
      {label}
      <input
        type="number"
        value={shown}
        min={min}
        max={max}
        step={0.01}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text === null) return;
          const v = parseFloat(text);
          setText(null);
          if (Number.isFinite(v)) onCommit(Math.min(max, Math.max(min, v)));
        }}
        className="w-16 rounded-md border border-line bg-black/30 px-1.5 py-1 text-[11px] text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
      />
    </label>
  );
}
