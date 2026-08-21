"use client";

import { useMemo } from "react";
import { acceleration, trend, type GlobalVariant } from "@/lib/sealevel";
import { MISSION_COLORS, SEALEVEL_ACCENT, fmtRate } from "./sealevelUi";

/**
 * The global mean since 1992, coloured by which satellite measured it.
 *
 * Colouring by mission rather than drawing one line is the point: a "continuous
 * thirty-year record" is five instruments, and where two of them overlap both
 * colours appear at once, which is what a calibration handover looks like.
 *
 * Two fits are drawn over the top. The straight line is the trend everybody
 * quotes. The curve is a quadratic, and the gap between them at each end is the
 * acceleration: the line is too shallow at the right and too steep at the left,
 * because the rise is not constant.
 */

const VB_W = 1000;
const VB_H = 320;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

export default function AltimetryChart({
  variant,
  showFits = true,
}: {
  variant: GlobalVariant;
  showFits?: boolean;
}) {
  const line = useMemo(() => trend(variant.time, variant.value), [variant]);
  const curve = useMemo(() => acceleration(variant.time, variant.value), [variant]);

  const t0 = variant.time[0];
  const t1 = variant.time[variant.time.length - 1];
  const lo = Math.min(...variant.value);
  const hi = Math.max(...variant.value);
  const pad = (hi - lo) * 0.08;
  const yLo = lo - pad;
  const yHi = hi + pad;

  const x = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) =>
    VB_H - PAD_B - ((v - yLo) / (yHi - yLo)) * (VB_H - PAD_T - PAD_B);

  const yTicks: number[] = [];
  const step = yHi - yLo > 120 ? 40 : 20;
  for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) yTicks.push(v);

  const xTicks: number[] = [];
  for (let yr = Math.ceil(t0 / 5) * 5; yr <= t1; yr += 5) xTicks.push(yr);

  // The straight-line fit, drawn across the whole span.
  const linePath = (() => {
    if (!line) return "";
    // slope and a point: use the fit's own mean so the line sits where it should
    const meanT = variant.time.reduce((a, b) => a + b, 0) / variant.time.length;
    const meanV = variant.value.reduce((a, b) => a + b, 0) / variant.value.length;
    const at = (t: number) => meanV + line.mmPerYear * (t - meanT);
    return `M${x(t0).toFixed(1)},${y(at(t0)).toFixed(1)} L${x(t1).toFixed(1)},${y(at(t1)).toFixed(1)}`;
  })();

  // The quadratic, sampled every quarter year.
  const curvePath = (() => {
    if (!curve) return "";
    const meanT = variant.time.reduce((a, b) => a + b, 0) / variant.time.length;
    const meanV = variant.value.reduce((a, b) => a + b, 0) / variant.value.length;
    // Rebuild the parabola from the reported rates: rate is linear in time, so
    // value is the integral of it about the centroid.
    const rateAt = (t: number) =>
      curve.rateAtStart +
      ((curve.rateAtEnd - curve.rateAtStart) * (t - curve.from)) / (curve.to - curve.from);
    const at = (t: number) => {
      // integral of rate from meanT to t, plus the mean value
      const r0 = rateAt(meanT);
      const r1 = rateAt(t);
      return meanV + ((r0 + r1) / 2) * (t - meanT);
    };
    const pts: string[] = [];
    for (let t = t0; t <= t1; t += 0.25) {
      pts.push(`${pts.length === 0 ? "M" : "L"}${x(t).toFixed(1)},${y(at(t)).toFixed(1)}`);
    }
    return pts.join(" ");
  })();

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          Global mean sea level, {Math.floor(t0)} to {Math.floor(t1)}
        </h2>
        <p className="font-mono text-[10px] text-faint">
          millimetres · seasonal cycle {variant.seasonal} · {variant.domain}
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`Global mean sea level from ${Math.floor(t0)} to ${Math.floor(
            t1
          )}, rising about 100 millimetres in total, coloured by which of five satellites measured each stretch, with a straight-line fit and a curved fit showing the acceleration.`}
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

          {/* one line per satellite */}
          {variant.perMission.map((m, i) => (
            <polyline
              key={m.mission}
              points={m.time
                .map((t, j) => `${x(t).toFixed(1)},${y(m.value[j]).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={MISSION_COLORS[i % MISSION_COLORS.length]}
              strokeWidth={1.2}
              strokeOpacity={0.85}
            />
          ))}

          {showFits && linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth={1.4}
              strokeDasharray="5 4"
            />
          )}
          {showFits && curvePath && (
            <path d={curvePath} fill="none" stroke={SEALEVEL_ACCENT} strokeWidth={2} />
          )}
        </svg>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        {variant.perMission.map((m, i) => (
          <span key={m.mission}>
            {i > 0 && " · "}
            <span style={{ color: MISSION_COLORS[i % MISSION_COLORS.length] }}>
              {m.mission}
            </span>
          </span>
        ))}
        {showFits && (
          <>
            {" · "}
            <span className="text-white/50">dashed</span> straight line at{" "}
            {fmtRate(line?.mmPerYear ?? null)} ·{" "}
            <span style={{ color: SEALEVEL_ACCENT }}>solid</span> curved fit, which
            leaves the straight line too steep at the start and too shallow now
          </>
        )}
      </p>
    </figure>
  );
}
