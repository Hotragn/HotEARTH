"use client";

import { CONSTELLATION_CULTURAL_NOTE } from "@/lib/star-facts";
import type { LayerState, ViewMode } from "./constants";

/**
 * Sky-layer + view-mode controls. The mode segmented control switches between the
 * equatorial free-look sky and the "sky from your location" horizon view; the
 * toggles add/remove the constellation figures (labelled a cultural overlay),
 * their names, the Milky Way backdrop, the Messier deep-sky markers and the
 * reference grid. Mirrors the LayerSwitcher idiom used by the globe tabs.
 */
export default function LayerToggles({
  mode,
  onModeChange,
  layers,
  onToggleLayer,
}: {
  mode: ViewMode;
  onModeChange: (m: ViewMode) => void;
  layers: LayerState;
  onToggleLayer: (key: keyof LayerState) => void;
}) {
  return (
    <section
      aria-label="Sky layers"
      className="pointer-events-auto absolute inset-x-3 bottom-24 animate-hud-in sm:inset-x-auto sm:bottom-auto sm:left-5 sm:top-24 sm:w-60"
    >
      <div className="hud-panel rounded-2xl p-2">
        {/* mode segmented control */}
        <div
          role="radiogroup"
          aria-label="View mode"
          className="mb-1.5 flex gap-1 rounded-xl bg-black/20 p-1"
        >
          <ModeButton
            active={mode === "sky"}
            onClick={() => onModeChange("sky")}
            title="The whole J2000 celestial sphere: look anywhere. North celestial pole up."
          >
            Sky
          </ModeButton>
          <ModeButton
            active={mode === "local"}
            onClick={() => onModeChange("local")}
            title="What is actually above your chosen location right now, from real local-sidereal-time geometry. Stars below the horizon are hidden."
          >
            My location
          </ModeButton>
        </div>

        <p className="hidden px-1.5 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-faint sm:block">
          Layers
        </p>

        <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          <Toggle
            on={layers.constellationLines}
            onClick={() => onToggleLayer("constellationLines")}
            label="Constellations"
            title={CONSTELLATION_CULTURAL_NOTE}
          />
          <Toggle
            on={layers.constellationNames}
            onClick={() => onToggleLayer("constellationNames")}
            label="Names"
            title="Constellation name labels."
          />
          <Toggle
            on={layers.milkyWay}
            onClick={() => onToggleLayer("milkyWay")}
            label="Milky Way"
            title="ESO/S. Brunier panorama, rotated from galactic into the equatorial frame to register with the stars."
          />
          <Toggle
            on={layers.messier}
            onClick={() => onToggleLayer("messier")}
            label="Deep sky"
            title="Messier objects (OpenNGC), coloured by type: galaxy / nebula / cluster."
          />
          <Toggle
            on={layers.grid}
            onClick={() => onToggleLayer("grid")}
            label="Grid"
            title="Celestial equator + ecliptic reference circles (computed)."
          />
        </div>

        <p className="hidden border-t border-line px-1.5 pb-0.5 pt-2 font-mono text-[9px] leading-relaxed text-faint sm:block">
          Stars are real measured data. Constellation lines are a human construct
          (modern IAU).
        </p>
      </div>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      title={title}
      onClick={onClick}
      className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-center text-[11px] font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
        active ? "bg-white/12 text-ice" : "text-dim hover:bg-white/5 hover:text-ice"
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onClick,
  label,
  title,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  title: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={title}
      onClick={onClick}
      className={`group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 sm:w-full ${
        on ? "bg-white/10 text-ice" : "text-dim hover:bg-white/5 hover:text-ice"
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
          on ? "bg-solar animate-pulse-dot" : "bg-white/20 group-hover:bg-white/40"
        }`}
      />
      <span className="whitespace-nowrap font-medium sm:whitespace-normal">
        {label}
      </span>
    </button>
  );
}
