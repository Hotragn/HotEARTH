"use client";

import type { GasIndex, HoleRecord, Trend } from "@/lib/ozone";
import { CHEM_COLOR, HOLE_COLOR, VORTEX_COLOR, fmtSlope, sigmaWords } from "./ozoneUi";

/**
 * The cause above the effect, on one time axis.
 *
 * This is the argument of the tab, and the only honest way to draw it is with
 * both panels the same width and the same years. The top panel is the measured
 * halogen loading over Antarctica: a clean hump that rises, peaks, and falls.
 * The bottom panel is the hole it is supposed to explain: a mess.
 *
 * Two deliberate choices about what NOT to smooth.
 *
 * 1995 IS DRAWN AS A GAP. There was no mapping instrument that year, so the
 * line breaks instead of interpolating across it. An interpolated 1995 would be
 * indistinguishable from a measurement at this scale.
 *
 * THE FITTED LINE ONLY COVERS ITS OWN WINDOW, and is drawn dashed with the
 * number of standard errors written beside it, because at every window from
 * 1990 onward it is under two and a solid line would imply more than that.
 */

const VB_W = 1000;
const TOP_H = 150;
const BOT_H = 200;
const PAD_L = 52;
const PAD_R = 18;
const PAD_T = 14;
const PAD_B = 30;

function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Break the path wherever a year is missing, rather than bridging it. */
function segmentedPath(
  years: readonly number[],
  values: readonly number[],
  x: (y: number) => number,
  y: (v: number) => number
): string {
  let d = "";
  for (let i = 0; i < years.length; i++) {
    const newRun = i === 0 || years[i] !== years[i - 1] + 1;
    d += `${newRun ? "M" : "L"}${x(years[i]).toFixed(1)},${y(values[i]).toFixed(1)} `;
  }
  return d.trim();
}

