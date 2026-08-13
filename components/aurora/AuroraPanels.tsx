"use client";

import {
  BZ_NOTE,
  CHANCE_LABEL,
  DIPOLE_LIMIT_NOTE,
  EMISSION_ALTITUDE_KM,
  FORECAST_LIMIT_NOTE,
  GEOMAGNETIC_NOTE,
  KP_NOTE,
  NO_WEATHER_NOTE,
  OVATION_NOTE,
  horizonRangeDeg,
  horizonRangeKm,
  type AuroraVerdict,
  type GScaleInfo,
  type KpSample,
  type SolarWind,
} from "@/lib/aurora";
import {
  AURORA_ACCENT,
  CHANCE_COLOR,
  DOCS_BASE,
  SWPC_CREDIT,
  SWPC_PAGE,
  fmtDegrees,
  fmtKp,
  fmtLat,
  fmtNt,
  fmtPercent,
  fmtRelative,
  fmtSpeed,
  fmtTimeUtc,
} from "./auroraUi";

// ─────────────────────────────── the verdict ────────────────────────────────

export function VerdictCard({
  verdict,
  kp,
  g,
  placeLabel,
  darkHours,
  moonNote,
}: {
  verdict: AuroraVerdict | null;
  kp: number | null;
  g: GScaleInfo | null;
  placeLabel: string;
  darkHours: number | null;
  moonNote: string | null;
}) {
  if (!verdict) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="text-[11px] leading-snug text-dim">
          Set a location to get an answer for where you are. The tab shares the
          place you picked on the Tonight tab.
        </p>
      </section>
    );
  }

  const color = CHANCE_COLOR[verdict.chance];
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        From {placeLabel}
      </h2>
      <p
        className="mt-1 font-display text-xl font-medium leading-tight tracking-tight"
        style={{ color }}
      >
        {CHANCE_LABEL[verdict.chance]}
      </p>

      <dl className="mt-3">
        <Row
          label="Your geomagnetic latitude"
          value={fmtLat(verdict.geomagneticLat)}
          note="This, not your geographic latitude, is what decides it."
          color={AURORA_ACCENT}
        />
        <Row
          label={`Oval edge at Kp ${fmtKp(kp)}`}
          value={fmtLat(verdict.hemisphere === "north" ? verdict.boundaryLat : -verdict.boundaryLat)}
          note="Equatorward edge of the auroral oval, from NOAA's published table."
        />
        <Row
          label={verdict.degreesFromOval <= 0 ? "Inside the oval by" : "Short of the oval by"}
          value={fmtDegrees(verdict.degreesFromOval)}
          note={
            verdict.degreesFromOval <= 0
              ? "You are poleward of the edge, so the aurora is above you rather than off in the distance."
              : `The green layer at ${EMISSION_ALTITUDE_KM.green} km clears the horizon out to about ${fmtDegrees(horizonRangeDeg(EMISSION_ALTITUDE_KM.green))}, the red layer at ${EMISSION_ALTITUDE_KM.red} km out to about ${fmtDegrees(horizonRangeDeg(EMISSION_ALTITUDE_KM.red))}.`
          }
        />
        {verdict.overheadProbability !== null && (
          <Row
            label="NOAA model, overhead here"
            value={fmtPercent(verdict.overheadProbability)}
            note="OVATION's own probability of visible aurora directly overhead. A zero here does not mean nothing is visible: the oval may still be north of you and within horizon range."
          />
        )}
      </dl>

      {/* the cross-check that actually decides the night */}
      <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          And is it dark there
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          {darkHours === null
            ? "Darkness could not be computed for this place."
            : darkHours <= 0
              ? "There is no astronomical darkness at this latitude tonight, so even a strong oval overhead has to compete with a sky that never fully darkens. This is the summer problem at aurora latitudes."
              : `About ${darkHours.toFixed(1)} hours of astronomical darkness tonight.`}
          {moonNote ? ` ${moonNote}` : ""}
        </p>
      </div>

      {g && (
        <p className="mt-2 text-[11px] leading-relaxed text-dim">
          <span className="text-ice">
            {g.scale} {g.label}.
          </span>{" "}
          {g.note}
        </p>
      )}
    </section>
  );
}

function Row({
  label,
  value,
  note,
  color,
}: {
  label: string;
  value: string;
  note?: string;
  color?: string;
}) {
  return (
    <div className="border-t border-line/60 py-1.5 first:border-t-0 first:pt-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </dt>
      <dd
        className="mt-0.5 font-mono text-[12px] text-ice"
        style={color ? { color } : undefined}
      >
        {value}
      </dd>
      {note && <p className="mt-0.5 text-[10px] leading-snug text-faint">{note}</p>}
    </div>
  );
}

