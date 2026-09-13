"use client";

import type { MonthlySeries } from "@/lib/rotation";
import { FAST_COLOR, ROTATION_ACCENT, SLOW_COLOR, yearOf } from "./rotationUi";

/**
 * Excess length of day, monthly, for the whole record.
 *
 * Drawn about a zero line rather than from the bottom of the frame, because the
 * sign is the story: above the line the day ran long and the Earth was slow,
 * below it the day ran short. The line the record crosses in 2020 is the first
 * time it had been below for a sustained stretch in the atomic era.
 *
 * Monthly rather than annual, because the seasonal swing is about a millisecond
 * and the decadal wandering is about two: smoothing to annual means would hide
 * half of what is interesting and make the record look tidier than it is.
 */

const VB_W = 1000;
const VB_H = 280;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 32;

export default function LodChart({
  monthly,
  from = "1962-01",
}: {
  monthly: MonthlySeries;
  from?: string;
}) {
  const pts = monthly.month
    .map((m, i) => ({ m, t: yearOf(`${m}-15`), v: monthly.lodMs[i] }))
    .filter((p) => p.m >= from);
  if (pts.length < 12) return null;

  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const lo = Math.min(...pts.map((p) => p.v));
  const hi = Math.max(...pts.map((p) => p.v));
  const pad = (hi - lo) * 0.1;
  const yLo = lo - pad;
  const yHi = hi + pad;

  const x = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) =>
    VB_H - PAD_B - ((v - yLo) / (yHi - yLo)) * (VB_H - PAD_T - PAD_B);

  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(" ");

  const yTicks: number[] = [];
  for (let v = Math.ceil(yLo); v <= yHi; v += 1) yTicks.push(v);
  const xTicks: number[] = [];
  for (let yr = Math.ceil(t0 / 10) * 10; yr <= t1; yr += 10) xTicks.push(yr);

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          How much longer than 86,400 seconds, month by month
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {pts[0].m} to {pts[pts.length - 1].m} · milliseconds
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label="Monthly excess length of day since 1962, in milliseconds. It runs one to three milliseconds above zero for most of the record, falls through the 2000s, and crosses below zero around 2020 before partly recovering."
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y(v)}
                x2={VB_W - PAD_R}
                y2={y(v)}
                stroke={v === 0 ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.06)"}
              />
              <text
                x={PAD_L - 6}
                y={y(v) + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {v > 0 ? `+${v}` : v}
              </text>
            </g>
          ))}

          {xTicks.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={VB_H - PAD_B + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={10.5}
              fontFamily="ui-monospace, monospace"
            >
              {yr}
            </text>
          ))}

          <path d={path} fill="none" stroke={ROTATION_ACCENT} strokeWidth={1.3} strokeOpacity={0.9} />
        </svg>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        <span style={{ color: SLOW_COLOR }}>above the line</span> the day ran long
        and the Earth was slow · <span style={{ color: FAST_COLOR }}>below it</span>{" "}
        the day ran short. The wobble inside each year is the atmosphere; the
        wandering across decades is mostly the core.
      </p>
    </figure>
  );
}
