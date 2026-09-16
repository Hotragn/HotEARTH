"use client";

import { useMemo } from "react";
import { ArrowRight, X } from "@phosphor-icons/react";
import {
  APOPHIS_2029_NOTE,
  fmtKmFromAU,
  fmtLD,
  fmtVel,
  isApophisApproach,
  type CloseApproachData,
  type SmallBodyObject,
} from "@/lib/small-body-facts";

/**
 * The close-approaches panel: the real CNEOS close-approach list. A calm,
 * factual header (no alarm styling): object, date, distance in BOTH lunar
 * distances and km, and relative velocity. Apophis's 2029 pass is highlighted
 * with the exact factual framing (~31,600 km above the surface, naked-eye
 * visible, impact ruled out). Rows whose object is in the catalogue open its
 * detail. Nothing is sensationalised.
 */
export default function SmallBodyCloseApproaches({
  approaches,
  objects,
  onOpen,
  onClose,
}: {
  approaches: CloseApproachData[];
  objects: SmallBodyObject[];
  onOpen: (o: SmallBodyObject) => void;
  onClose: () => void;
}) {
  const byDesignation = useMemo(() => {
    const map = new Map<string, SmallBodyObject>();
    for (const o of objects) if (o.designation) map.set(o.designation, o);
    return map;
  }, [objects]);

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 top-[4.5rem] overflow-y-auto hud-scroll sm:top-20">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-2 sm:px-6 sm:pt-4">
        <header className="flex items-start justify-between gap-3 animate-hud-in">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-faint">
              JPL CNEOS · measured & predicted
            </p>
            <h1 className="mt-2 font-display text-2xl font-medium text-ice sm:text-3xl">
              Upcoming close approaches
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">
              The closest sizeable Earth approaches in the catalogue window, in
              chronological order. Distances are real numbers from NASA/JPL CNEOS:
              stated plainly, neither amplified nor downplayed. A lunar distance
              (LD) is the Earth–Moon distance, ~384,400 km.
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

        {approaches.length === 0 ? (
          <div className="mx-auto mt-16 max-w-md rounded-2xl border border-line bg-white/[0.02] p-6 text-center">
            <p className="text-sm text-ice">No close-approach data</p>
            <p className="mt-2 text-[12px] leading-relaxed text-dim">
              The close-approach list could not be loaded. Nothing is invented in
              its place.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-2.5">
            {approaches.map((ca, i) => {
              const obj = ca.designation
                ? byDesignation.get(ca.designation)
                : undefined;
              return (
                <ApproachRow
                  key={`${ca.designation}-${i}`}
                  ca={ca}
                  object={obj}
                  onOpen={obj ? () => onOpen(obj) : undefined}
                />
              );
            })}
          </div>
        )}

        <p className="mt-8 border-t border-line pt-4 font-mono text-[10px] leading-relaxed text-faint">
          Close approaches: NASA/JPL CNEOS Close-Approach Data. Nominal geocentric
          distances (Earth centre). US-Government data, freely usable.
        </p>
      </div>
    </div>
  );
}

function ApproachRow({
  ca,
  object,
  onOpen,
}: {
  ca: CloseApproachData;
  object?: SmallBodyObject;
  onOpen?: () => void;
}) {
  const apophis = isApophisApproach(ca);
  const clickable = !!onOpen;

  const body = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ice">{ca.object}</p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">{ca.date}</p>
        </div>
        <div className="text-right">
          <p
            className="font-display text-lg font-medium tabular-nums"
            style={{ color: apophis ? "#f2a63b" : "#edf0f5" }}
          >
            {fmtLD(ca.dist_ld)}
          </p>
          <p className="font-mono text-[10px] text-faint">
            {fmtKmFromAU(ca.dist_au)} · {fmtVel(ca.v_rel_kms)}
          </p>
        </div>
      </div>
      {apophis && (
        <p className="mt-2 border-t border-solar/20 pt-2 text-[11px] leading-relaxed text-dim">
          {APOPHIS_2029_NOTE}
        </p>
      )}
      {clickable && (
        <span className="mt-2 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
          Open detail
          <ArrowRight size={11} weight="bold" aria-hidden />
        </span>
      )}
    </>
  );

  const className = `w-full rounded-2xl px-4 py-3 text-left ${
    apophis
      ? "border border-solar/40 bg-solar/[0.06]"
      : "border border-line bg-white/[0.02]"
  } ${clickable ? "cursor-pointer transition-colors duration-200 hover:border-white/15 hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70" : ""}`;

  if (clickable) {
    return (
      <button type="button" onClick={onOpen} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}
