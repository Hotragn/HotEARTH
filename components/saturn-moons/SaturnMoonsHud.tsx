"use client";

import { useMemo, useState } from "react";
import { Crosshair } from "@phosphor-icons/react";
import { saturnMoonsState, type SaturnMoonPosition } from "@/lib/saturn-moons";
import { equatorialToHorizontal } from "@/lib/celestial";
import {
  MOON_COLORS,
  MOON_DESIGNATION,
  PHENOMENON_ORDER,
  PHENOMENON_META,
  compass16,
  ringFace,
  type Observer,
} from "./saturnUi";

interface SaturnMoonsHudProps {
  /** displayed instant (ms), throttled from the parent clock */
  displayedMs: number;
  isLive: boolean;
  observer: Observer;
  onObserverChange: (o: Observer) => void;
}

/**
 * Left HUD (below the ring/seasonality headline panel). Everything here is
 * COMPUTED from lib/saturn-moons at the displayed instant: Saturn's distance and
 * apparent diameter, the ring opening B and which face we see, each moon's
 * apparent elongation and current phenomenon, the seasonal reason the events list
 * is usually short, the accuracy bound (Iapetus least accurate), and whether
 * Saturn is above the viewer's horizon. Every physics/celestial call is guarded
 * against null (the lib returns null on bad input, never throws).
 */
export default function SaturnMoonsHud({
  displayedMs,
  isLive,
  observer,
  onObserverChange,
}: SaturnMoonsHudProps) {
  const date = useMemo(() => new Date(displayedMs), [displayedMs]);
  const state = useMemo(() => saturnMoonsState(date), [date]);

  const horizontal = useMemo(() => {
    if (!state) return null;
    return equatorialToHorizontal(
      state.saturn.raDeg,
      state.saturn.decDeg,
      observer.lat,
      observer.lon,
      date
    );
  }, [state, observer.lat, observer.lon, date]);

  const timeLabel = date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const face = state ? ringFace(state.ring.ringTiltBDeg) : "edge-on";

  return (
    <div className="hud-panel rounded-2xl p-4">
      {/* identity */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Saturn system
          </p>
          <h1 className="mt-1 font-display text-lg font-medium leading-tight text-ice">
            Saturn&apos;s Moons
          </h1>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            Computed · Kepler (JPL SAT441) + Meeus Ch. 45
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
          {/* Saturn geocentric */}
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line pt-3">
            <Stat
              label="Distance"
              value={`${state.saturn.distanceAU.toFixed(2)} AU`}
              title="Earth-Saturn distance for the displayed instant (computed, planetary theory)."
            />
            <Stat
              label="Apparent size"
              value={`${state.saturn.angularDiameterArcsec.toFixed(1)}″`}
              title="Saturn's apparent equatorial diameter in arcseconds (2·atan(Req/Δ)). Rings span wider."
            />
            <Stat
              label="Ring opening B"
              value={`${state.ring.ringTiltBDeg >= 0 ? "+" : ""}${state.ring.ringTiltBDeg.toFixed(1)}°`}
              title="Saturnicentric latitude of the Earth: how far the rings are opened toward us. See the ring panel above."
            />
            <Stat
              label="Face seen"
              value={face === "edge-on" ? "edge-on" : `${face}`}
              title="Which ring face is tilted toward Earth (sign of B). North for B > 0, south for B < 0."
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
              Elongation is the moon&apos;s apparent offset from Saturn&apos;s
              centre in Saturn radii (R), W = west, E = east.
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
                For Saturn that is usual: these cluster near a ring-plane crossing
                (see the season note above).
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
                          {MOON_DESIGNATION[e.moon]} {e.moon}
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
              Why a shadow is offset from its moon
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              A moon (Earth&apos;s line of sight) and its shadow (the Sun&apos;s)
              fall on slightly different spots because the Sun and Earth see Saturn
              from a small phase angle apart (at most about 6°, less than
              Jupiter&apos;s because Saturn is farther).
            </p>
          </div>

          {/* accuracy honesty */}
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Accuracy
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
              Moon positions are Kepler propagation of real JPL mean elements: good
              to a fraction of a Saturn radius near J2000, degrading over years as
              un-modeled precession accumulates. Not observing-grade timing.{" "}
              <span className="text-ice">Iapetus is the least accurate</span> (large,
              tilted, precessing orbit). Cross-check IMCCE PHESAT or JPL Horizons.
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
  );
}

function MoonRow({ p }: { p: SaturnMoonPosition }) {
  const side = p.x >= 0 ? "W" : "E";
  const elongation = Math.hypot(p.x, p.y);
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
        {MOON_DESIGNATION[p.moon]} {p.moon}
      </span>
      <span className="font-mono text-[10px] text-dim">
        {elongation.toFixed(1)} R {side}
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
            Saturn is{" "}
            <span className="text-ice">{horizontal.altitude.toFixed(0)}°</span>{" "}
            above the horizon in the{" "}
            <span className="text-ice">{compass16(horizontal.azimuth)}</span>{" "}
            (az {horizontal.azimuth.toFixed(0)}°). Observable now, sky darkness
            permitting.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-dim">
            Saturn is below your horizon right now (
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
