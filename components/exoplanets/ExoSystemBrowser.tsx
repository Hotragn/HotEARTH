"use client";

import { useMemo, useState } from "react";
import { ArrowRight, MagnifyingGlass, Planet, Star } from "@phosphor-icons/react";
import {
  EXO_ACCENT,
  HZ_GREEN,
  SORT_MODES,
  catalogTotals,
  displayName,
  filterSystems,
  fmtLy,
  sortSystems,
  systemDerived,
  type ExoCatalog,
  type ExoSystemData,
  type SortMode,
} from "@/lib/exo-facts";

/**
 * The default Exoplanets view: a fast, DOM-only browser over the real catalogue.
 * A headline stat row (systems · planets · planets in the habitable zone), a
 * free-text filter, sort chips (Notable / Nearest / Most planets / Name) and a
 * responsive grid of system cards. Every "in habitable zone" figure is COMPUTED
 * via the Kopparapu (2013) model using the LINEAR luminosity (converted from the
 * archive's log10 value inside systemDerived). Clicking a card opens its 3D
 * architecture view. Degrades to a labelled empty state if the file is missing.
 */
export default function ExoSystemBrowser({
  catalog,
  loaded,
  onOpenSystem,
}: {
  catalog: ExoCatalog | null;
  loaded: boolean;
  onOpenSystem: (hostname: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("notable");

  const systems = catalog?.systems ?? [];
  const totals = useMemo(() => catalogTotals(systems), [systems]);
  const shown = useMemo(
    () => sortSystems(filterSystems(systems, query), sort),
    [systems, query, sort]
  );

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 top-[4.5rem] overflow-y-auto hud-scroll sm:top-20">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6 sm:pt-4">
        {/* header */}
        <header className="animate-hud-in">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
            Beyond · Systems around other stars
          </p>
          <h1 className="mt-2 font-display text-2xl font-medium text-ice sm:text-3xl">
            Exoplanet systems
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
            Real, measured systems from the{" "}
            <span className="text-ice">NASA Exoplanet Archive</span>. Distances
            and star types are measured; the count of planets in the{" "}
            <span style={{ color: HZ_GREEN }}>habitable zone</span> is computed
            (Kopparapu 2013). No exoplanet has been imaged in surface detail:
            appearances are illustrative. Open a system to see its architecture.
          </p>
        </header>

        {/* stat row */}
        <div className="mt-5 grid grid-cols-3 gap-3 animate-hud-in sm:max-w-lg">
          <StatTile label="Systems" value={totals.systems} />
          <StatTile label="Planets" value={totals.planets} />
          <StatTile
            label="In habitable zone"
            value={totals.inHZ}
            accent={HZ_GREEN}
          />
        </div>

        {/* controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="hud-panel flex items-center gap-2 rounded-full px-4 py-2 sm:w-72">
            <MagnifyingGlass size={15} weight="light" aria-hidden className="text-faint" />
            <span className="sr-only">Search systems</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search TRAPPIST, Proxima, Kepler…"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-sm text-ice placeholder:text-faint focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1">
            {SORT_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSort(m.id)}
                aria-pressed={sort === m.id}
                className={`cursor-pointer rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 ${
                  sort === m.id
                    ? "bg-white/10 text-ice"
                    : "text-faint hover:text-dim"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* list / states */}
        {!loaded ? (
          <p className="mt-16 text-center font-mono text-xs uppercase tracking-[0.18em] text-faint">
            Loading catalogue…
          </p>
        ) : systems.length === 0 ? (
          <EmptyState />
        ) : shown.length === 0 ? (
          <p className="mt-16 text-center text-sm text-dim">
            No systems match “{query.trim()}”.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((system) => (
              <SystemCard
                key={system.hostname}
                system={system}
                onOpen={() => onOpenSystem(system.hostname)}
              />
            ))}
          </div>
        )}

        <p className="mt-8 border-t border-line pt-4 font-mono text-[10px] leading-relaxed text-faint">
          Data: NASA Exoplanet Archive (Caltech/IPAC), Planetary Systems
          Composite Parameters. Habitable zones computed (Kopparapu et al. 2013).
        </p>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="hud-panel rounded-2xl px-4 py-3">
      <p
        className="font-display text-2xl font-medium tabular-nums"
        style={{ color: accent ?? "#edf0f5" }}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
        {label}
      </p>
    </div>
  );
}

function SystemCard({
  system,
  onOpen,
}: {
  system: ExoSystemData;
  onOpen: () => void;
}) {
  const d = systemDerived(system);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-line bg-white/[0.02] p-4 text-left transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ice">{displayName(system)}</p>
          {system.common_name && (
            <p className="truncate font-mono text-[10px] text-faint">{system.hostname}</p>
          )}
        </div>
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: EXO_ACCENT }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-dim">
        <span className="inline-flex items-center gap-1">
          <Star size={11} weight="fill" aria-hidden className="text-faint" />
          {d.starType}
        </span>
        <span className="text-faint">{fmtLy(d.distanceLy)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Pill icon={<Planet size={11} weight="fill" aria-hidden />}>
          {d.planetCount} planet{d.planetCount === 1 ? "" : "s"}
        </Pill>
        {d.hzCount > 0 && (
          <span
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
            style={{
              borderColor: `${HZ_GREEN}66`,
              backgroundColor: `${HZ_GREEN}14`,
              color: HZ_GREEN,
            }}
          >
            {d.hzCount} in HZ
          </span>
        )}
        {d.hasImaged && (
          <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-faint">
            imaged
          </span>
        )}
      </div>

      {system.note && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-dim/90">
          {system.note}
        </p>
      )}

      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint transition-colors duration-200 group-hover:text-ice">
        Architecture
        <ArrowRight
          size={12}
          weight="bold"
          aria-hidden
          className="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </span>
    </button>
  );
}

function Pill({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-dim">
      {icon}
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white/[0.02] p-6 text-center">
      <p className="text-sm text-ice">Catalogue unavailable</p>
      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        The exoplanet catalogue could not be loaded. Nothing is invented in its
        place: this view stays empty until the data is present.
      </p>
    </div>
  );
}
