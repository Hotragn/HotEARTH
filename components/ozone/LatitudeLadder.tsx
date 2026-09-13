"use client";

import type { StationRung } from "@/lib/ozone";
import { HOLE_COLOR, fmtDu, fmtPercent, monthName } from "./ozoneUi";

/**
 * Five ground stations, one row each, twelve months across.
 *
 * This settles the physics without a model and without a satellite. Every row
 * is the same calculation on the same instrument type: mean total column before
 * the hole existed against mean total column over the last fifteen years, month
 * by month, at one place.
 *
 * The rows are ordered by latitude, so the eye runs from the South Pole to the
 * Arctic. The South Pole row has a crater in October. Utqiagvik, which is 71
 * North and spends months in darkness under the same global chlorine, is nearly
 * flat. Latitude and darkness are not the variable.
 *
 * EVERY ROW SHARES ONE SCALE, set by the worst cell anywhere in the figure. A
 * per-row scale would make Utqiagvik's three percent look like the South Pole's
 * forty-seven, which is the single most misleading thing this figure could do.
 *
 * A station with no before, like Lauder, gets a row that says so rather than a
 * row of empty cells that could be mistaken for no change.
 */

const CELL = 46;
const ROW_H = 34;
const LABEL_W = 176;
const HEAD_H = 20;

export default function LatitudeLadder({
  rungs,
  before,
  after,
}: {
  rungs: readonly StationRung[];
  before: [number, number];
  after: [number, number];
}) {
  if (rungs.length === 0) return null;

  const worst = Math.max(
    1,
    ...rungs.flatMap((r) => r.changes.map((c) => Math.abs(Math.min(c.percent, 0))))
  );

  const width = LABEL_W + CELL * 12;
  const height = HEAD_H + ROW_H * rungs.length;

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          Where the ozone actually went, month by month, at five huts
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {before[0]}–{before[1]} against {after[0]} onward · one shared scale
        </p>
      </figcaption>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`Five ground stations ordered by latitude, each showing the change in monthly mean total ozone between ${before[0]} to ${before[1]} and ${after[0]} onward. The South Pole row is deeply shaded in October and November. Utqiagvik at 71 North, equally polar, is almost unshaded in every month.`}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <text
              key={m}
              x={LABEL_W + CELL * (m - 0.5)}
              y={HEAD_H - 7}
              textAnchor="middle"
              className="fill-faint font-mono"
              fontSize={9}
            >
              {monthName(m)}
            </text>
          ))}

          {rungs.map((rung, row) => {
            const y = HEAD_H + row * ROW_H;
            const byMonth = new Map(rung.changes.map((c) => [c.month, c]));
            return (
              <g key={rung.station.code}>
                <text
                  x={0}
                  y={y + ROW_H / 2 - 2}
                  className="fill-ice font-mono"
                  fontSize={10.5}
                >
                  {rung.station.name}
                </text>
                <text x={0} y={y + ROW_H / 2 + 10} className="fill-faint font-mono" fontSize={9}>
                  {rung.station.lat >= 0
                    ? `${rung.station.lat.toFixed(1)} north`
                    : `${Math.abs(rung.station.lat).toFixed(1)} south`}
                </text>

                {rung.changes.length === 0 ? (
                  <text
                    x={LABEL_W + 6}
                    y={y + ROW_H / 2 + 4}
                    className="fill-faint font-mono"
                    fontSize={9.5}
                  >
                    started observing in {rung.station.months[0]?.slice(0, 4) ?? "?"}, after the
                    hole existed. No before to compare against.
                  </text>
                ) : (
                  Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const c = byMonth.get(m);
                    const x = LABEL_W + CELL * (m - 1);
                    if (!c) {
                      return (
                        <rect
                          key={m}
                          x={x + 1}
                          y={y + 3}
                          width={CELL - 2}
                          height={ROW_H - 6}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={0.5}
                          strokeDasharray="2 3"
                          className="text-line"
                        />
                      );
                    }
                    const loss = Math.max(0, -c.percent);
                    return (
                      <g key={m}>
                        <title>
                          {`${rung.station.name}, ${monthName(m)}: ${fmtDu(c.beforeDu)} in ${before[0]}-${before[1]} (${c.beforeYears} years), ${fmtDu(c.afterDu)} since ${after[0]} (${c.afterYears} years), ${fmtPercent(c.percent)}`}
                        </title>
                        <rect
                          x={x + 1}
                          y={y + 3}
                          width={CELL - 2}
                          height={ROW_H - 6}
                          fill={HOLE_COLOR}
                          opacity={0.08 + 0.82 * (loss / worst)}
                        />
                        <text
                          x={x + CELL / 2}
                          y={y + ROW_H / 2 + 3}
                          textAnchor="middle"
                          className="font-mono"
                          fontSize={9.5}
                          fill={loss / worst > 0.55 ? "#0b0e14" : "currentColor"}
                          opacity={loss / worst > 0.55 ? 1 : 0.85}
                        >
                          {c.percent.toFixed(0)}%
                        </text>
                      </g>
                    );
                  })
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        Shading runs from nothing to {worst.toFixed(0)} percent lost, the worst cell in the figure,
        and every row is on that one scale. A dashed cell is a month one of the two eras never
        observed. The South Pole has no March and no September for a reason that is in the data:
        at the equinox the sun sits on the horizon and the light reaching the instrument has come
        through more than seven atmospheres, against about five in October.
      </p>
    </figure>
  );
}
