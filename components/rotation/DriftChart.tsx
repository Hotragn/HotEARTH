"use client";

import { useMemo } from "react";
import type { LeapSecond, MonthlySeries } from "@/lib/rotation";
import { DRIFT_COLOR, LEAP_COLOR, yearOf } from "./rotationUi";

/**
 * The proof, drawn: accumulated drift against the leap seconds that cancel it.
 *
 * The smooth line is the running integral of the measured excess length of day,
 * in seconds. The staircase is the leap seconds actually inserted. They lie on
 * top of each other for fifty years, which is the whole argument of this tab
 * made visible: leap seconds are not a committee's whim, they are the integral
 * of a measurement, and the gap between the two curves at any moment is the
 * UT1-UTC offset standing that day.
 *
 * Nothing here is fitted. One curve comes from IERS daily measurements, the
 * other from the IERS leap second table, and they were computed independently.
 */

const VB_W = 1000;
const VB_H = 320;
const PAD_L = 52;
const PAD_R = 100;
const PAD_T = 18;
const PAD_B = 34;

export default function DriftChart({
  monthly,
  leapSeconds,
  from = "1972-01",
}: {
  monthly: MonthlySeries;
  leapSeconds: LeapSecond[];
  from?: string;
}) {
  const series = useMemo(() => {
    const pts: Array<{ t: number; drift: number }> = [];
    let total = 0;
    for (let i = 0; i < monthly.month.length; i++) {
      const m = monthly.month[i];
      if (m < from) continue;
      total += (monthly.lodMs[i] * monthly.days[i]) / 1000;
      pts.push({ t: yearOf(`${m}-15`), drift: total });
    }
    return pts;
  }, [monthly, from]);

  const steps = useMemo(() => {
    const base = leapSeconds.find((l) => l.date.slice(0, 7) >= from) ?? leapSeconds[0];
    if (!base) return [];
    const out: Array<{ t: number; total: number }> = [];
    let running = 0;
    for (let i = 1; i < leapSeconds.length; i++) {
      if (leapSeconds[i].date.slice(0, 7) < from) continue;
      running += leapSeconds[i].taiMinusUtc - leapSeconds[i - 1].taiMinusUtc;
      out.push({ t: yearOf(leapSeconds[i].date), total: running });
    }
    return out;
  }, [leapSeconds, from]);

  if (series.length < 12) return null;

  const t0 = series[0].t;
  const t1 = series[series.length - 1].t;
  const hi = Math.max(series[series.length - 1].drift, steps.length ? steps[steps.length - 1].total : 0) * 1.08;

  const x = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) => VB_H - PAD_B - (v / hi) * (VB_H - PAD_T - PAD_B);

  const driftPath = series
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.drift).toFixed(1)}`)
    .join(" ");

  // The staircase: hold, then step up at each leap second.
  const stairPath = (() => {
    if (steps.length === 0) return "";
    const parts = [`M${x(t0).toFixed(1)},${y(0).toFixed(1)}`];
    let prev = 0;
    for (const s of steps) {
      parts.push(`L${x(s.t).toFixed(1)},${y(prev).toFixed(1)}`);
      parts.push(`L${x(s.t).toFixed(1)},${y(s.total).toFixed(1)}`);
      prev = s.total;
    }
    parts.push(`L${x(t1).toFixed(1)},${y(prev).toFixed(1)}`);
    return parts.join(" ");
  })();

  const yTicks: number[] = [];
  for (let v = 0; v <= hi; v += 5) yTicks.push(v);
  const xTicks: number[] = [];
  for (let yr = Math.ceil(t0 / 10) * 10; yr <= t1; yr += 10) xTicks.push(yr);

  const finalDrift = series[series.length - 1].drift;
  const finalLeaps = steps.length ? steps[steps.length - 1].total : 0;
  // The window has to be stated. This chart runs to the last month in the record
  // while the panel beside it integrates whole years to 2025-12, so the two
  // leftovers differ, and an unlabelled "0.05 seconds apart" sitting next to an
  // unlabelled "-0.125 s" reads as two answers to one question.
  const lastMonth = monthly.month[monthly.month.length - 1];

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          The milliseconds add up, and the leap seconds take them away
        </h2>
        <p className="font-mono text-[10px] text-faint">
          seconds accumulated since {from.slice(0, 4)}
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`Accumulated clock drift from the measured length of day, about ${finalDrift.toFixed(
            1
          )} seconds since ${from.slice(
            0,
            4
          )}, drawn against the staircase of ${finalLeaps} leap seconds actually inserted. The two lie on top of each other.`}
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y(v)}
                x2={VB_W - PAD_R}
                y2={y(v)}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                x={PAD_L - 6}
                y={y(v) + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {v}
              </text>
            </g>
          ))}

          {xTicks.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={VB_H - PAD_B + 15}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={10.5}
              fontFamily="ui-monospace, monospace"
            >
              {yr}
            </text>
          ))}

          {stairPath && (
            <path d={stairPath} fill="none" stroke={LEAP_COLOR} strokeWidth={1.6} strokeOpacity={0.8} />
          )}
          <path d={driftPath} fill="none" stroke={DRIFT_COLOR} strokeWidth={2.2} />

          {/* where the two end up */}
          <g>
            <text
              x={VB_W - PAD_R + 8}
              y={y(finalDrift) + 4}
              fill={DRIFT_COLOR}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {finalDrift.toFixed(1)} s
            </text>
            <text
              x={VB_W - PAD_R + 8}
              y={y(finalLeaps) + 16}
              fill={LEAP_COLOR}
              fontSize={11}
              fontFamily="ui-monospace, monospace"
            >
              {finalLeaps} leaps
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        <span style={{ color: DRIFT_COLOR }}>smooth line</span> the running integral
        of the measured excess length of day ·{" "}
        <span style={{ color: LEAP_COLOR }}>staircase</span> the leap seconds
        actually inserted. Computed from two separate IERS products and never
        fitted to each other. Carried to {lastMonth} they end{" "}
        {Math.abs(finalDrift - finalLeaps).toFixed(2)} seconds apart after{" "}
        {(t1 - t0).toFixed(0)} years, and that remainder is the UT1-UTC offset of
        the day. The panel below integrates whole years only, to December 2025, so
        its leftover is a slightly different number for the same reason.
      </p>
    </figure>
  );
}
