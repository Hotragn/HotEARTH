"use client";

import { useMemo } from "react";
import {
  populationAtYear as worldPopAtYear,
  formatPopulation,
  type PopulationSeries,
} from "@/lib/chrono-population";
import {
  activeEvents,
  type EventCatalog,
} from "@/lib/chrono-events";
import {
  climateAtYear,
  type ClimateSeries,
} from "@/lib/chrono-climate";
import {
  nearestPoleStar,
  precessionAngleDeg,
} from "@/lib/precession";
import { formatYear } from "@/lib/chrono-clock";
import type { LodLevel } from "./ChronoCanvas";

/**
 * Virtual Earth mission-control readout (top-left): world population counter,
 * active-event card, industrial-era climate, and the axial-precession sky
 * state, all driven by the parent's ~10Hz year tick (no per-frame React work).
 *
 * Everything here is REAL data (or interpolation of it). The honesty note in
 * the legend states exactly what is real vs. the artistic era scenes.
 */
export default function ChronoHud({
  year,
  lod,
  population,
  events,
  climate,
}: {
  year: number;
  lod: LodLevel;
  population: PopulationSeries;
  events: EventCatalog;
  climate: ClimateSeries;
}) {
  const worldPop = worldPopAtYear(population.points, year);
  const active = useMemo(
    () => activeEvents(events.events, year),
    [events.events, year]
  );
  const topEvent = active[0] ?? null;
  const clim = climateAtYear(climate.samples, year);
  const poleStar = nearestPoleStar(year);
  const precDeg = precessionAngleDeg(year);

  return (
    <section
      aria-label="Virtual Earth state"
      className="pointer-events-auto absolute left-3 top-20 w-[266px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        {/* world population */}
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          World population
        </p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-display text-2xl font-medium text-ice">
            {formatPopulation(worldPop)}
          </span>
          <span className="font-mono text-[10px] text-faint">approx</span>
        </div>

        {/* active event card */}
        <div className="mt-3 border-t border-line pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {active.length > 1 ? `${active.length} events now` : "On the timeline"}
          </p>
          {topEvent ? (
            <div className="mt-1.5">
              <p className="text-sm leading-snug text-[#b9a6ff]">
                {topEvent.name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] tracking-wide text-dim">
                {formatYear(topEvent.startYear)}
                {topEvent.endYear !== topEvent.startYear
                  ? ` – ${formatYear(topEvent.endYear)}`
                  : ""}
                {" · "}
                <span className="text-faint">{topEvent.category}</span>
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-sm text-faint">quiet year</p>
          )}
        </div>

        {/* industrial-era climate (only meaningful ≥1850) */}
        {clim.active && (
          <div className="mt-3 grid grid-cols-2 gap-x-3 border-t border-line pt-3">
            <Stat
              label="Temp anomaly"
              value={
                clim.tempAnomalyC !== null
                  ? `${clim.tempAnomalyC >= 0 ? "+" : ""}${clim.tempAnomalyC.toFixed(2)}°C`
                  : "–"
              }
              title="Global mean surface temperature vs 1850–1900 baseline"
            />
            <Stat
              label="CO₂"
              value={clim.co2ppm !== null ? `${Math.round(clim.co2ppm)} ppm` : "–"}
              title="Atmospheric CO₂ (ice core + Mauna Loa)"
            />
          </div>
        )}

        {/* precession sky state */}
        <div
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2"
          title="Axial precession: Earth's pole traces a circle among the stars once every ~25,772 years. Pole-star label is the nearest well-known star by epoch."
        >
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#5ad0c0]" />
          <div className="min-w-0">
            <p className="truncate text-xs text-ice">Pole star: {poleStar.star}</p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
              precession {precDeg >= 0 ? "+" : ""}
              {precDeg.toFixed(1)}° · real physics
            </p>
          </div>
        </div>

        {/* honesty note */}
        <p className="mt-3 border-t border-line pt-3 text-[10px] leading-relaxed text-faint">
          Real data: city growth, population, dated events, climate, and
          axial-precession sky. Era scenes are artistic interpretation.
        </p>
        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-faint/80">
          detail: {lod}
          {(population.usingFallback ||
            events.usingFallback ||
            climate.usingFallback) &&
            " · built-in sample data"}
        </p>
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
