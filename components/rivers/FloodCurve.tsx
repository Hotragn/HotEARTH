"use client";

import type { BandPoint, Fit, Gauge, PlottedPeak } from "@/lib/rivers";
import { HISTORIC_CODE, REGULATION_CODE } from "@/lib/rivers";
import {
  BAND_COLOR,
  CURVE_COLOR,
  HISTORIC_COLOR,
  RECORD_COLOR,
  REGULATED_COLOR,
  fmtCfs,
  fmtReturn,
} from "./riversUi";

/**
 * The flood frequency curve, with the record it was fitted to drawn on top.
 *
 * Log discharge against log return period, which is the standard way to draw
 * this and is standard because it makes an extrapolation look like one. The
 * fitted curve runs out to a thousand years. The record stops where the record
 * stops, at n plus one years, and the distance between the two is the part of
 * the answer that came from the distribution rather than from the river.
 *
 * THREE THINGS ARE DELIBERATE.
 *
 * THE BAND IS RESAMPLED, not analytic, and it is drawn behind everything so it
 * reads as the width of the answer rather than as a separate result. On a short
 * record it is wider than the difference between a ten year and a hundred year
 * flood, which is the whole point of showing it.
 *
 * THE POINTS ARE COLOURED BY THEIR USGS FLAG. A reconstructed historic peak and
 * a gauged one are different kinds of fact, and on some rivers every point at
 * the far end of the curve, the end that sets the answer, is a reconstruction.
 *
 * THE RECORD IS NOT CLIPPED TO THE CURVE. Where a flood sits above the fitted
 * line it is drawn above the fitted line.
 */

const VB_W = 1000;
const VB_H = 380;
const PAD_L = 66;
const PAD_R = 20;
const PAD_T = 18;
const PAD_B = 42;

const MIN_T = 1.05;
const MAX_T = 1000;

