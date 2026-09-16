"use client";

import { useEffect, useState } from "react";
import {
  type DiurnalTemperature,
  MOON_DIURNAL_TEMP_PATH,
  curveForLatitude,
  loadDiurnalTemperature,
} from "@/lib/lunar-temperature";

/** Cool silver accent for the Moon. */
const MOON_ACCENT = "#c3c9d6";

type LoadState =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; data: DiurnalTemperature };

/**
 * The flagship honest Moon signal: the ~300 K day-night SURFACE-temperature
 * swing measured by LRO Diviner. Shows the measured equatorial extremes (~392 K
 * noon / ~95 K pre-dawn) and a temperature-vs-local-solar-time curve at the
 * equator (mirrors MarsClimatologyPanel).
 *
 * Loaded defensively from public/data/moon/diurnal_temperature.json: tolerates
 * absence and shows "data unavailable" rather than crashing. Honest label:
 * model anchored to Diviner measurements, NOT a live feed and NOT weather (the
 * Moon has no atmosphere).
 */
export default function MoonTemperaturePanel() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      const data = await loadDiurnalTemperature(controller.signal);
      if (cancelled || controller.signal.aborted) return;
      if (!data) {
        setState({ status: "unavailable", reason: "not found" });
        return;
      }
      setState({ status: "ready", data });
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <section
      aria-label="Moon surface temperature (LRO Diviner)"
      className="pointer-events-auto absolute right-3 top-20 w-[248px] animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Surface temperature
        </p>

        {state.status === "loading" && (
          <p className="mt-2 font-mono text-[11px] text-dim">Loading…</p>
        )}

        {state.status === "unavailable" && (
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
            Data unavailable ({state.reason}). Awaiting{" "}
            <span className="text-dim">{MOON_DIURNAL_TEMP_PATH}</span>.
          </p>
        )}

        {state.status === "ready" && <TempBody data={state.data} />}

        <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-faint">
          Model anchored to LRO Diviner measurements. Not a live feed. The Moon
          has no atmosphere: this is surface temperature, not weather.
        </p>
      </div>
    </section>
  );
}

const W = 216;
const H = 84;
const PAD = 6;

function TempBody({ data }: { data: DiurnalTemperature }) {
  const m = data.measured;

  return (
    <>
      {/* measured equatorial extremes (the honest headline numbers) */}
      <div className="mt-2 flex items-stretch gap-2">
        <Extreme
          label="Noon max"
          k={m.equatorNoonMaxK}
          c={m.equatorNoonMaxK - 273.15}
          tone="hot"
        />
        <Extreme
          label="Pre-dawn min"
          k={m.equatorPreDawnMinK}
          c={m.equatorPreDawnMinK - 273.15}
          tone="cold"
        />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-dim">
        ~{Math.round(m.equatorDiurnalChangeK)} K swing at the equator
        <span className="text-faint"> · measured (Diviner)</span>
      </p>

      <EquatorChart data={data} />

      <p className="mt-1.5 font-mono text-[9px] leading-snug text-faint">
        Polar cold traps: {m.polarPsrColdTrap} K, among the coldest measured
        places in the solar system.
      </p>
    </>
  );
}

function Extreme({
  label,
  k,
  c,
  tone,
}: {
  label: string;
  k: number;
  c: number;
  tone: "hot" | "cold";
}) {
  const color = tone === "hot" ? "#e2843a" : "#6fb7d6";
  return (
    <div className="flex-1 rounded-xl border border-line px-2.5 py-1.5">
      <p className="font-mono text-[8px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[15px] leading-tight" style={{ color }}>
        {Math.round(k)} K
      </p>
      <p className="font-mono text-[9px] text-faint">{Math.round(c)}°C</p>
    </div>
  );
}

/** Equatorial temperature vs local solar time (a fraction of the ~29.53-d lunar day). */
function EquatorChart({ data }: { data: DiurnalTemperature }) {
  const eq = curveForLatitude(data, 0);
  if (!eq || eq.points.length < 2) return null;

  const ts = eq.points.map((p) => p.tempK);
  const vMin = Math.min(...ts);
  const vMax = Math.max(...ts);
  const span = vMax - vMin || 1;

  const x = (lst: number) => PAD + (lst / 24) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - (v - vMin) / span) * (H - 2 * PAD);

  const path = eq.points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${x(p.lstHours).toFixed(1)},${y(p.tempK).toFixed(1)}`
    )
    .join(" ");

  return (
    <>
      <p className="mt-2 text-xs text-dim">Equator · temp vs local solar time</p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1.5 w-full"
        role="img"
        aria-label="Lunar equatorial surface temperature across one local solar day"
      >
        {/* sunrise / noon / sunset gridlines at LST 6 / 12 / 18 */}
        {[6, 12, 18].map((g) => (
          <line
            key={g}
            x1={x(g)}
            y1={PAD}
            x2={x(g)}
            y2={H - PAD}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke={MOON_ACCENT}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[8px] uppercase tracking-wider text-faint">
        <span>0h</span>
        <span>dawn</span>
        <span>noon</span>
        <span>dusk</span>
        <span>24h</span>
      </div>
    </>
  );
}
