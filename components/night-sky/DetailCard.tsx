"use client";

import { X } from "@phosphor-icons/react";
import {
  bvToColor,
  bvToTemperatureK,
  fmtDistanceLy,
  fmtMag,
  fmtSpectralType,
  fmtTempK,
  messierLabel,
  messierStyle,
  starDesignation,
  type MessierObject,
  type Star,
} from "@/lib/star-facts";
import { NIGHT_SKY_ACCENT, type Selection } from "./constants";

/**
 * DOM detail card for the inspected object (a real star or a Messier deep-sky
 * object). Everything shown is MEASURED (position, magnitude, distance, spectral
 * type, deep-sky type) except the star's temperature + colour, which are COMPUTED
 * from the measured B-V index (Ballesteros 2012 + black-body colour) and labelled
 * as such. Missing values render honestly ("not measured" / "distance not
 * measured"), never a guess.
 */
export default function DetailCard({
  selection,
  conName,
  onClose,
}: {
  selection: Selection;
  conName: (abbr: string | null) => string;
  onClose: () => void;
}) {
  if (!selection) return null;

  return (
    <section
      aria-label="Object detail"
      className="pointer-events-auto absolute left-3 top-20 w-[300px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {selection.kind === "star" ? "Star" : "Deep-sky object"}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={13} weight="light" aria-hidden />
          </button>
        </div>

        {selection.kind === "star" ? (
          <StarBody star={selection.star} conName={conName} />
        ) : (
          <MessierBody obj={selection.obj} conName={conName} />
        )}
      </div>
    </section>
  );
}

function StarBody({
  star,
  conName,
}: {
  star: Star;
  conName: (abbr: string | null) => string;
}) {
  const designation = starDesignation(star);
  const tempK = bvToTemperatureK(star.ci);
  const colorHex = bvToColor(star.ci);
  const title = star.name ?? designation ?? (star.id >= 0 ? `HIP ${star.id}` : `HYG ${-star.id}`);

  return (
    <>
      <h2 className="font-display text-2xl font-medium" style={{ color: NIGHT_SKY_ACCENT }}>
        {title}
      </h2>
      <div className="mt-1 flex items-center gap-2">
        {designation && star.name && (
          <span className="font-mono text-xs text-dim">{designation}</span>
        )}
        <span className="font-mono text-[11px] text-faint">
          {conName(star.con)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
        <Stat label="Apparent magnitude" value={fmtMag(star.mag)} />
        <Stat label="Distance" value={fmtDistanceLy(star.distLy)} />
        <Stat label="Spectral type" value={fmtSpectralType(star.spect)} />
        <Stat
          label="Temperature"
          value={fmtTempK(tempK)}
          sub={tempK !== null ? "computed from B–V" : undefined}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-line pt-2.5">
        <span
          aria-hidden
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ backgroundColor: colorHex, boxShadow: `0 0 8px ${colorHex}` }}
        />
        <p className="font-mono text-[10px] leading-relaxed text-faint">
          Physical colour {colorHex}, computed from the measured B–V index, not a
          palette choice.
        </p>
      </div>

      <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
        Position, magnitude, colour, distance and spectral type are measured
        (HYG / Hipparcos, J2000). Proper motion + precession ignored for present-day
        display.
      </p>
    </>
  );
}

function MessierBody({
  obj,
  conName,
}: {
  obj: MessierObject;
  conName: (abbr: string | null) => string;
}) {
  const style = messierStyle(obj);
  const common = obj.name ? obj.name.split(",")[0] : null;

  return (
    <>
      <h2 className="font-display text-2xl font-medium" style={{ color: style.color }}>
        {messierLabel(obj)}
      </h2>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-dim">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: style.color }}
          />
          {style.label}
        </span>
        <span className="font-mono text-[11px] text-faint">{conName(obj.con)}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
        <Stat label="Type" value={obj.type} />
        <Stat label="Magnitude" value={fmtMag(obj.mag)} />
        <Stat label="NGC" value={obj.ngc != null ? `NGC ${obj.ngc}` : "–"} />
        {common && <Stat label="Common name" value={common} />}
      </div>

      {obj.note && (
        <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-dim">
          {obj.note}
        </p>
      )}

      <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
        Position, magnitude and type are measured catalogue values (OpenNGC,
        J2000). No distance is shipped: OpenNGC has no single reliable distance
        for every object, so we omit rather than guess.
      </p>
    </>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12px] tracking-wide text-dim">{value}</p>
      {sub && (
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint/80">
          {sub}
        </p>
      )}
    </div>
  );
}
