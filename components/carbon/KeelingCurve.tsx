"use client";

import { useMemo } from "react";
import { centredMovingAverage, type GasSeries } from "@/lib/carbon";
import { CARBON_ACCENT, SERIES_COLOR } from "./carbonUi";

/**
 * The curve itself, with the measured monthly values and the seasonally
 * adjusted line drawn over them.
 *
 * Both are shown deliberately. The smooth line is what people mean by "CO2 is
 * rising"; the sawtooth around it is the biosphere, and hiding it would hide the
 * most interesting thing in the record. The smoothed line simply stops six
 * months from each end rather than being padded out to the edge, because half a
 * window is not a year and padding it puts a spurious wiggle exactly where a
 * reader looks first: the present day.
 */

const VB_W = 1000;
const VB_H = 320;
const PAD_L = 54;
const PAD_R = 22;
const PAD_T = 18;
const PAD_B = 42;

export default function KeelingCurve({
  series,
  showSmoothed = true,
  lastYears,
  eyebrow,
}: {
  series: GasSeries;
  showSmoothed?: boolean;
  /** plot only the most recent N years, for the detail view */
  lastYears?: number;
  eyebrow?: string;
}) {
  // Windowing happens before smoothing, deliberately: the detail chart then
  // shows exactly the average a reader would get from the months on screen,
  // rather than borrowing six months of context they cannot see.
  const shown = useMemo(() => window_(series, lastYears), [series, lastYears]);
  const smooth = useMemo(() => centredMovingAverage(shown.value, 12), [shown]);

  const t0 = shown.time[0];
  const t1 = shown.time[shown.time.length - 1];
  const lo = Math.min(...shown.value);
  const hi = Math.max(...shown.value);
  const pad = (hi - lo) * 0.06;
  const yLo = lo - pad;
  const yHi = hi + pad;

  const x = (t: number) => PAD_L + ((t - t0) / (t1 - t0)) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) =>
    VB_H - PAD_B - ((v - yLo) / (yHi - yLo)) * (VB_H - PAD_T - PAD_B);

  const raw = shown.time
    .map((t, i) => `${x(t).toFixed(1)},${y(shown.value[i]).toFixed(1)}`)
    .join(" ");

  // The smoothed line is drawn as one run: it is null-free in the middle by
  // construction, so a single polyline over the non-null span is correct.
  const smoothPoints = shown.time
    .map((t, i) => (smooth[i] === null ? null : `${x(t).toFixed(1)},${y(smooth[i]!).toFixed(1)}`))
    .filter((p): p is string => p !== null)
    .join(" ");

  // Year gridlines, spaced so a short detail window is not left with a single
  // label under it: decades over the full record, every other year on eight.
  const span = t1 - t0;
  const xStep = span > 40 ? 10 : span > 20 ? 5 : span > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let yr = Math.ceil(t0 / xStep) * xStep; yr <= t1; yr += xStep) ticks.push(yr);

  const yTicks: number[] = [];
  const step = yHi - yLo > 120 ? 40 : yHi - yLo > 60 ? 20 : 10;
  for (let v = Math.ceil(yLo / step) * step; v <= yHi; v += step) yTicks.push(v);

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          {eyebrow ?? series.label}
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {Math.floor(t0)} to {Math.floor(t1)} · monthly means in {series.unit}
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`${series.label} from ${Math.floor(t0)} to ${Math.floor(
            t1
          )}, rising from about ${Math.round(shown.value[0])} to about ${Math.round(
            shown.value[shown.value.length - 1]
          )} ${series.unit}, with an annual sawtooth from the seasonal cycle of vegetation.`}
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
                x={PAD_L - 7}
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

          {ticks.map((yr) => (
            <text
              key={yr}
              x={x(yr)}
              y={VB_H - PAD_B + 16}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={10.5}
              fontFamily="ui-monospace, monospace"
            >
              {yr}
            </text>
          ))}

          {/* the measured monthly values, sawtooth included */}
          <polyline
            points={raw}
            fill="none"
            stroke={SERIES_COLOR[series.id]}
            strokeWidth={1.1}
            strokeOpacity={0.75}
          />

          {/* the seasonally adjusted line */}
          {showSmoothed && smoothPoints && (
            <polyline
              points={smoothPoints}
              fill="none"
              stroke={CARBON_ACCENT}
              strokeWidth={2}
            />
          )}

          <text
            x={16}
            y={(PAD_T + VB_H - PAD_B) / 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
            transform={`rotate(-90 16 ${(PAD_T + VB_H - PAD_B) / 2})`}
          >
            {series.unit}
          </text>
        </svg>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        <span style={{ color: SERIES_COLOR[series.id] }}>thin line</span> monthly
        means as measured ·{" "}
        {showSmoothed && (
          <>
            <span style={{ color: CARBON_ACCENT }}>thick line</span> 12-month
            centred average, which stops six months short of each end rather than
            being padded ·{" "}
          </>
        )}
        NOAA GML
      </p>
    </figure>
  );
}

/**
 * The last N years of a series, or the whole thing.
 *
 * Named with a trailing underscore because `window` is taken in a browser and
 * shadowing it inside a component is the kind of thing that works until it does
 * not.
 */
function window_(series: GasSeries, lastYears?: number): GasSeries {
  if (typeof lastYears !== "number" || !Number.isFinite(lastYears) || lastYears <= 0) {
    return series;
  }
  const cut = series.time[series.time.length - 1] - lastYears;
  let from = series.time.findIndex((t) => t >= cut);
  if (from <= 0) return series;
  // Needs enough months left to be worth drawing at all.
  if (series.time.length - from < 24) return series;
  return {
    ...series,
    time: series.time.slice(from),
    years: series.years.slice(from),
    months: series.months.slice(from),
    value: series.value.slice(from),
    trend: series.trend.slice(from),
  };
}
