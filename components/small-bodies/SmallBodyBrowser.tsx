"use client";

import { useMemo, useState } from "react";
import { ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  FILTERS,
  SMALL_BODY_ACCENT,
  catalogStats,
  classLabel,
  fmtDiameter,
  filterObjects,
  searchObjects,
  type FilterId,
  type SmallBodyObject,
} from "@/lib/small-body-facts";

/**
 * The object browser: a fast, DOM-only overlay over the 45 real bodies. A
 * headline stat row (objects · PHAs · visited · interstellar), a free-text
 * filter, the filter chips (All / Comets / Asteroids / Near-Earth / PHAs /
 * Visited / Interstellar) and a responsive grid of object cards. Clicking a card
 * opens that object's detail. Degrades to a labelled empty state if the
 * catalogue is missing. Filter changes are lifted so the orbit view stays in
 * sync with the chip selection.
 */
export default function SmallBodyBrowser({
  objects,
  loaded,
  filter,
  onFilter,
  onOpen,
  onClose,
}: {
  objects: SmallBodyObject[];
  loaded: boolean;
  filter: FilterId;
  onFilter: (f: FilterId) => void;
  onOpen: (o: SmallBodyObject) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const stats = useMemo(() => catalogStats(objects), [objects]);
  const shown = useMemo(
    () => searchObjects(filterObjects(objects, filter), query),
    [objects, filter, query]
  );

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 top-[4.5rem] overflow-y-auto hud-scroll sm:top-20">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-2 sm:px-6 sm:pt-4">
        {/* header */}
        <header className="flex items-start justify-between gap-3 animate-hud-in">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
              Solar System · Comets & near-Earth asteroids
            </p>
            <h1 className="mt-2 font-display text-2xl font-medium text-ice sm:text-3xl">
              Object browser
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
              Real objects from the{" "}
              <span className="text-ice">JPL Small-Body Database</span>. Orbits and
              parameters are measured; classification is computed. Most bodies have
              never been imaged: those appearances are illustrative. Open one for
              its full record, or return to the orbit view.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Back to orbit view"
            className="hud-panel flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={16} weight="light" aria-hidden />
          </button>
        </header>

        {/* stat row */}
        <div className="mt-5 grid grid-cols-2 gap-3 animate-hud-in sm:max-w-xl sm:grid-cols-4">
          <StatTile label="Objects" value={stats.objects} />
          <StatTile label="PHAs" value={stats.pha} accent="#f2a63b" />
          <StatTile label="Visited" value={stats.visited} accent={SMALL_BODY_ACCENT} />
          <StatTile label="Interstellar" value={stats.interstellar} accent="#c8a6ff" />
        </div>

        {/* controls */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="hud-panel flex items-center gap-2 rounded-full px-4 py-2 sm:w-72">
            <MagnifyingGlass size={15} weight="light" aria-hidden className="text-faint" />
            <span className="sr-only">Search objects</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Halley, Apophis, Bennu…"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent text-sm text-ice placeholder:text-faint focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`cursor-pointer rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors duration-200 ${
                  filter === f.id
                    ? "bg-white/10 text-ice"
                    : "text-faint hover:text-dim"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* list / states */}
        {!loaded ? (
          <p className="mt-16 text-center font-mono text-xs uppercase tracking-[0.18em] text-faint">
            Loading catalogue…
          </p>
        ) : objects.length === 0 ? (
          <EmptyState />
        ) : shown.length === 0 ? (
          <p className="mt-16 text-center text-sm text-dim">
            No objects match this filter{query.trim() ? ` and “${query.trim()}”` : ""}.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((o) => (
              <ObjectCard key={o.designation ?? o.name} object={o} onOpen={() => onOpen(o)} />
            ))}
          </div>
        )}

        <p className="mt-8 border-t border-line pt-4 font-mono text-[10px] leading-relaxed text-faint">
          Data: NASA/JPL Small-Body Database + CNEOS. US-Government data, freely
          usable; courtesy credit given.
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

function ObjectCard({
  object,
  onOpen,
}: {
  object: SmallBodyObject;
  onOpen: () => void;
}) {
  const color = object.interstellar
    ? "#c8a6ff"
    : object.kind === "comet"
      ? SMALL_BODY_ACCENT
      : "#c9a36b";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-line bg-white/[0.02] p-4 text-left transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ice">{object.name}</p>
          <p className="truncate font-mono text-[10px] text-faint">
            {object.kind === "comet" ? "Comet" : "Asteroid"} · {classLabel(object)}
          </p>
        </div>
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {object.pha && <Chip color="#f2a63b">PHA</Chip>}
        {object.neo && !object.pha && <Chip>Near-Earth</Chip>}
        {object.interstellar && <Chip color="#c8a6ff">interstellar</Chip>}
        {object.visited && <Chip color={SMALL_BODY_ACCENT}>visited</Chip>}
        <Chip>{fmtDiameter(object.physical.diameter_km)}</Chip>
      </div>

      {object.note && (
        <p className="mt-3 line-clamp-2 text-[11px] leading-relaxed text-dim/90">
          {object.note}
        </p>
      )}

      <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint transition-colors duration-200 group-hover:text-ice">
        Detail
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

function Chip({
  children,
  color,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  if (color) {
    return (
      <span
        className="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
        style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
      >
        {children}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-dim">
      {children}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white/[0.02] p-6 text-center">
      <p className="text-sm text-ice">Catalogue unavailable</p>
      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        The small-body catalogue could not be loaded. Nothing is invented in its
        place: this view stays empty until the data is present.
      </p>
    </div>
  );
}