// ─────────────────────── the geographic / geomagnetic gap ───────────────────

export function GeomagneticCard({
  comparisons,
}: {
  comparisons: Array<{ name: string; geographic: number; geomagnetic: number }>;
}) {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Why latitude lies
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{GEOMAGNETIC_NOTE}</p>

      <table className="mt-3 w-full font-mono text-[10px]">
        <thead>
          <tr className="text-faint">
            <th className="pb-1 text-left font-normal uppercase tracking-[0.12em]">place</th>
            <th className="pb-1 text-right font-normal uppercase tracking-[0.12em]">geographic</th>
            <th className="pb-1 text-right font-normal uppercase tracking-[0.12em]">geomagnetic</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((c) => (
            <tr key={c.name} className="border-t border-line/60">
              <td className="py-1 text-dim">{c.name}</td>
              <td className="py-1 text-right text-faint">{c.geographic.toFixed(1)}°</td>
              <td
                className="py-1 text-right"
                style={{ color: c.geomagnetic >= 55 ? AURORA_ACCENT : undefined }}
              >
                {c.geomagnetic.toFixed(1)}°
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-snug text-faint">
        {DIPOLE_LIMIT_NOTE}
      </p>
    </section>
  );
}

// ───────────────────────────── the solar wind ───────────────────────────────

export function SolarWindCard({ wind, now }: { wind: SolarWind; now: Date }) {
  const southward = typeof wind.bzNt === "number" && wind.bzNt < 0;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The wind arriving now
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="Speed" value={fmtSpeed(wind.speedKmS)} />
        <Stat label="Field strength" value={fmtNt(wind.btNt)} />
        <Stat
          label="Bz"
          value={fmtNt(wind.bzNt)}
          color={southward ? AURORA_ACCENT : undefined}
          hint={southward ? "southward" : "northward"}
        />
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-faint">
        {BZ_NOTE}
        {wind.time ? ` Measured ${fmtRelative(wind.time, now)} at DSCOVR, about 1.5 million km upstream.` : ""}
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p
        className="mt-0.5 font-mono text-[13px] text-ice"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
      {hint && <p className="font-mono text-[9px] text-faint">{hint}</p>}
    </div>
  );
}

// ───────────────────────────── honesty panel ────────────────────────────────

export function AuroraHonesty({
  grid,
  now,
}: {
  grid: { observationTime: Date | null; forecastTime: Date | null } | null;
  now: Date;
}) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        What is real, what is computed
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {OVATION_NOTE}
      </p>
      {grid?.forecastTime && (
        <p className="mt-1.5 font-mono text-[10px] text-faint">
          This grid: observed {fmtTimeUtc(grid.observationTime)}, valid for{" "}
          {fmtTimeUtc(grid.forecastTime)} ({fmtRelative(grid.forecastTime, now)}).
        </p>
      )}
      <ul className="mt-3 space-y-2 text-[11px] leading-snug text-dim">
        <Item tag="Kp is planetary:" tagClass="text-amber-200/90" body={KP_NOTE} />
        <Item tag="A dipole, not the field:" tagClass="text-sky-300/90" body={DIPOLE_LIMIT_NOTE} />
        <Item tag="Past an hour:" tagClass="text-fuchsia-300/90" body={FORECAST_LIMIT_NOTE} />
        <Item tag="No weather:" tagClass="text-emerald-300/90" body={NO_WEATHER_NOTE} />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        {SWPC_CREDIT} Geomagnetic coordinates, the oval-edge lookup, horizon
        ranges and the verdict are computed by lib/aurora; the feeds supply Kp,
        the OVATION grid and the solar wind, and nothing else.{" "}
        <a
          href={SWPC_PAGE}
          target="_blank"
          rel="noreferrer"
          className="text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          NOAA&apos;s own forecast
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/AURORA_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the physics
        </a>
      </p>
    </section>
  );
}

function Item({
  tag,
  tagClass,
  body,
}: {
  tag: string;
  tagClass: string;
  body: string;
}) {
  return (
    <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
      <span className={tagClass}>{tag} </span>
      {body}
    </li>
  );
}

// ────────────────────────────── the Kp strip ────────────────────────────────

const STRIP_W = 900;
const STRIP_H = 150;
const STRIP_PAD_L = 34;
const STRIP_PAD_B = 26;
const STRIP_PAD_T = 12;

