"use client";

import { trend, type Gauge } from "@/lib/sealevel";
import {
  FALLING_COLOR,
  GLOBAL_COLOR,
  RISING_COLOR,
  fmtPerCentury,
  fmtPlace,
  fmtRateWithError,
} from "./sealevelUi";

/**
 * Ten tide gauges on one axis of RATE, with the global altimeter figure marked.
 *
 * This is the signature exhibit of the tab, and it is a bar chart rather than a
 * set of curves on purpose: the curves cannot share a vertical axis, because
 * each gauge's numbers are millimetres above its own arbitrary local datum. The
 * absolute heights are not comparable and drawing them together would invite
 * exactly the wrong reading. The slopes ARE comparable, so the slopes are what
 * is drawn.
 *
 * Zero sits inside the plot, not at the left edge, because three of these ten
 * stations have falling sea level and a chart that cannot show a negative bar
 * would hide the most surprising thing in the data.
 */
export default function GaugeComparison({
  gauges,
  globalMmPerYear,
  since,
}: {
  gauges: Gauge[];
  globalMmPerYear: number | null;
  since: number;
}) {
  const rows = gauges
    .map((g) => ({ gauge: g, t: trend(g.years, g.value, since) }))
    .filter((r): r is { gauge: Gauge; t: NonNullable<ReturnType<typeof trend>> } => r.t !== null)
    .sort((a, b) => b.t.mmPerYear - a.t.mmPerYear);

  if (rows.length === 0) return null;

  const lo = Math.min(0, ...rows.map((r) => r.t.mmPerYear));
  const hi = Math.max(0, ...rows.map((r) => r.t.mmPerYear));
  const span = hi - lo || 1;
  // Where zero falls, as a percentage of the track.
  const zero = ((0 - lo) / span) * 100;
  const pos = (v: number) => ((v - lo) / span) * 100;

  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        The same ocean, since {since}
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        Each bar is one tide gauge&apos;s own trend over the altimeter era, computed
        from its record. The blue line is the global mean the satellites measure.
        Bars to the left of zero are places where the sea is going DOWN.
      </p>

      <ul className="mt-3 space-y-2">
        {rows.map(({ gauge, t }) => {
          const rising = t.mmPerYear >= 0;
          const color = rising ? RISING_COLOR : FALLING_COLOR;
          return (
            <li key={gauge.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[11px]">
                <span className="text-ice">
                  {gauge.name}
                  <span className="ml-1.5 text-faint">{gauge.country}</span>
                </span>
                <span style={{ color }}>
                  {fmtRateWithError(t.mmPerYear, t.stdErr)}
                  <span className="ml-1.5 text-faint">
                    {fmtPerCentury(t.mmPerYear)}/century at this rate
                  </span>
                </span>
              </div>

              <div className="relative mt-1 h-3 w-full rounded-full bg-white/5">
                {/* zero */}
                <span
                  className="absolute top-0 h-full w-px bg-white/25"
                  style={{ left: `${zero}%` }}
                />
                {/* the global mean, for comparison */}
                {globalMmPerYear !== null && (
                  <span
                    className="absolute top-0 h-full w-[1.5px]"
                    style={{ left: `${pos(globalMmPerYear)}%`, backgroundColor: GLOBAL_COLOR }}
                  />
                )}
                <span
                  className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${Math.min(zero, pos(t.mmPerYear))}%`,
                    width: `${Math.abs(pos(t.mmPerYear) - zero)}%`,
                    backgroundColor: color,
                    opacity: 0.7,
                  }}
                />
              </div>

              <p className="mt-0.5 font-mono text-[9.5px] leading-snug text-faint">
                {fmtPlace(gauge.lat, gauge.lon)} · record from {gauge.firstYear} ·{" "}
                {gauge.why}
              </p>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2 font-mono text-[10px] leading-relaxed text-faint">
        <span style={{ color: GLOBAL_COLOR }}>blue line</span> the global mean from
        satellite altimetry ·{" "}
        <span style={{ color: RISING_COLOR }}>warm bars</span> sea rising against
        the land · <span style={{ color: FALLING_COLOR }}>cool bars</span> sea
        falling against the land. The per-century figures are the current rate
        multiplied out, not forecasts: the rate itself is changing.
      </p>
    </section>
  );
}
