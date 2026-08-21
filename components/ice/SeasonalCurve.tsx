"use client";

import { useMemo } from "react";
import {
  doyLabel,
  type Climatology,
  type DailyYear,
  type Hemisphere,
} from "@/lib/seaice";
import { EXTENT_COLOR, HEMI_LABEL, ICE_ACCENT, RECORD_COLOR } from "./iceUi";

/**
 * This year's daily extent against the 1981 to 2010 band.
 *
 * The band is NSIDC's own percentiles, not something computed here, and that
 * distinction matters: a percentile of daily extent needs the full thirty-year
 * daily record, and this tab mirrors only a few years of it. Drawing a band from
 * data you do not have would be exactly the sort of quiet fabrication this
 * project exists not to do.
 *
 * The shape is the argument. The seasonal swing is enormous, four to fifteen
 * million square km in the Arctic, which dwarfs the trend. That is why a single
 * month's figure is meaningless without saying which month, and why the useful
 * comparison is a day against the same day in earlier decades.
 */

const VB_W = 1000;
const VB_H = 340;
const PAD_L = 46;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

export default function SeasonalCurve({
  hemisphere,
  climatology,
  years,
  currentYear,
  recordYear,
}: {
  hemisphere: Hemisphere;
  climatology: Climatology | null;
  years: DailyYear[];
  currentYear: number;
  recordYear: number | null;
}) {
  const bounds = useMemo(() => {
    const vals: number[] = [];
    if (climatology) vals.push(...climatology.p10, ...climatology.p90);
    for (const y of years) vals.push(...y.extent);
    if (vals.length === 0) return null;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.08;
    return { lo: Math.max(0, lo - pad), hi: hi + pad };
  }, [climatology, years]);

  if (!bounds) return null;

  const x = (doy: number) => PAD_L + ((doy - 1) / 365) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) =>
    VB_H - PAD_B - ((v - bounds.lo) / (bounds.hi - bounds.lo)) * (VB_H - PAD_T - PAD_B);

  const line = (d: DailyYear) =>
    d.doy
      .map((doy, i) => `${i === 0 ? "M" : "L"}${x(doy).toFixed(1)},${y(d.extent[i]).toFixed(1)}`)
      .join(" ");

  /**
   * The band as one closed path: forward along the 90th percentile, then back
   * along the 10th.
   *
   * Written as an explicit loop after the first version reversed twice, once on
   * the array of path commands and once on the percentile index, so the x values
   * ran forward while the y values ran backward. The result was a shaded
   * hourglass crossing itself in the middle of the year, which no assertion
   * would have caught and which a single screenshot made obvious.
   */
  const band = (() => {
    if (!climatology) return "";
    const n = climatology.doy.length;
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      parts.push(
        `${i === 0 ? "M" : "L"}${x(climatology.doy[i]).toFixed(1)},${y(climatology.p90[i]).toFixed(1)}`
      );
    }
    for (let i = n - 1; i >= 0; i--) {
      parts.push(`L${x(climatology.doy[i]).toFixed(1)},${y(climatology.p10[i]).toFixed(1)}`);
    }
    parts.push("Z");
    return parts.join(" ");
  })();

  const median = climatology
    ? climatology.doy
        .map(
          (doy, i) => `${i === 0 ? "M" : "L"}${x(doy).toFixed(1)},${y(climatology.p50[i]).toFixed(1)}`
        )
        .join(" ")
    : "";

  const yTicks: number[] = [];
  const span = bounds.hi - bounds.lo;
  const step = span > 12 ? 4 : span > 6 ? 2 : 1;
  for (let v = Math.ceil(bounds.lo / step) * step; v <= bounds.hi; v += step) yTicks.push(v);

  const current = years.find((d) => d.year === currentYear) ?? null;
  const record = recordYear !== null ? (years.find((d) => d.year === recordYear) ?? null) : null;
  const others = years.filter((d) => d.year !== currentYear && d.year !== recordYear);

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          {HEMI_LABEL[hemisphere]} sea ice through the year
        </h2>
        <p className="font-mono text-[10px] text-faint">
          daily extent, millions of km² · band is 1981 to 2010, 10th to 90th percentile
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`Daily ${HEMI_LABEL[hemisphere]} sea ice extent through the year. The shaded band is the 10th to 90th percentile of 1981 to 2010. This year's line runs below the band for most of the year.`}
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

          {MONTH_STARTS.map((doy, i) => (
            <text
              key={doy}
              x={x(doy + 14)}
              y={VB_H - PAD_B + 15}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={10.5}
              fontFamily="ui-monospace, monospace"
            >
              {MONTH_LABELS[i]}
            </text>
          ))}

          {band && <path d={band} fill="rgba(143,216,255,0.13)" stroke="none" />}
          {median && (
            <path
              d={median}
              fill="none"
              stroke="rgba(255,255,255,0.32)"
              strokeWidth={1.2}
              strokeDasharray="4 3"
            />
          )}

          {others.map((d) => (
            <path
              key={d.year}
              d={line(d)}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1.1}
            />
          ))}

          {record && (
            <path d={line(record)} fill="none" stroke={RECORD_COLOR} strokeWidth={1.6} />
          )}

          {current && (
            <>
              <path d={line(current)} fill="none" stroke={ICE_ACCENT} strokeWidth={2.4} />
              {/* where the record stops, because it stops a few days behind today */}
              <circle
                cx={x(current.doy[current.doy.length - 1])}
                cy={y(current.extent[current.extent.length - 1])}
                r={3.5}
                fill={ICE_ACCENT}
              />
            </>
          )}
        </svg>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        <span style={{ color: ICE_ACCENT }}>{currentYear}</span>
        {record && (
          <>
            {" · "}
            <span style={{ color: RECORD_COLOR }}>{record.year}</span>, the record low
          </>
        )}
        {others.length > 0 && (
          <> · grey lines {others.map((d) => d.year).join(", ")}</>
        )}
        {" · dashed line the 1981 to 2010 median · "}
        {current && (
          <>
            this year&apos;s data ends {doyLabel(current.doy[current.doy.length - 1])}, because
            the index runs a few days behind
          </>
        )}
      </p>
    </figure>
  );
}
