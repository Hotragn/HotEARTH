"use client";

import { useMemo } from "react";
import type { WaterLevelSample } from "@/lib/tides";
import { GAUGE_COLOR, THEORY_COLOR, fmtMetres } from "./tidesUi";

/**
 * The whole tab, in one chart: a real tide gauge and Newton's equilibrium tide,
 * drawn on the same time axis.
 *
 * Both traces are plotted about THEIR OWN MEAN, and each gets its own vertical
 * scale, which needs saying rather than hiding. The gauge is measured against a
 * local tidal datum and the theory is a displacement about zero, so their
 * absolute levels are not comparable and never were. What IS comparable is the
 * shape and the timing, and that is the point: the two curves keep step while
 * differing in size by a factor of several.
 *
 * Normalising to a shared scale would have been the flattering choice. It would
 * also have hidden the one number this tab exists to show.
 */

const VB_W = 1000;
const VB_H = 300;
const PAD_L = 54;
const PAD_R = 54;
const PAD_T = 20;
const PAD_B = 44;

interface Point {
  time: Date;
  heightM: number;
}

function statsOf(points: ReadonlyArray<Point>) {
  let lo = Infinity;
  let hi = -Infinity;
  let sum = 0;
  let n = 0;
  for (const p of points) {
    if (!Number.isFinite(p.heightM)) continue;
    if (p.heightM < lo) lo = p.heightM;
    if (p.heightM > hi) hi = p.heightM;
    sum += p.heightM;
    n++;
  }
  if (n === 0) return null;
  return { lo, hi, mean: sum / n, range: hi - lo };
}

export default function TideChart({
  gauge,
  theory,
  stationName,
}: {
  gauge: WaterLevelSample[];
  theory: Array<{ time: Date; heightM: number }>;
  stationName: string;
}) {
  const gaugeStats = useMemo(() => statsOf(gauge), [gauge]);
  const theoryStats = useMemo(() => statsOf(theory), [theory]);

  if (!gaugeStats || !theoryStats || gauge.length < 3 || theory.length < 3) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[11px] text-dim">
          Not enough gauge data to compare against. The chart needs a real
          measurement to be worth drawing.
        </p>
      </section>
    );
  }

  // Shared time axis: whatever both series cover.
  const startMs = Math.max(gauge[0].time.getTime(), theory[0].time.getTime());
  const endMs = Math.min(
    gauge[gauge.length - 1].time.getTime(),
    theory[theory.length - 1].time.getTime()
  );
  const span = Math.max(1, endMs - startMs);
  const x = (ms: number) => PAD_L + ((ms - startMs) / span) * (VB_W - PAD_L - PAD_R);

  /** Each series is drawn about its own mean, on its own half-amplitude. */
  const makeY = (s: NonNullable<ReturnType<typeof statsOf>>) => {
    const half = Math.max(1e-6, s.range / 2) * 1.15;
    return (h: number) => {
      const t = (h - s.mean) / half; // -1 .. 1
      const mid = (PAD_T + (VB_H - PAD_B)) / 2;
      return mid - t * ((VB_H - PAD_T - PAD_B) / 2);
    };
  };
  const yGauge = makeY(gaugeStats);
  const yTheory = makeY(theoryStats);

  const path = (
    points: ReadonlyArray<Point>,
    y: (h: number) => number
  ): string =>
    points
      .filter((p) => p.time.getTime() >= startMs && p.time.getTime() <= endMs)
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${x(p.time.getTime()).toFixed(1)},${y(p.heightM).toFixed(1)}`
      )
      .join(" ");

  // Midnight ticks across the window.
  const dayTicks = useMemo(() => {
    const ticks: Array<{ ms: number; label: string }> = [];
    const d = new Date(startMs);
    d.setUTCHours(0, 0, 0, 0);
    for (let ms = d.getTime(); ms <= endMs; ms += 86_400_000) {
      if (ms < startMs) continue;
      ticks.push({
        ms,
        label: new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" }),
      });
    }
    return ticks;
  }, [startMs, endMs]);

  return (
    <section className="hud-panel rounded-2xl p-4">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          The theory, and the sea
        </h2>
        <p className="font-mono text-[11px] text-dim">
          <span style={{ color: GAUGE_COLOR }}>measured {fmtMetres(gaugeStats.range)}</span>
          {" · "}
          <span style={{ color: THEORY_COLOR }}>theory {fmtMetres(theoryStats.range)}</span>
        </p>
      </div>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[640px] sm:min-w-0"
          role="img"
          aria-label={`Tide at ${stationName}. The measured gauge range is ${gaugeStats.range.toFixed(2)} metres and the equilibrium theory predicts ${theoryStats.range.toFixed(2)} metres, plotted on separate scales about their own means so the timing can be compared.`}
        >
          {/* day gridlines */}
          {dayTicks.map((t) => (
            <g key={t.ms}>
              <line
                x1={x(t.ms)}
                y1={PAD_T}
                x2={x(t.ms)}
                y2={VB_H - PAD_B}
                stroke="rgba(255,255,255,0.07)"
              />
              <text
                x={x(t.ms)}
                y={VB_H - PAD_B + 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.38)"
                fontSize={11}
                fontFamily="ui-monospace, monospace"
              >
                {t.label}
              </text>
            </g>
          ))}

          {/* each series' own mean line */}
          <line
            x1={PAD_L}
            y1={(PAD_T + (VB_H - PAD_B)) / 2}
            x2={VB_W - PAD_R}
            y2={(PAD_T + (VB_H - PAD_B)) / 2}
            stroke="rgba(255,255,255,0.12)"
            strokeDasharray="4 5"
          />

          {/* the theory */}
          <path
            d={path(theory, yTheory)}
            fill="none"
            stroke={THEORY_COLOR}
            strokeWidth={1.6}
            strokeOpacity={0.9}
          />
          {/* the sea */}
          <path
            d={path(gauge, yGauge)}
            fill="none"
            stroke={GAUGE_COLOR}
            strokeWidth={2}
          />

          {/* axis labels: two scales, said out loud */}
          <text
            x={PAD_L - 8}
            y={PAD_T + 10}
            textAnchor="end"
            fill={GAUGE_COLOR}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
          >
            {(gaugeStats.range / 2).toFixed(1)}m
          </text>
          <text
            x={PAD_L - 8}
            y={VB_H - PAD_B - 2}
            textAnchor="end"
            fill={GAUGE_COLOR}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
          >
            -{(gaugeStats.range / 2).toFixed(1)}m
          </text>
          <text
            x={VB_W - PAD_R + 8}
            y={PAD_T + 10}
            fill={THEORY_COLOR}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
          >
            {(theoryStats.range / 2).toFixed(2)}m
          </text>
          <text
            x={VB_W - PAD_R + 8}
            y={VB_H - PAD_B - 2}
            fill={THEORY_COLOR}
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
          >
            -{(theoryStats.range / 2).toFixed(2)}m
          </text>
        </svg>
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
        <span style={{ color: GAUGE_COLOR }}>Blue</span> is the measured water
        level at {stationName}.{" "}
        <span style={{ color: THEORY_COLOR }}>Orange</span> is the equilibrium
        tide computed here from the real Moon and Sun positions.{" "}
        <span className="text-ice">
          The two traces are on DIFFERENT vertical scales, marked on each side.
        </span>{" "}
        They have to be: the gauge is measured against a local datum and the
        theory is a displacement about zero, and their ranges differ by a factor
        of several. Compare the timing and the shape, which is what the theory
        gets right.
      </p>
    </section>
  );
}
