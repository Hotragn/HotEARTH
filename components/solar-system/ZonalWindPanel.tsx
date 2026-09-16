"use client";

import { useEffect, useState } from "react";
import {
  PLANET_FACTS,
  ZONAL_WINDS_PATH,
  parseZonalWinds,
  type DetailPlanetName,
  type ZonalProfile,
} from "@/lib/planet-facts";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; profile: ZonalProfile; units: string; convention: string };

/**
 * Right-side dynamic-layer panel.
 *  - Jupiter / Saturn / Neptune: plots the MEASURED zonal-wind profile (wind vs
 *    latitude) from public/data/planets/zonal_winds.json, with its source.
 *    Loaded DEFENSIVELY (the file is written concurrently): if it is absent or
 *    malformed the panel shows an honest "awaiting data" note, never crashes.
 *  - Venus; shows the measured cloud-top super-rotation card (no external file).
 *  - Mercury / Uranus: nothing to plot, panel is omitted.
 */
export default function ZonalWindPanel({ name }: { name: DetailPlanetName }) {
  const facts = PLANET_FACTS[name];
  const [state, setState] = useState<LoadState>({ status: "idle" });

  useEffect(() => {
    if (!facts.hasZonalProfile) {
      setState({ status: "idle" });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(ZONAL_WINDS_PATH, { signal: controller.signal });
        if (!res.ok) throw new Error(`responded ${res.status}`);
        const parsed = parseZonalWinds(await res.json());
        if (cancelled) return;
        const body = parsed?.bodies[name];
        if (!parsed || !body) {
          setState({ status: "unavailable", reason: "no profile for this body" });
          return;
        }
        setState({
          status: "ready",
          profile: body,
          units: parsed.meta.units,
          convention: parsed.meta.convention,
        });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setState({
          status: "unavailable",
          reason: err instanceof Error ? err.message : "not found",
        });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [name, facts.hasZonalProfile]);

  // Venus super-rotation card
  if (facts.superRotation) {
    const sr = facts.superRotation;
    return (
      <Panel title="Cloud-top super-rotation">
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-medium" style={{ color: facts.accent }}>
            ~{sr.cloudTopWindMs} m/s
          </span>
          <span className="font-mono text-[11px] text-dim">retrograde</span>
        </div>
        <p className="mt-1 text-xs text-dim">
          Cloud tops lap Venus in <span className="text-ice">~{sr.cloudTopPeriodDays} Earth days</span>{" "}
          vs the <span className="text-ice">{sr.bodyRotationDays}-day</span> solid-body rotation.
        </p>
        <p className="mt-2 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-faint">
          {sr.note}
        </p>
      </Panel>
    );
  }

  if (!facts.hasZonalProfile) return null;

  return (
    <Panel title="Measured zonal winds">
      {state.status === "loading" && (
        <p className="mt-2 font-mono text-[11px] text-dim">Loading…</p>
      )}
      {state.status === "unavailable" && (
        <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
          Data unavailable ({state.reason}). Awaiting{" "}
          <span className="text-dim">{ZONAL_WINDS_PATH}</span> from the planetary
          data pipeline.
        </p>
      )}
      {state.status === "ready" && (
        <WindChart
          accent={facts.accent}
          profile={state.profile}
          units={state.units}
          convention={state.convention}
        />
      )}
      <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-faint">
        Measured / climatological averages: not a forecast.
      </p>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      aria-label={title}
      className="pointer-events-auto absolute right-3 top-20 w-[268px] animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          {title}
        </p>
        {children}
      </div>
    </section>
  );
}

const W = 236;
const H = 150;
const PAD = 8;

/**
 * Wind-vs-latitude plot: latitude on the vertical axis (+90°N top → −90°S
 * bottom), zonal wind on the horizontal axis with a zero line. Auto-scaled
 * symmetrically about zero from the data. Marks the peak jet.
 */
function WindChart({
  accent,
  profile,
  units,
  convention,
}: {
  accent: string;
  profile: ZonalProfile;
  units: string;
  convention: string;
}) {
  const pts = [...profile.profile].sort((a, b) => a[0] - b[0]);
  const winds = pts.map((p) => p[1]);
  const maxAbs = Math.max(60, ...winds.map((w) => Math.abs(w)));

  const x = (w: number) => PAD + ((w + maxAbs) / (2 * maxAbs)) * (W - 2 * PAD);
  const y = (lat: number) => PAD + ((90 - lat) / 180) * (H - 2 * PAD);

  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p[1]).toFixed(1)},${y(p[0]).toFixed(1)}`)
    .join(" ");

  const peak = pts.reduce((m, p) => (Math.abs(p[1]) > Math.abs(m[1]) ? p : m), pts[0]);

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full"
        role="img"
        aria-label="Zonal wind speed versus latitude"
      >
        {/* zero-wind vertical line */}
        <line x1={x(0)} y1={PAD} x2={x(0)} y2={H - PAD} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
        {/* equator */}
        <line x1={PAD} y1={y(0)} x2={W - PAD} y2={y(0)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        {/* latitude gridlines */}
        {[60, 30, -30, -60].map((lat) => (
          <line key={lat} x1={PAD} y1={y(lat)} x2={W - PAD} y2={y(lat)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        <path d={path} fill="none" stroke={accent} strokeWidth={1.6} strokeLinejoin="round" />
        <circle cx={x(peak[1])} cy={y(peak[0])} r={2.8} fill={accent} />
      </svg>

      <div className="mt-0.5 flex justify-between font-mono text-[8px] uppercase tracking-wider text-faint">
        <span>← west</span>
        <span>0</span>
        <span>east →</span>
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-dim">
        Peak <span style={{ color: accent }}>{peak[1].toFixed(0)} {units}</span> @ {Math.abs(peak[0]).toFixed(0)}°{peak[0] >= 0 ? "N" : "S"}
      </p>
      <p className="mt-1 font-mono text-[9px] leading-snug text-faint">
        {convention}. Source: {profile.source}
      </p>
    </>
  );
}