/**
 * The 3-day Kp outlook: observed bars solid, predicted bars hollow, with the
 * G1 storm line drawn across. Keeping observed and predicted visually distinct
 * matters, because the whole point of the panel is that the right-hand half is
 * a guess.
 */
export function KpStrip({ samples }: { samples: KpSample[] }) {
  if (samples.length < 2) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[11px] text-dim">
          The Kp outlook could not be read from NOAA.
        </p>
      </section>
    );
  }

  const n = samples.length;
  const barW = (STRIP_W - STRIP_PAD_L - 10) / n;
  const y = (kp: number) =>
    STRIP_H - STRIP_PAD_B - (Math.min(9, Math.max(0, kp)) / 9) * (STRIP_H - STRIP_PAD_T - STRIP_PAD_B);

  const firstPredicted = samples.findIndex((s) => !s.observed);

  return (
    <section className="hud-panel rounded-2xl p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          The next three days
        </h2>
        <p className="font-mono text-[10px] text-faint">
          solid = measured · hollow = NOAA&apos;s outlook
        </p>
      </div>
      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
          className="block h-auto w-full min-w-[560px] sm:min-w-0"
          role="img"
          aria-label={`Planetary K index over three days, ${samples.length} three-hourly values, peaking at ${Math.max(...samples.map((s) => s.kp)).toFixed(1)}.`}
        >
          {/* Kp gridlines, with the storm threshold called out */}
          {[0, 3, 5, 7, 9].map((k) => (
            <g key={k}>
              <line
                x1={STRIP_PAD_L}
                y1={y(k)}
                x2={STRIP_W - 10}
                y2={y(k)}
                stroke={k === 5 ? "rgba(255,210,122,0.35)" : "rgba(255,255,255,0.08)"}
                strokeDasharray={k === 5 ? "4 4" : undefined}
              />
              <text
                x={STRIP_PAD_L - 6}
                y={y(k) + 3.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.38)"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {k}
              </text>
            </g>
          ))}
          <text
            x={STRIP_W - 12}
            y={y(5) - 5}
            textAnchor="end"
            fill="rgba(255,210,122,0.75)"
            fontSize={9.5}
            fontFamily="ui-monospace, monospace"
          >
            G1 storm
          </text>

          {samples.map((s, i) => {
            const x = STRIP_PAD_L + i * barW;
            const top = y(s.kp);
            const stormy = s.kp >= 5;
            return (
              <rect
                key={s.time.getTime()}
                x={x + 0.5}
                y={top}
                width={Math.max(1, barW - 1.5)}
                height={Math.max(0.5, STRIP_H - STRIP_PAD_B - top)}
                fill={s.observed ? (stormy ? "#ffb86b" : AURORA_ACCENT) : "none"}
                fillOpacity={s.observed ? 0.85 : 0}
                stroke={s.observed ? "none" : stormy ? "#ffb86b" : AURORA_ACCENT}
                strokeOpacity={0.7}
              />
            );
          })}

          {/* where measurement ends and guessing begins */}
          {firstPredicted > 0 && (
            <line
              x1={STRIP_PAD_L + firstPredicted * barW}
              y1={STRIP_PAD_T}
              x2={STRIP_PAD_L + firstPredicted * barW}
              y2={STRIP_H - STRIP_PAD_B}
              stroke="rgba(255,255,255,0.35)"
            />
          )}

          {/* day labels */}
          {samples.map((s, i) =>
            s.time.getUTCHours() === 0 ? (
              <text
                key={`d${s.time.getTime()}`}
                x={STRIP_PAD_L + i * barW}
                y={STRIP_H - STRIP_PAD_B + 14}
                fill="rgba(255,255,255,0.4)"
                fontSize={10}
                fontFamily="ui-monospace, monospace"
              >
                {s.time.toLocaleDateString([], { month: "short", day: "numeric" })}
              </text>
            ) : null
          )}
        </svg>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-faint">
        {FORECAST_LIMIT_NOTE}
      </p>
    </section>
  );
}

/** Small helper so the app can show the horizon geometry once, in words. */
export function horizonSummary(): string {
  const green = horizonRangeKm(EMISSION_ALTITUDE_KM.green);
  const red = horizonRangeKm(EMISSION_ALTITUDE_KM.red);
  if (green === null || red === null) return "";
  return `Green aurora at ${EMISSION_ALTITUDE_KM.green} km stays above the horizon out to about ${Math.round(green)} km; the red emission at ${EMISSION_ALTITUDE_KM.red} km reaches about ${Math.round(red)} km.`;
}
