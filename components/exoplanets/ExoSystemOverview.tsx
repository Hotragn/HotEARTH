"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import {
  EXO_ACCENT,
  HZ_GREEN,
  displayName,
  fmtAU,
  fmtHZBand,
  fmtLy,
  fmtRadius,
  isInHabitableZone,
  type ExoSystemData,
  type SystemDerived,
} from "@/lib/exo-facts";

/**
 * Architecture-view HUD: system identity, the measured star facts, the computed
 * habitable-zone band, and a click-through planet list. Every "in HZ" mark is
 * computed with the LINEAR luminosity (derived.lumLinear). The honesty caveats,
 * illustrative appearances, and the illustrative absolute phase / compressed
 * radii from lib/systemLayout, are stated verbatim so nothing is mistaken for
 * an image or a true distance.
 */
export default function ExoSystemOverview({
  system,
  derived,
  onBack,
  onFocusPlanet,
  compareOn,
}: {
  system: ExoSystemData;
  derived: SystemDerived;
  onBack: () => void;
  onFocusPlanet: (name: string) => void;
  compareOn: boolean;
}) {
  const teff = system.star.teff;
  return (
    <section
      aria-label={`${displayName(system)} architecture`}
      className="pointer-events-auto absolute left-3 top-20 w-[300px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-13rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          All systems
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {system.hostname}
          </p>
          {derived.hasImaged && (
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-faint">
              directly imaged
            </span>
          )}
        </div>

        <h2 className="mt-1 font-display text-2xl font-medium" style={{ color: EXO_ACCENT }}>
          {displayName(system)}
        </h2>
        {system.note && (
          <p className="mt-1 text-xs leading-snug text-dim">{system.note}</p>
        )}

        {/* honesty banner */}
        <p className="mt-3 rounded-xl border border-solar/25 bg-solar/[0.06] px-3 py-2 text-[10px] leading-relaxed text-dim">
          Appearances are illustrative: no exoplanet has been imaged in surface
          detail. The substance here is measured parameters, real relative orbits
          and the computed habitable zone.
        </p>

        {/* star + system stats */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat label="Star" value={derived.starType} />
          <Stat label="Distance" value={fmtLy(derived.distanceLy)} />
          <Stat
            label="Star temp"
            value={teff != null ? `${Math.round(teff).toLocaleString()} K` : "not measured"}
          />
          <Stat label="Planets" value={String(derived.planetCount)} />
          <Stat
            label="In habitable zone"
            value={`${derived.hzCount}`}
            accent={derived.hzCount > 0 ? HZ_GREEN : undefined}
          />
          <Stat
            label="HZ (conservative)"
            value={fmtHZBand(derived.hz?.conservative ?? null)}
            title="Kopparapu et al. (2013): runaway greenhouse → maximum greenhouse. Computed from the star's luminosity + temperature."
          />
        </div>

        {/* HZ legend + compare hint */}
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          <LegendRow color={HZ_GREEN} label="Habitable zone (computed, Kopparapu 2013)" />
          <LegendRow
            color="#5aa9ff"
            label={
              compareOn
                ? "Solar System orbits overlaid (same compressed scale)"
                : "Toggle 'Compare' to overlay our Solar System's orbits"
            }
            dim={!compareOn}
          />
        </div>

        {/* planet list */}
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
            Planets · click to open
          </p>
          <ul className="space-y-1">
            {system.planets.map((p) => {
              const inHZ =
                isInHabitableZone(p.sma_au, derived.lumLinear, teff, {
                  conservative: true,
                }) === true;
              return (
                <li key={p.name}>
                  <button
                    type="button"
                    onClick={() => onFocusPlanet(p.name)}
                    className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-150 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: inHZ ? HZ_GREEN : "#6f76ff" }}
                      />
                      <span className="truncate text-[12px] text-ice">{p.name}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-[10px] text-faint">
                        {fmtAU(p.sma_au)}
                      </span>
                      <ArrowRight
                        size={11}
                        weight="bold"
                        aria-hidden
                        className="text-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                      />
                    </span>
                  </button>
                  <p className="pl-6 font-mono text-[9px] text-faint">
                    {fmtRadius(p.radius_re)}
                    {inHZ && (
                      <span style={{ color: HZ_GREEN }}> · in HZ</span>
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          Orbit order and relative speeds are real; radial distances are
          log-compressed and the absolute orbital phase is unknown (illustrative).
          Sizes are not to scale.
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  title,
  accent,
}: {
  label: string;
  value: string;
  title?: string;
  accent?: string;
}) {
  return (
    <div title={title}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-[12px] tracking-wide"
        style={{ color: accent ?? "#9aa2b1" }}
      >
        {value}
      </p>
    </div>
  );
}

function LegendRow({
  color,
  label,
  dim,
}: {
  color: string;
  label: string;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color, opacity: dim ? 0.5 : 1 }}
      />
      <span className={`text-[10px] leading-snug ${dim ? "text-faint" : "text-dim"}`}>
        {label}
      </span>
    </div>
  );
}
