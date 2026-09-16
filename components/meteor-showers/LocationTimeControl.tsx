"use client";

import { useState } from "react";
import { Crosshair, Clock } from "@phosphor-icons/react";
import { fmtSolarLongitude, solarLongitudeDeg } from "@/lib/meteor-facts";
import { PRESET_CITIES, type Observer } from "./constants";

/**
 * Observer + time control. Pick a preset city, type a latitude/longitude, or
 * (optionally) use the browser geolocation: never required, and it fails
 * silently to the current preset. The time scrubs ±12 h around the moment you
 * opened the tab, with a "Now" reset. The observer + time drive the radiant
 * altitude, is-radiant-up test, observed-rate estimate and best viewing time in
 * the detail/tonight panels. The current solar longitude λ☉, the stable timing
 * coordinate for meteor peaks, is shown, because that (not the calendar date) is
 * what fixes where a shower is in its activity.
 */
export default function LocationTimeControl({
  observer,
  onObserverChange,
  offsetHours,
  onOffsetChange,
  onNow,
  date,
}: {
  observer: Observer;
  onObserverChange: (o: Observer) => void;
  offsetHours: number;
  onOffsetChange: (h: number) => void;
  onNow: () => void;
  date: Date;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);
  const solarLon = solarLongitudeDeg(date);
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
        }),
      () => setGeoError("Location permission denied"),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  };

  return (
    <section
      aria-label="Observer location and time"
      className="pointer-events-auto absolute inset-x-3 bottom-5 animate-hud-in sm:inset-x-0 sm:mx-auto sm:w-[460px]"
    >
      <div className="hud-panel rounded-2xl p-3">
        {/* location row */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="ms-city">
            Preset city
          </label>
          <select
            id="ms-city"
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

          <NumField
            label="lat"
            value={observer.lat}
            min={-90}
            max={90}
            onCommit={(v) =>
              onObserverChange({ label: "Custom", lat: v, lon: observer.lon })
            }
          />
          <NumField
            label="lon"
            value={observer.lon}
            min={-180}
            max={180}
            onCommit={(v) =>
              onObserverChange({ label: "Custom", lat: observer.lat, lon: v })
            }
          />

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

        {geoError && (
          <p className="mt-1.5 font-mono text-[10px] text-solar">
            {geoError}: using the selected place.
          </p>
        )}

        {/* time row */}
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onNow}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <Clock size={13} weight="light" aria-hidden />
            Now
          </button>
          <input
            type="range"
            min={-12}
            max={12}
            step={0.25}
            value={offsetHours}
            onChange={(e) => onOffsetChange(parseFloat(e.target.value))}
            aria-label="Scrub time (hours from now)"
            className="time-scrubber flex-1"
          />
        </div>

        <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-faint">
          <span>
            {date.toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {offsetHours !== 0 && (
              <span className="text-dim">
                {" "}
                ({offsetHours > 0 ? "+" : ""}
                {offsetHours.toFixed(2)} h)
              </span>
            )}
          </span>
          <span title="Solar longitude λ☉: the Sun's ecliptic longitude, the stable year-to-year coordinate meteor peaks are keyed to.">
            λ☉ {fmtSolarLongitude(solarLon)}
          </span>
        </div>
      </div>
    </section>
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
