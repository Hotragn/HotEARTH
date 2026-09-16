"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, X } from "@phosphor-icons/react";
import {
  bestViewingTime,
  fmtActivityWindow,
  fmtAltitude,
  fmtMoon,
  fmtObservedRate,
  fmtSolarLongitude,
  fmtRaDec,
  fmtVelocity,
  fmtZhr,
  isAsteroidParent,
  moonAtPeak,
  monthDayLabel,
  observedRateEstimate,
  parentCrossLink,
  parentLabel,
  radiantAltAz,
  strengthStyle,
  velocityStyle,
  type MeteorShowerRecord,
} from "@/lib/meteor-facts";
import { METEOR_ACCENT, type Observer } from "./constants";

/**
 * Per-shower detail. Everything measured (radiant, peak, solar longitude, window,
 * velocity, parent) is shown verbatim; everything computed (observed-rate
 * estimate, radiant altitude, best time, moon phase at peak) is labelled as such.
 * The ZHR is explicitly the IDEAL peak rate; beside it sits the altitude-corrected
 * OBSERVED estimate for the observer's place and time, which is honestly lower.
 * The parent body cross-links to Comets & Asteroids ONLY when that catalogue
 * actually carries it.
 */
export default function ShowerDetail({
  shower,
  observer,
  date,
  onClose,
}: {
  shower: MeteorShowerRecord;
  observer: Observer;
  date: Date;
  onClose: () => void;
}) {
  const dateMs = date.getTime();

  const radiant = useMemo(
    () => radiantAltAz(shower, observer.lat, observer.lon, new Date(dateMs)),
    [shower, observer.lat, observer.lon, dateMs]
  );
  const alt = radiant?.altitude ?? null;
  const observedRate = useMemo(
    () =>
      alt !== null
        ? observedRateEstimate(shower, alt, { date: new Date(dateMs) })
        : null,
    [shower, alt, dateMs]
  );
  const best = useMemo(
    () => bestViewingTime(shower, observer.lat, observer.lon, new Date(dateMs)),
    [shower, observer.lat, observer.lon, dateMs]
  );
  const moon = useMemo(() => moonAtPeak(shower), [shower]);

  const strength = strengthStyle(shower.zhr);
  const velocity = velocityStyle(shower.velocity_kms);
  const crossLink = parentCrossLink(shower);
  const radiantUp = alt !== null && alt > 0;

  const observedText =
    shower.zhr === null
      ? "Variable: no fixed ZHR to scale from"
      : !radiantUp
        ? "radiant below horizon now (0/hr)"
        : `${fmtObservedRate(observedRate)}: approx, lower than ZHR`;

  return (
    <section
      aria-label="Shower detail"
      className="pointer-events-auto absolute inset-x-3 bottom-40 animate-hud-in sm:inset-x-auto sm:left-5 sm:top-24 sm:bottom-auto sm:w-[330px]"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-13rem)] overflow-y-auto rounded-2xl p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Meteor shower
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={13} weight="light" aria-hidden />
          </button>
        </div>

        <h2 className="font-display text-2xl font-medium" style={{ color: METEOR_ACCENT }}>
          {shower.name}
        </h2>
        <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-faint">
          <span className="text-dim">{shower.code}</span>
          {shower.iau_number != null && <span>IAU #{shower.iau_number}</span>}
          {strength && (
            <span
              className="flex items-center gap-1"
              title={strength.note}
            >
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: strength.color }}
              />
              {strength.label}
            </span>
          )}
        </div>

        {/* rates: ideal ZHR vs computed observed estimate */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat
            label="Ideal peak rate (ZHR)"
            value={fmtZhr(shower.zhr)}
            sub="zenith radiant · perfect dark sky"
          />
          <Stat
            label="Observed estimate"
            value={
              shower.zhr === null || !radiantUp
                ? "–"
                : fmtObservedRate(observedRate)
            }
            sub={observedText}
          />
          <Stat label="Radiant (J2000)" value={fmtRaDec(shower)} />
          <Stat
            label="Velocity (V∞)"
            value={fmtVelocity(shower.velocity_kms)}
            sub={velocity?.label}
          />
          <Stat
            label="Peak"
            value={monthDayLabel(shower.peak_date)}
            sub={`λ☉ ${fmtSolarLongitude(shower.peak_solar_longitude)}`}
          />
          <Stat label="Active window" value={fmtActivityWindow(shower)} />
        </div>

        {/* observer-local viewing geometry */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat
            label="Radiant altitude now"
            value={radiantUp ? fmtAltitude(alt) : "below horizon"}
            sub={observer.label}
          />
          <Stat
            label="Best viewing"
            value={
              best
                ? best.date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "radiant stays down"
            }
            sub={best ? `radiant highest (${fmtAltitude(best.altitude)})` : undefined}
          />
        </div>

        {/* moon phase at peak */}
        {moon && (
          <div className="mt-3 flex items-start gap-2.5 border-t border-line pt-2.5">
            <MoonGlyph fraction={moon.fraction} waxing={moon.phase.waxing} />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
                Moon at peak · {fmtMoon(moon)}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-dim">
                {moon.note}
              </p>
            </div>
          </div>
        )}

        {/* parent body */}
        <div className="mt-3 border-t border-line pt-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
            Parent body
          </p>
          {crossLink ? (
            <Link
              href={crossLink.href}
              className="group mt-0.5 inline-flex items-center gap-1 text-[12px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
            >
              {crossLink.label}
              <ArrowUpRight
                size={12}
                weight="light"
                aria-hidden
                className="opacity-60 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
              />
            </Link>
          ) : (
            <p className="mt-0.5 text-[12px] text-dim">{parentLabel(shower)}</p>
          )}
          {shower.parent_body && isAsteroidParent(shower) && (
            <p className="mt-1 text-[10px] leading-relaxed text-solar/90">
              Asteroid parent: unusual; most streams come from comets (a
              &quot;rock-comet&quot; type source).
            </p>
          )}
          {shower.parent_body && !isAsteroidParent(shower) && !crossLink && (
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">
              Not in the Comets &amp; Asteroids catalogue, so no cross-link.
            </p>
          )}
        </div>

        {shower.note && (
          <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-relaxed text-dim">
            {shower.note}
          </p>
        )}

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          Radiant, peak, solar longitude, window, velocity and parent are catalog
          data (IAU MDC + IMO). ZHR is idealised; the observed estimate, radiant
          altitude, best time and moon phase are computed. Peaks drift ~1 day/yr:
          timing is keyed to λ☉.
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12px] tracking-wide text-dim">{value}</p>
      {sub && (
        <p className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-faint/80">
          {sub}
        </p>
      )}
    </div>
  );
}

/** A tiny illuminated-fraction moon glyph (terminator by clip), computed phase. */
function MoonGlyph({ fraction, waxing }: { fraction: number; waxing: boolean }) {
  const lit = Math.round(fraction * 100);
  // simple left/right lit half cue based on waxing/waning + fraction
  const bg = waxing
    ? `linear-gradient(90deg, #1b1f2a ${100 - lit}%, #cbd2df ${100 - lit}%)`
    : `linear-gradient(90deg, #cbd2df ${lit}%, #1b1f2a ${lit}%)`;
  return (
    <span
      aria-hidden
      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-line"
      style={{ background: bg }}
    />
  );
}
