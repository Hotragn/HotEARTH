"use client";

import { useMemo } from "react";
import { stripeColor, type TemperatureSeries } from "@/lib/climate";
import { fmtAnomaly, fmtBaseline } from "./climateUi";

/**
 * One stripe per year, coloured by anomaly. No axes, no gridlines, no numbers:
 * the point is the shape of the record at a glance.
 *
 * Two things are deliberate. The colour range is taken from the DATA rather
 * than fixed, so the picture cannot silently rescale as years are added, and
 * the range is printed underneath so the reader knows what the deepest red
 * means. And the baseline is named, because these stripes are anomalies and an
 * anomaly without its reference period is not a number.
 */
export default function WarmingStripes({
  series,
  onHoverYear,
}: {
  series: TemperatureSeries;
  onHoverYear?: (year: number | null) => void;
}) {
  const maxAbs = useMemo(
    () => Math.max(...series.anomaly.map((a) => Math.abs(a))),
    [series]
  );

  const n = series.years.length;
  const w = 1000;
  const h = 150;
  const bw = w / n;

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          {series.years[0]} to {series.years[n - 1]}, one stripe per year
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {series.label}, anomaly against {fmtBaseline(series.baseline)}
        </p>
      </figcaption>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Warming stripes for ${series.label}, ${series.years[0]} to ${
          series.years[n - 1]
        }. Anomalies run from ${fmtAnomaly(Math.min(...series.anomaly))} to ${fmtAnomaly(
          Math.max(...series.anomaly)
        )} relative to ${fmtBaseline(series.baseline)}.`}
        onMouseLeave={() => onHoverYear?.(null)}
      >
        {series.years.map((year, i) => (
          <rect
            key={year}
            x={i * bw}
            y={0}
            width={Math.ceil(bw) + 0.5}
            height={h}
            fill={stripeColor(series.anomaly[i], maxAbs)}
            onMouseEnter={() => onHoverYear?.(year)}
          >
            <title>{`${year}: ${fmtAnomaly(series.anomaly[i])}`}</title>
          </rect>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[10px] text-faint">
        <span>
          deepest blue {fmtAnomaly(-maxAbs)} · deepest red {fmtAnomaly(maxAbs)}
        </span>
        <span>
          colour scale taken from this data, not fixed, so it cannot rescale
          silently
        </span>
      </div>
    </figure>
  );
}