export default function FloodCurve({
  gauge,
  fit,
  band,
  positions,
  highlightReturn,
}: {
  gauge: Gauge;
  fit: Fit | null;
  band: readonly BandPoint[];
  positions: readonly PlottedPeak[];
  highlightReturn: number;
}) {
  if (!fit || band.length === 0 || positions.length === 0) return null;

  const flows = [
    ...positions.map((p) => p.peak.cfs),
    ...band.map((b) => b.low),
    ...band.map((b) => b.high),
  ].filter((v) => v > 0);
  const yLo = Math.log10(Math.min(...flows)) - 0.08;
  const yHi = Math.log10(Math.max(...flows)) + 0.08;

  const x = (t: number) =>
    PAD_L +
    ((Math.log10(t) - Math.log10(MIN_T)) / (Math.log10(MAX_T) - Math.log10(MIN_T))) *
      (VB_W - PAD_L - PAD_R);
  const y = (q: number) =>
    VB_H - PAD_B - ((Math.log10(q) - yLo) / (yHi - yLo)) * (VB_H - PAD_T - PAD_B);

  const inRange = band.filter((b) => b.returnYears >= MIN_T && b.returnYears <= MAX_T);
  const line = inRange
    .map((b, i) => `${i === 0 ? "M" : "L"}${x(b.returnYears).toFixed(1)},${y(b.estimate).toFixed(1)}`)
    .join(" ");
  const ribbon =
    inRange.map((b, i) => `${i === 0 ? "M" : "L"}${x(b.returnYears).toFixed(1)},${y(b.high).toFixed(1)}`).join(" ") +
    " " +
    [...inRange]
      .reverse()
      .map((b) => `L${x(b.returnYears).toFixed(1)},${y(b.low).toFixed(1)}`)
      .join(" ") +
    " Z";

  const xTicks = [2, 5, 10, 25, 50, 100, 200, 500, 1000].filter(
    (t) => t >= MIN_T && t <= MAX_T
  );
  // 1, 2, 5 per decade. Thirds of a decade are correct and unreadable.
  const yTicks: number[] = [];
  for (let decade = Math.floor(yLo); decade <= Math.ceil(yHi); decade++) {
    for (const mantissa of [1, 2, 5]) {
      const value = mantissa * 10 ** decade;
      const e = Math.log10(value);
      if (e >= yLo && e <= yHi) yTicks.push(value);
    }
  }

  const at = band.find((b) => Math.abs(b.returnYears - highlightReturn) < highlightReturn * 0.04);
  const recordEnd = positions[0].empiricalReturnYears;

  const colorFor = (p: PlottedPeak) =>
    p.peak.codes.includes(HISTORIC_CODE)
      ? HISTORIC_COLOR
      : p.peak.codes.includes(REGULATION_CODE)
        ? REGULATED_COLOR
        : RECORD_COLOR;

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          {gauge.stationName || gauge.label}
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {fit.n} annual peaks · {fit.firstYear} to {fit.lastYear}
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[640px] sm:min-w-0"
          role="img"
          aria-label={`Flood frequency curve for ${gauge.stationName}. ${fit.n} annual peak discharges from ${fit.firstYear} to ${fit.lastYear} are plotted against their position in the record, with a fitted log-Pearson III curve and a resampled ninety percent band. The record ends at ${Math.round(recordEnd)} years; the curve continues to a thousand.`}
        >
          {yTicks.map((q) => (
            <g key={`y${q}`}>
              <line
                x1={PAD_L}
                x2={VB_W - PAD_R}
                y1={y(q)}
                y2={y(q)}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-line"
              />
              <text
                x={PAD_L - 6}
                y={y(q) + 3}
                textAnchor="end"
                className="fill-faint font-mono"
                fontSize={9}
              >
                {q >= 1e6
                  ? `${(q / 1e6).toFixed(1)}M`
                  : q >= 1000
                    ? `${Math.round(q / 1000)}k`
                    : Math.round(q)}
              </text>
            </g>
          ))}

          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={x(t)}
                x2={x(t)}
                y1={PAD_T}
                y2={VB_H - PAD_B}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-line"
              />
              <text
                x={x(t)}
                y={VB_H - PAD_B + 14}
                textAnchor="middle"
                className="fill-faint font-mono"
                fontSize={9}
              >
                {t}
              </text>
            </g>
          ))}

          {/* Where the record stops and the extrapolation starts. */}
          <rect
            x={x(recordEnd)}
            y={PAD_T}
            width={Math.max(0, VB_W - PAD_R - x(recordEnd))}
            height={VB_H - PAD_T - PAD_B}
            fill="currentColor"
            className="text-line"
            opacity={0.35}
          />
          <text
            x={x(recordEnd) + 6}
            y={PAD_T + 11}
            className="fill-faint font-mono"
            fontSize={9}
          >
            past the record
          </text>

          <path d={ribbon} fill={BAND_COLOR} opacity={0.14} />
          <path d={line} fill="none" stroke={CURVE_COLOR} strokeWidth={2} />

          {at && (
            <g>
              <line
                x1={x(at.returnYears)}
                x2={x(at.returnYears)}
                y1={y(at.high)}
                y2={y(at.low)}
                stroke={CURVE_COLOR}
                strokeWidth={2.5}
              />
              <circle cx={x(at.returnYears)} cy={y(at.estimate)} r={4} fill={CURVE_COLOR} />
              <text
                x={x(at.returnYears) - 8}
                y={y(at.estimate) - 10}
                textAnchor="end"
                fill={CURVE_COLOR}
                className="font-mono"
                fontSize={10}
              >
                {fmtCfs(at.estimate)}
              </text>
            </g>
          )}

          {positions.map((p) => (
            <g key={`${p.peak.waterYear}-${p.rank}`}>
              <title>
                {`${p.peak.waterYear}: ${fmtCfs(p.peak.cfs)}, rank ${p.rank} of ${positions.length}, ${fmtReturn(p.empiricalReturnYears)} by the record`}
              </title>
              <circle
                cx={x(Math.min(MAX_T, Math.max(MIN_T, p.empiricalReturnYears)))}
                cy={y(p.peak.cfs)}
                r={2.6}
                fill={colorFor(p)}
                opacity={0.85}
              />
            </g>
          ))}

          <text
            x={PAD_L}
            y={VB_H - 6}
            className="fill-faint font-mono"
            fontSize={9}
          >
            return period, years
          </text>
          <text
            x={10}
            y={PAD_T + 4}
            className="fill-faint font-mono"
            fontSize={9}
          >
            cfs
          </text>
        </svg>
      </div>

      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-faint">
        <span style={{ color: CURVE_COLOR }}>fitted curve, 90% band</span>
        <span style={{ color: RECORD_COLOR }}>gauged peak</span>
        <span style={{ color: REGULATED_COLOR }}>regulated river</span>
        <span style={{ color: HISTORIC_COLOR }}>reconstructed, not gauged</span>
      </p>
    </figure>
  );
}
