"use client";

import { ListBullets, Meteor } from "@phosphor-icons/react";
import {
  ASTEROID_COLOR,
  COMET_COLOR,
  EARTH_REF_COLOR,
  FILTERS,
  OPEN_ORBIT_COLOR,
  PHA_COLOR,
  type CatalogStats,
  type FilterId,
} from "@/lib/small-body-facts";

/**
 * Orbit-view side panel: the identity + honest framing for the inner-Solar-System
 * orbit view, a compact stat row, the filter chips (which also filter which
 * orbits are drawn), a legend for the orbit types, and launchers for the object
 * browser and the close-approaches panel. Every honesty caveat is stated: the
 * radial scale is compressed, while the angular position and the live, propagated
 * heliocentric position (from JPL elements at epoch) are both real.
 */
export default function SmallBodyOverview({
  stats,
  filter,
  onFilter,
  onOpenBrowser,
  onOpenApproaches,
  closeApproachCount,
  omittedCount,
}: {
  stats: CatalogStats;
  filter: FilterId;
  onFilter: (f: FilterId) => void;
  onOpenBrowser: () => void;
  onOpenApproaches: () => void;
  closeApproachCount: number;
  omittedCount: number;
}) {
  return (
    <section
      aria-label="Comets & asteroids overview"
      className="pointer-events-auto absolute left-3 top-20 w-[290px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-13rem)] overflow-y-auto rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Solar System · inner-system orbits
        </p>
        <p className="mt-1.5 text-sm text-ice">Comets & near-Earth asteroids</p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          Real orbits from the JPL Small-Body Database, drawn around the Sun with
          the planet orbits (Mercury→Jupiter) for reference. Bound bodies trace{" "}
          <span className="text-ice">closed ellipses</span>; the hyperbolic and
          interstellar visitors trace{" "}
          <span style={{ color: OPEN_ORBIT_COLOR }}>open arcs</span>. Press play to
          watch each body ride its orbit at the correct relative speed; click any
          marker to open its record.
        </p>

        {/* stat row */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label="Objects" value={stats.objects} />
          <MiniStat label="PHAs" value={stats.pha} accent={PHA_COLOR} />
          <MiniStat label="Visited" value={stats.visited} accent={COMET_COLOR} />
          <MiniStat label="Interstellar" value={stats.interstellar} accent={OPEN_ORBIT_COLOR} />
        </div>

        {/* filter chips */}
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
            Show
          </p>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`cursor-pointer rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors duration-200 ${
                  filter === f.id ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* legend */}
        <div className="mt-3 space-y-1.5 border-t border-line pt-3">
          <LegendRow color={EARTH_REF_COLOR} label="Planet reference orbits (Earth highlighted)" line />
          <LegendRow color={COMET_COLOR} label="Comet, closed ellipse + illustrative tail" line />
          <LegendRow color={ASTEROID_COLOR} label="Asteroid, closed ellipse" line />
          <LegendRow color={OPEN_ORBIT_COLOR} label="Unbound / interstellar, open arc" line />
          <LegendRow color={PHA_COLOR} label="Potentially Hazardous, amber ring" />
        </div>

        {/* launchers */}
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={onOpenBrowser}
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-[11px] text-dim transition-colors duration-200 hover:border-solar/40 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <span className="flex items-center gap-2">
              <ListBullets size={14} weight="bold" aria-hidden />
              Browse all {stats.objects} objects
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenApproaches}
            className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-[11px] text-dim transition-colors duration-200 hover:border-solar/40 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <span className="flex items-center gap-2">
              <Meteor size={14} weight="bold" aria-hidden />
              Close approaches ({closeApproachCount})
            </span>
          </button>
        </div>

        {/* honesty note */}
        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          Each body rides its real orbit at a live, propagated position (JPL
          elements at epoch); angular positions are real heliocentric longitudes and
          only the radial distance is log-compressed (aphelia reach tens–thousands of
          AU){omittedCount > 0 ? `; ${omittedCount} orbit(s) could not be drawn` : ""}.
          Comet tails are illustrative.
        </p>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-white/[0.02] px-3 py-2">
      <p
        className="font-display text-lg font-medium tabular-nums"
        style={{ color: accent ?? "#edf0f5" }}
      >
        {value.toLocaleString()}
      </p>
      <p className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
    </div>
  );
}

function LegendRow({
  color,
  label,
  line,
}: {
  color: string;
  label: string;
  line?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {line ? (
        <span
          aria-hidden
          className="h-[2px] w-4 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full border"
          style={{ borderColor: color }}
        />
      )}
      <span className="text-[10px] leading-snug text-dim">{label}</span>
    </div>
  );
}
