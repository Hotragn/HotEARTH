"use client";

import type { PoleTrack } from "@/lib/geomagnetism";
import { MAGNETIC_ACCENT } from "./magneticUi";

/**
 * The north dip pole's walk since 1900, on a polar projection, with its speed.
 *
 * Every dot is an iterative search for the place where the horizontal field is
 * zero, run against that epoch's coefficients. The shape of the result is the
 * story: two thirds of a century of crawling around the Canadian Arctic, then a
 * sprint over the top toward Siberia, and in the last decade a slowing down
 * again. None of that was put in by hand.
 */

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
/** Latitude at the edge of the plot. */
const EDGE_LAT = 66;
const R = SIZE / 2 - 26;

export default function PoleWalk({ track }: { track: PoleTrack }) {
  if (track.poles.length < 2) return null;

  const project = (lat: number, lon: number) => {
    // Azimuthal, north pole at the centre, 0 degrees longitude pointing down so
    // North America sits on the left the way an atlas puts it.
    const rr = ((90 - lat) / (90 - EDGE_LAT)) * R;
    const a = (lon - 90) * (Math.PI / 180);
    return { x: CX + rr * Math.cos(a), y: CY + rr * Math.sin(a) };
  };

  const pts = track.poles.map((p) => project(p.latDeg, p.lonDeg));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const first = track.poles[0];
  const last = track.poles[track.poles.length - 1];
  const speeds = track.speedKmPerYear
    .map((s, i) => ({ s, year: track.poles[i].year }))
    .filter((d): d is { s: number; year: number } => typeof d.s === "number");
  const maxSpeed = Math.max(...speeds.map((d) => d.s));
  const peak = speeds.find((d) => d.s === maxSpeed);

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Where the north magnetic pole has been
      </h2>

      <div className="mt-3 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto block h-auto w-full max-w-[320px]"
          role="img"
          aria-label={`Polar plot of the north dip pole from ${first.year} to ${last.year}. It starts in the Canadian Arctic near 70 degrees north and ends past the pole on the Siberian side, having accelerated to over 50 km per year around the year 2000.`}
        >
          {/* latitude rings */}
          {[70, 80].map((lat) => {
            const rr = ((90 - lat) / (90 - EDGE_LAT)) * R;
            return (
              <g key={lat}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={rr}
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                />
                <text
                  x={CX + 3}
                  y={CY - rr - 3}
                  fill="rgba(255,255,255,0.30)"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {lat}°N
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.16)" />

          {/* meridians, labelled so the direction of travel is readable */}
          {[
            { lon: 0, label: "0°" },
            { lon: 90, label: "90°E" },
            { lon: 180, label: "180°" },
            { lon: -90, label: "90°W" },
          ].map(({ lon, label }) => {
            const e = project(EDGE_LAT, lon);
            const t = project(EDGE_LAT - 3.5, lon);
            return (
              <g key={lon}>
                <line
                  x1={CX}
                  y1={CY}
                  x2={e.x}
                  y2={e.y}
                  stroke="rgba(255,255,255,0.08)"
                />
                <text
                  x={t.x}
                  y={t.y + 3}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.30)"
                  fontSize={9}
                  fontFamily="ui-monospace, monospace"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* the geographic pole, for scale: the dip pole walked right past it */}
          <g>
            <circle cx={CX} cy={CY} r={2.5} fill="rgba(255,255,255,0.5)" />
            <text
              x={CX + 6}
              y={CY + 3}
              fill="rgba(255,255,255,0.45)"
              fontSize={9}
              fontFamily="ui-monospace, monospace"
            >
              true north
            </text>
          </g>

          <path d={path} fill="none" stroke={MAGNETIC_ACCENT} strokeWidth={1.6} strokeOpacity={0.75} />

          {pts.map((p, i) => {
            const y = track.poles[i].year;
            // Label every fifty years and the last point only. Every twenty-five
            // put 1900, 1925 and 1950 within a few pixels of each other, because
            // the pole barely moved in that half century, which is the point the
            // plot is making and not something to write over.
            const decade = y % 50 === 0 || i === pts.length - 1;
            return (
              <g key={y}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={decade ? 3 : 1.8}
                  fill={MAGNETIC_ACCENT}
                  fillOpacity={0.35 + 0.65 * (i / (pts.length - 1))}
                />
                {decade && (
                  <text
                    x={p.x + 6}
                    y={p.y - 4}
                    fill="rgba(255,255,255,0.55)"
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                  >
                    {y}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <div>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            How fast, per five-year step
          </h3>
          <ul className="mt-2 space-y-[3px]">
            {speeds
              .filter((_, i) => i % 2 === 0 || speeds.length < 14)
              .map((d) => (
                <li key={d.year} className="flex items-center gap-2">
                  <span className="w-9 font-mono text-[10px] text-faint">{d.year}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (d.s / maxSpeed) * 100)}%`,
                        backgroundColor: MAGNETIC_ACCENT,
                        opacity: 0.45 + 0.55 * (d.s / maxSpeed),
                      }}
                    />
                  </span>
                  <span className="w-16 text-right font-mono text-[10px] text-dim">
                    {d.s.toFixed(0)} km/yr
                  </span>
                </li>
              ))}
          </ul>
          {peak && (
            <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
              Fastest in the record: {peak.s.toFixed(0)} km a year around{" "}
              {peak.year}, about ten times the rate of the 1900s. The last two
              steps are slower again, which is a real and fairly recent turn: the
              pole is not accelerating without limit, it sped up and then eased
              off.
            </p>
          )}
        </div>
      </div>

      <p className="mt-2 border-t border-line/60 pt-2 font-mono text-[10px] leading-relaxed text-faint">
        Each point is an iterative search for zero horizontal field in that
        epoch&apos;s coefficients, not a position read off a table. The last point
        sits past the last epoch, where the model is the published secular
        variation carried forward, so it is a projection of the field rather than
        a measurement of it.
      </p>
    </section>
  );
}