export default function CauseAndEffect({
  hole,
  index,
  fit,
  windowStart,
  vortexYears,
}: {
  hole: HoleRecord;
  index: GasIndex;
  fit: Trend | null;
  windowStart: number;
  vortexYears: readonly number[];
}) {
  if (hole.years.length < 5) return null;

  const t0 = Math.min(hole.years[0], index.years[0]);
  const t1 = Math.max(hole.years[hole.years.length - 1], index.years[index.years.length - 1]);
  const x = (yr: number) => PAD_L + ((yr - t0) / (t1 - t0)) * (VB_W - PAD_L - PAD_R);

  const eLo = Math.min(...index.eescPpt, index.benchmark1980Ppt);
  const eHi = Math.max(...index.eescPpt);
  const ePad = (eHi - eLo) * 0.15;
  const yTop = (v: number) =>
    TOP_H - PAD_B - ((v - (eLo - ePad)) / (eHi + ePad - (eLo - ePad))) * (TOP_H - PAD_T - PAD_B);

  const aHi = Math.max(...hole.areaMillionKm2) * 1.08;
  const yBot = (v: number) => BOT_H - PAD_B - (v / aHi) * (BOT_H - PAD_T - PAD_B);

  const xTicks: number[] = [];
  for (let yr = Math.ceil(t0 / 10) * 10; yr <= t1; yr += 10) xTicks.push(yr);

  const areaTicks = niceTicks(0, aHi, 4);
  const eescTicks = niceTicks(eLo - ePad, eHi + ePad, 3);

  const grid = (yr: number, h: number) => (
    <line
      key={`g${yr}-${h}`}
      x1={x(yr)}
      x2={x(yr)}
      y1={PAD_T}
      y2={h - PAD_B}
      stroke="currentColor"
      strokeWidth={0.5}
      className="text-line"
    />
  );

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          The chemicals, and the hole they are supposed to explain
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {t0} to {t1} · same axis, same width
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${TOP_H + BOT_H}`}
          className="block h-auto w-full min-w-[640px] sm:min-w-0"
          role="img"
          aria-label={`Two panels on one time axis from ${t0} to ${t1}. Above, equivalent effective stratospheric chlorine over Antarctica rises to a peak in ${index.peakYear} and falls smoothly since. Below, the annual ozone hole area jumps between about 9 and 27 million square kilometres with no matching shape, and the fitted line over the recent window is ${sigmaWords(fit?.sigma ?? null)}.`}
        >
          {/* ---------------------------------------------------------- cause */}
          <g>
            {xTicks.map((yr) => grid(yr, TOP_H))}
            {eescTicks.map((v) => (
              <g key={`e${v}`}>
                <line
                  x1={PAD_L}
                  x2={VB_W - PAD_R}
                  y1={yTop(v)}
                  y2={yTop(v)}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  className="text-line"
                />
                <text
                  x={PAD_L - 6}
                  y={yTop(v) + 3}
                  textAnchor="end"
                  className="fill-faint font-mono"
                  fontSize={9}
                >
                  {v.toFixed(0)}
                </text>
              </g>
            ))}

            {/* The 1980 benchmark: zero on the index, and the target. */}
            <line
              x1={PAD_L}
              x2={VB_W - PAD_R}
              y1={yTop(index.benchmark1980Ppt)}
              y2={yTop(index.benchmark1980Ppt)}
              stroke={CHEM_COLOR}
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.65}
            />
            <text
              x={VB_W - PAD_R}
              y={yTop(index.benchmark1980Ppt) - 4}
              textAnchor="end"
              fill={CHEM_COLOR}
              className="font-mono"
              fontSize={9}
              opacity={0.9}
            >
              1980 level, {index.benchmark1980Ppt.toFixed(0)} ppt
            </text>

            <path
              d={segmentedPath(index.years, index.eescPpt, x, yTop)}
              fill="none"
              stroke={CHEM_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <circle cx={x(index.peakYear)} cy={yTop(index.peakEescPpt)} r={3} fill={CHEM_COLOR} />
            <text
              x={x(index.peakYear) + 6}
              y={yTop(index.peakEescPpt) - 5}
              fill={CHEM_COLOR}
              className="font-mono"
              fontSize={9}
            >
              peak {index.peakYear}
            </text>
            <text
              x={PAD_L}
              y={PAD_T + 2}
              fill={CHEM_COLOR}
              className="font-mono uppercase"
              fontSize={9}
              letterSpacing="0.12em"
            >
              cause · chlorine and bromine over Antarctica, ppt
            </text>
          </g>

          {/* --------------------------------------------------------- effect */}
          <g transform={`translate(0 ${TOP_H})`}>
            {xTicks.map((yr) => (
              <g key={`x${yr}`}>
                {grid(yr, BOT_H)}
                <text
                  x={x(yr)}
                  y={BOT_H - PAD_B + 14}
                  textAnchor="middle"
                  className="fill-faint font-mono"
                  fontSize={9}
                >
                  {yr}
                </text>
              </g>
            ))}
            {areaTicks.map((v) => (
              <g key={`a${v}`}>
                <line
                  x1={PAD_L}
                  x2={VB_W - PAD_R}
                  y1={yBot(v)}
                  y2={yBot(v)}
                  stroke="currentColor"
                  strokeWidth={0.5}
                  className="text-line"
                />
                <text
                  x={PAD_L - 6}
                  y={yBot(v) + 3}
                  textAnchor="end"
                  className="fill-faint font-mono"
                  fontSize={9}
                >
                  {v}
                </text>
              </g>
            ))}

            {/* The years the vortex fell apart. Drawn under the data so they
                read as background rather than as a result. */}
            {vortexYears.map((yr) => (
              <g key={`v${yr}`}>
                <line
                  x1={x(yr)}
                  x2={x(yr)}
                  y1={PAD_T}
                  y2={BOT_H - PAD_B}
                  stroke={VORTEX_COLOR}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  opacity={0.6}
                />
                <text
                  x={x(yr) + 4}
                  y={PAD_T + 10}
                  fill={VORTEX_COLOR}
                  className="font-mono"
                  fontSize={9}
                  opacity={0.9}
                >
                  {yr}
                </text>
              </g>
            ))}

            {fit && (
              <line
                x1={x(fit.firstYear)}
                x2={x(fit.lastYear)}
                y1={yBot(fit.slope * fit.firstYear + fit.intercept)}
                y2={yBot(fit.slope * fit.lastYear + fit.intercept)}
                stroke={HOLE_COLOR}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.85}
              />
            )}

            <path
              d={segmentedPath(hole.years, hole.areaMillionKm2, x, yBot)}
              fill="none"
              stroke={HOLE_COLOR}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {hole.years.map((yr, i) => (
              <circle
                key={yr}
                cx={x(yr)}
                cy={yBot(hole.areaMillionKm2[i])}
                r={1.8}
                fill={HOLE_COLOR}
                opacity={0.8}
              />
            ))}

            {hole.gapYears.map((yr) => (
              <text
                key={`gap${yr}`}
                x={x(yr)}
                y={BOT_H - PAD_B - 6}
                textAnchor="middle"
                className="fill-faint font-mono"
                fontSize={8.5}
              >
                no satellite
              </text>
            ))}

            <text
              x={PAD_L}
              y={PAD_T + 2}
              fill={HOLE_COLOR}
              className="font-mono uppercase"
              fontSize={9}
              letterSpacing="0.12em"
            >
              effect · ozone hole area, million km²
            </text>
          </g>
        </svg>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        The dashed fit runs from {windowStart}:{" "}
        <span style={{ color: HOLE_COLOR }}>
          {fmtSlope(fit?.slope ?? null, fit?.stderr ?? null, "million km² per year")}
        </span>
        , which is {sigmaWords(fit?.sigma ?? null)}. The line moves the area by{" "}
        {fit ? Math.abs(fit.span).toFixed(1) : "?"} million km² across the whole window, while
        the points scatter {fit ? fit.residualSd.toFixed(1) : "?"} about it.
      </p>
    </figure>
  );
}
