"use client";

import { useMemo, useState } from "react";
import { Crosshair } from "@phosphor-icons/react";
import { jupiterMoonsState, type GalileanPosition } from "@/lib/jupiter-moons";
import { equatorialToHorizontal } from "@/lib/celestial";
import {
  MOON_COLORS,
  MOON_ROMAN,
  PHENOMENON_ORDER,
  PHENOMENON_META,
  compass16,
  type Observer,
} from "./galileanUi";

interface JupiterMoonsHudProps {
  /** displayed instant (ms), throttled from the parent clock */
  displayedMs: number;
  isLive: boolean;
  observer: Observer;
  onObserverChange: (o: Observer) => void;
}

/**
 * Left HUD. Everything here is COMPUTED from lib/jupiter-moons (Meeus Ch. 44) at
 * the displayed instant: Jupiter's distance and apparent diameter, each moon's
 * apparent elongation and current phenomenon, the honest reason a shadow is
 * offset from its moon, and whether Jupiter is above the viewer's horizon.
 */
export default function JupiterMoonsHud({
  displayedMs,
  isLive,
  observer,
  onObserverChange,
}: JupiterMoonsHudProps) {
  const date = useMemo(() => new Date(displayedMs), [displayedMs]);
  const state = useMemo(() => jupiterMoonsState(date), [date]);

  const horizontal = useMemo(() => {
    if (!state) return null;
    return equatorialToHorizontal(
      state.jupiter.raDeg,
      state.jupiter.decDeg,
      observer.lat,
      observer.lon,
      date
    );
  }, [state, observer.lat, observer.lon, date]);

  const timeLabel = date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      aria-label="Jupiter and Galilean moon state"
      className="hud-scroll pointer-events-auto absolute left-3 top-20 z-10 max-h-[calc(100dvh-11rem)] w-[300px] overflow-y-auto animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        {/* identity */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Galilean events
            </p>
            <h1 className="mt-1 font-display text-lg font-medium leading-tight text-ice">
              Jupiter&apos;s Moons
            </h1>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              Computed · Meeus Ch. 44
            </p>
          </div>
          <span className="mt-1 flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${
                isLive ? "bg-solar animate-pulse-dot" : "bg-white/30"
              }`}
            />
            <span
              className={`font-mono text-[9px] uppercase tracking-[0.18em] ${
                isLive ? "text-solar" : "text-faint"
              }`}
            >
              {isLive ? "live" : "scrubbed"}
            </span>
          </span>
        </div>
        <p className="mt-1 font-mono text-[10px] text-dim">{timeLabel}</p>

        {!state ? (
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-faint">
            Positions unavailable for this instant.
          </p>
        ) : (
          <>
            {/* Jupiter geocentric */}
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line pt-3">
              <Stat
                label="Distance"
                value={`${state.jupiter.distanceAU.toFixed(2)} AU`}
                title="Earth-Jupiter distance for the displayed instant (computed, planetary theory)."
              />
              <Stat
                label="Apparent size"
                value={`${state.jupiter.angularDiameterArcsec.toFixed(1)}″`}
                title="Jupiter's apparent equatorial diameter in arcseconds (2·atan(Req/Δ))."
              />
            </div>

            {/* per-moon apparent state */}
            <div className="mt-3 border-t border-line pt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                Moons now (apparent elongation)
              </p>
              <ul className="mt-2 space-y-1.5">
                {state.positions.map((p) => (
                  <MoonRow key={p.moon} p={p} />
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-relaxed text-faint">
                Elongation is the moon&apos;s offset from Jupiter&apos;s centre in
                Jupiter radii (Rj), W = west, E = east.
              </p>
            </div>

            {/* current phenomena summary */}
            <div className="mt-3 border-t border-line pt-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                Happening now
              </p>
              {state.current.length === 0 ? (
                <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
                  No transit, shadow transit, occultation or eclipse in progress.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {PHENOMENON_ORDER.flatMap((type) =>
                    state.current
                      .filter((e) => e.type === type)
                      .map((e) => (
                        <li
                          key={`${e.moon}-${e.type}`}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: MOON_COLORS[e.moon] }}
                          />
                          <span className="text-ice">
                            {MOON_ROMAN[e.moon]} {e.moon}
                          </span>
                          <span
                            className="ml-auto font-mono text-[10px]"
                            style={{ color: PHENOMENON_META[type].accent }}
                          >
                            {PHENOMENON_META[type].label}
                          </span>
                        </li>
                      ))
                  )}
                </ul>
              )}
            </div>

            {/* shadow-vs-moon offset explainer */}
            <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                Why the shadow is offset
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
                A moon (Earth&apos;s line of sight) and its shadow (the Sun&apos;s)
                fall on different spots because the Sun and Earth see Jupiter from
                slightly different directions. The gap is near zero at opposition
                and widest near quadrature (Sun-Jupiter-Earth phase angle, up to
                ~12°).
              </p>
            </div>

            {/* observer visibility */}
            <ObserverVisibility
              observer={observer}
              onObserverChange={onObserverChange}
              horizontal={horizontal}
            />
          </>
        )}
      </div>
    </section>
  );
}

function MoonRow({ p }: { p: GalileanPosition }) {
  const side = p.x >= 0 ? "W" : "E";
  const tag = p.inTransit
    ? "in transit"
    : p.inShadowTransit
      ? "shadow transit"
      : p.inOccultation
        ? "occulted"
        : p.inEclipse
          ? "eclipsed"
          : p.frontOfDisk
            ? "in front"
            : "behind";
  const tagColor = p.inShadowTransit
    ? "text-solar"
    : p.inTransit || p.inOccultation || p.inEclipse
      ? "text-ice"
      : "text-faint";
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: MOON_COLORS[p.moon] }}
      />
      <span className="text-ice">
        {MOON_ROMAN[p.moon]} {p.moon}
      </span>
      <span className="font-mono text-[10px] text-dim">
        {Math.abs(p.x).toFixed(1)} Rj {side}
      </span>
      <span className={`ml-auto font-mono text-[9px] ${tagColor}`}>{tag}</span>
    </li>
  );
}

// ───────────────────────────── observer section ────────────────────────────

function ObserverVisibility({
  observer,
  onObserverChange,
  horizontal,
}: {
  observer: Observer;
  onObserverChange: (o: Observer) => void;
  horizontal: { altitude: number; azimuth: number } | null;
}) {
  const [geoError, setGeoError] = useState<string | null>(null);

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

  const above = horizontal !== null && horizontal.altitude > 0;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          From your location
        </p>
        <button
          type="button"
          onClick={useMyLocation}
          title="Use my device location (optional; never required)"
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-black/20 px-2 py-1 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <Crosshair size={12} weight="light" aria-hidden />
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
        <span className="ml-auto truncate font-mono text-[9px] text-faint">
          {observer.label}
        </span>
      </div>

      {geoError && (
        <p className="mt-1.5 font-mono text-[10px] text-solar">
          {geoError}: using {observer.label}.
        </p>
      )}

      <div className="mt-2 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
        {horizontal === null ? (
          <p className="text-[11px] text-faint">Visibility unavailable.</p>
        ) : above ? (
          <p className="text-[11px] leading-relaxed text-dim">
            Jupiter is{" "}
            <span className="text-ice">{horizontal.altitude.toFixed(0)}°</span>{" "}
            above the horizon in the{" "}
            <span className="text-ice">{compass16(horizontal.azimuth)}</span>{" "}
            (az {horizontal.azimuth.toFixed(0)}°). Observable now, sky darkness
            permitting.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-dim">
            Jupiter is below your horizon right now (
            {horizontal.altitude.toFixed(0)}°), not observable from{" "}
            {observer.label} until it rises.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────── small parts ───────────────────────────────

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
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12.5px] tracking-wide text-dim">
        {value}
      </p>
    </div>
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
