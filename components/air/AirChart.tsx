"use client";

import { useMemo } from "react";
import { US_PM25_BREAKPOINTS, WHO_GUIDELINE_UGM3, type AirHour } from "@/lib/air";
import { AIR_ACCENT } from "./airUi";

/**
 * PM2.5 over three days, with the lines that matter drawn across it: the WHO
 * 24-hour guideline and the top of the US "Good" band.
 *
 * A bare index number tells you nothing about whether the air is clearing or
 * closing in, which is the thing a person actually wants to know before going
 * outside. The past day is included for exactly that reason.
 *
 * The reference lines are the point of the chart. Without them a PM2.5 trace is
 * an abstract wiggle; with them you can see at a glance whether you are above
 * the level the WHO considers safe, which is a different and more useful
 * question than which coloured band you are in.
 */

const VB_W = 1000;
const VB_H = 260;
const PAD_L = 46;
const PAD_R = 20;
const PAD_T = 18;
const PAD_B = 40;

export default function AirChart({
  hourly,
  now,
}: {
  hourly: AirHour[];
  now: Date;
}) {
  const points = useMemo(
    () => hourly.filter((h) => h.pm2_5 !== null && Number.isFinite(h.pm2_5)),
    [hourly]
  );

  if (points.length < 3) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[11px] text-dim">
          Not enough hourly data to draw a trend yet.
        </p>
      </section>
    );
  }

  const t0 = points[0].time.getTime();
  const t1 = points[points.length - 1].time.getTime();
  const span = Math.max(1, t1 - t0);

  const whoDaily = WHO_GUIDELINE_UGM3.pm2_5?.daily ?? 15;
  const usGoodEdge = US_PM25_BREAKPOINTS[0].cHigh;
  const peak = Math.max(...points.map((p) => p.pm2_5 as number), whoDaily * 1.3);
  const yMax = Math.ceil(peak / 5) * 5;

  const x = (ms: number) => PAD_L + ((ms - t0) / span) * (VB_W - PAD_L - PAD_R);
  const y = (v: number) =>
    VB_H - PAD_B - (Math.max(0, Math.min(v, yMax)) / yMax) * (VB_H - PAD_T - PAD_B);

  const path = points.map((p) => `${x(p.time.getTime()).toFixed(1)},${y(p.pm2_5 as number).toFixed(1)}`).join(" ");
  const nowX = x(Math.min(Math.max(now.getTime(), t0), t1));

  // midnight ticks, which is how a person reads a multi-day chart
  const ticks: Array<{ ms: number; label: string }> = [];
  const d = new Date(t0);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  for (let ms = d.getTime(); ms <= t1; ms += 6 * 3_600_000) {
    ticks.push({
      ms,
      label: new Date(ms).toLocaleTimeString([], { hour: "2-digit" }),
    });
  }

  return (
    <section className="hud-panel rounded-2xl p-4">
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          PM2.5, yesterday through tomorrow
        </h2>
        <p className="font-mono text-[10px] text-faint">
          past day measured-and-modelled, ahead of now forecast
        </p>
      </div>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="block h-auto w-full min-w-[620px] sm:min-w-0"
          role="img"
          aria-label={`PM2.5 concentration over three days, peaking at ${Math.round(peak)} micrograms per cubic metre, against a WHO 24-hour guideline of ${whoDaily}.`}
        >
          {/* the two lines that give the trace meaning */}
          {[
            { v: whoDaily, label: `WHO 24 h guideline ${whoDaily}`, color: "rgba(255,210,122,0.75)" },
            { v: usGoodEdge, label: `top of US Good ${usGoodEdge}`, color: "rgba(125,255,192,0.55)" },
          ].map((line) => (
            <g key={line.label}>
              <line
                x1={PAD_L}
                y1={y(line.v)}
                x2={VB_W - PAD_R}
                y2={y(line.v)}
                stroke={line.color}
                strokeDasharray="5 4"
              />
              <text
                x={VB_W - PAD_R}
                y={y(line.v) - 5}
                textAnchor="end"
                fill={line.color}
                fontSize={10.5}
                fontFamily="ui-monospace, monospace"
              >
                {line.label}
              </text>
            </g>
          ))}

          {/* y axis */}
          {[0, 0.5, 1].map((f) => {
            const v = Math.round(yMax * f);
            return (
              <g key={f}>
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
            );
          })}

          {/* now */}
          <line
            x1={nowX}
            y1={PAD_T}
            x2={nowX}
            y2={VB_H - PAD_B}
            stroke="rgba(255,255,255,0.3)"
          />
          <text
            x={nowX + 4}
            y={PAD_T + 10}
            fill="rgba(255,255,255,0.5)"
            fontSize={10}
            fontFamily="ui-monospace, monospace"
          >
            now
          </text>

          <polyline points={path} fill="none" stroke={AIR_ACCENT} strokeWidth={1.8} />

          {ticks.map((t) => (
            <text
              key={t.ms}
              x={x(t.ms)}
              y={VB_H - PAD_B + 16}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize={10}
              fontFamily="ui-monospace, monospace"
            >
              {t.label}
            </text>
          ))}

          <text
            x={16}
            y={(PAD_T + VB_H - PAD_B) / 2}
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize={10.5}
            fontFamily="ui-monospace, monospace"
            transform={`rotate(-90 16 ${(PAD_T + VB_H - PAD_B) / 2})`}
          >
            µg/m³
          </text>
        </svg>
      </div>
    </section>
  );
}
