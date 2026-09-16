"use client";

import { useEffect, useState } from "react";
import {
  SOLAR_CYCLE_PATH,
  monthToYear,
  parseSolarCycle,
  type SolarCycleData,
} from "@/lib/sun-facts";

type LoadState =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; data: SolarCycleData };

const W = 280;
const H = 122;
const PAD_L = 6;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 14;

const X_MIN = 2019.75;
const X_MAX = 2031;
const Y_MAX = 180;

/**
 * Solar Cycle 25 sunspot chart: the NOAA public-domain observed monthly count
 * (primary), its 13-month smoothing (the trend + the real peak), and SWPC's
 * predicted curve with its uncertainty band, observed and forecast kept
 * visually distinct. Honest note: Cycle 25 ran hotter than the 2019 panel
 * forecast (~115), peaking ~161 around 2024-10. Fetched defensively from the
 * committed JSON; tolerates absence.
 */
export default function SolarCycleChart() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(SOLAR_CYCLE_PATH, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`responded ${res.status}`);
        const parsed = parseSolarCycle(await res.json());
        if (cancelled) return;
        if (!parsed) {
          setState({ status: "unavailable", reason: "unrecognized shape" });
          return;
        }
        setState({ status: "ready", data: parsed });
      } catch (err) {
        if (cancelled || ctrl.signal.aborted) return;
        setState({
          status: "unavailable",
          reason: err instanceof Error ? err.message : "not found",
        });
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          Solar Cycle 25 · sunspot number
        </p>
      </div>
      {state.status === "loading" && (
        <p className="mt-2 font-mono text-[10px] text-dim">Loading…</p>
      )}
      {state.status === "unavailable" && (
        <p className="mt-2 font-mono text-[9px] leading-relaxed text-faint">
          Chart data unavailable ({state.reason}).
        </p>
      )}
      {state.status === "ready" && <Chart data={state.data} />}
    </div>
  );
}

const x = (year: number) =>
  PAD_L + ((year - X_MIN) / (X_MAX - X_MIN)) * (W - PAD_L - PAD_R);
const y = (ssn: number) =>
  PAD_T + (1 - Math.min(ssn, Y_MAX) / Y_MAX) * (H - PAD_T - PAD_B);

function linePath(
  points: { month: string; v: number | null }[],
): string {
  let d = "";
  let started = false;
  for (const p of points) {
    const yr = monthToYear(p.month);
    if (yr === null || p.v === null) {
      started = false; // break the line across gaps
      continue;
    }
    d += `${started ? "L" : "M"}${x(yr).toFixed(1)},${y(p.v).toFixed(1)} `;
    started = true;
  }
  return d.trim();
}

function Chart({ data }: { data: SolarCycleData }) {
  const now = new Date();
  const nowYear = now.getUTCFullYear() + (now.getUTCMonth() + now.getUTCDate() / 31) / 12;

  const observedPath = linePath(
    data.observed.map((o) => ({ month: o.month, v: o.ssn_swpc })),
  );
  const smoothedPath = linePath(
    data.observed.map((o) => ({ month: o.month, v: o.smoothed_ssn ?? null })),
  );
  const predictedPath = linePath(
    data.predicted.map((p) => ({ month: p.month, v: p.predicted_ssn })),
  );

  // predicted uncertainty band (high forward, low backward)
  const bandTop = data.predicted
    .map((p) => ({ yr: monthToYear(p.month), v: p.high_ssn }))
    .filter((p) => p.yr !== null && p.v !== null) as { yr: number; v: number }[];
  const bandBot = data.predicted
    .map((p) => ({ yr: monthToYear(p.month), v: p.low_ssn }))
    .filter((p) => p.yr !== null && p.v !== null) as { yr: number; v: number }[];
  let bandPath = "";
  if (bandTop.length > 1 && bandBot.length > 1) {
    bandPath =
      "M" +
      bandTop.map((p) => `${x(p.yr).toFixed(1)},${y(p.v).toFixed(1)}`).join(" L") +
      " L" +
      [...bandBot].reverse().map((p) => `${x(p.yr).toFixed(1)},${y(p.v).toFixed(1)}`).join(" L") +
      " Z";
  }

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-1.5 w-full"
        role="img"
        aria-label="Solar Cycle 25 sunspot number: observed monthly count, its smoothing, and the SWPC predicted curve with uncertainty band"
      >
        {/* y gridlines at 50/100/150 */}
        {[50, 100, 150].map((g) => (
          <g key={g}>
            <line
              x1={PAD_L}
              y1={y(g)}
              x2={W - PAD_R}
              y2={y(g)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text x={PAD_L + 1} y={y(g) - 1.5} fontSize={6} fill="#626a7a" fontFamily="monospace">
              {g}
            </text>
          </g>
        ))}
        {/* year gridlines */}
        {[2021, 2023, 2025, 2027, 2029].map((yr) => (
          <g key={yr}>
            <line
              x1={x(yr)}
              y1={PAD_T}
              x2={x(yr)}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
            <text
              x={x(yr)}
              y={H - PAD_B + 9}
              fontSize={6}
              fill="#626a7a"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {`'${String(yr).slice(2)}`}
            </text>
          </g>
        ))}

        {/* predicted uncertainty band (forecast) */}
        {bandPath && <path d={bandPath} fill="rgba(255,178,77,0.10)" stroke="none" />}

        {/* observed monthly (noisy, primary) */}
        <path d={observedPath} fill="none" stroke="#6b7486" strokeWidth={1} strokeLinejoin="round" />
        {/* smoothed trend */}
        <path d={smoothedPath} fill="none" stroke="#ffb24d" strokeWidth={1.6} strokeLinejoin="round" />
        {/* predicted (SWPC forecast): dashed */}
        <path
          d={predictedPath}
          fill="none"
          stroke="#ffb24d"
          strokeWidth={1.3}
          strokeDasharray="3 2.5"
          strokeLinejoin="round"
          opacity={0.85}
        />

        {/* observed peak ~161 @ 2024-10 */}
        <circle cx={x(2024.79)} cy={y(160.9)} r={2.2} fill="#ffd27a" />

        {/* now marker */}
        <line
          x1={x(nowYear)}
          y1={PAD_T}
          x2={x(nowYear)}
          y2={H - PAD_B}
          stroke="#edf0f5"
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.5}
        />
        <text
          x={x(nowYear) + 2}
          y={PAD_T + 6}
          fontSize={6}
          fill="#9aa2b1"
          fontFamily="monospace"
        >
          now
        </text>
      </svg>

      {/* legend */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[8px] uppercase tracking-wide text-faint">
        <span className="flex items-center gap-1">
          <span className="h-px w-3" style={{ background: "#6b7486" }} /> observed
        </span>
        <span className="flex items-center gap-1">
          <span className="h-[2px] w-3" style={{ background: "#ffb24d" }} /> smoothed
        </span>
        <span className="flex items-center gap-1">
          <span
            className="h-px w-3"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#ffb24d 0,#ffb24d 2px,transparent 2px,transparent 4px)",
            }}
          />{" "}
          SWPC forecast
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[8.5px] leading-relaxed text-faint">
        Observed = NOAA public-domain monthly count. Cycle 25 ran hotter than the
        2019 panel forecast (~115), peaking ~161 around 2024-10; now declining.
      </p>
    </>
  );
}
