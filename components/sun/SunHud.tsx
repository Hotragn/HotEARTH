"use client";

import {
  SUN,
  angularDiameterDegFromKm,
  AU_KM,
  carringtonRotationNumber,
  siderealRotationPeriodDays,
  solarCycleInfo,
  subEarthCarringtonLongitude,
} from "@/lib/sun";

/**
 * Top-left HUD: the Sun as a body. Every number is a deterministic function of
 * the constants in lib/sun (IAU 2015 nominal values) or of the current UTC time
 * (Carrington rotation, differential rotation, Cycle-25 phase). The cycle phase
 * is a labelled timing approximation: the observed/predicted truth lives in the
 * solar-cycle chart.
 */
export default function SunHud({ nowMs }: { nowMs: number }) {
  const now = new Date(nowMs);
  const cr = carringtonRotationNumber(now);
  const l0 = subEarthCarringtonLongitude(now);
  const eqPeriod = siderealRotationPeriodDays(0);
  const polePeriod = siderealRotationPeriodDays(90);
  const cycle = solarCycleInfo(now);
  const angDiam = angularDiameterDegFromKm(AU_KM);

  return (
    <section
      aria-label="The Sun as a body"
      className="pointer-events-auto absolute left-3 top-20 w-[250px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          The Sun
        </p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-medium text-ice">
            {SUN.radiusInEarthRadii.toFixed(0)} R⊕
          </span>
          <span className="text-sm text-[#ffb24d]">
            {SUN.radiusKm.toLocaleString()} km
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-faint">
          radius · {SUN.effectiveTemperatureK.toLocaleString()} K surface (T_eff)
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat
            label="Carrington rot."
            value={cr !== null ? `CR ${Math.floor(cr)}` : "–"}
            title="Carrington rotation number: the historical bookkeeping rotation of the Sun (mean synodic 27.2753 d)."
          />
          <Stat
            label="Central meridian"
            value={l0 !== null ? `L0 ${l0.toFixed(0)}°` : "–"}
            title="Approximate sub-Earth Carrington longitude of the central meridian (few-degree accuracy, display only)."
          />
          <Stat
            label="Rotation (eq→pole)"
            value={
              eqPeriod !== null && polePeriod !== null
                ? `${eqPeriod.toFixed(1)}→${polePeriod.toFixed(1)} d`
                : "–"
            }
            title="Differential rotation (Snodgrass & Ulrich 1990): the photosphere spins fastest at the equator (~24.5 d) and slowest at the poles (~34 d)."
          />
          <Stat
            label="Angular size @1 au"
            value={angDiam !== null ? `${angDiam.toFixed(3)}°` : "–"}
            title="Angular diameter of the solar disk seen from Earth (~0.53°, half a degree)."
          />
        </div>

        {/* Solar cycle phase: a labelled timing approximation */}
        {cycle && (
          <div
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2"
            title="Approximate Cycle-25 phase from timing (minimum Dec 2019, ~11-yr length). The observed vs SWPC-predicted sunspot curve is the real record: see the solar-cycle chart."
          >
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full bg-[#ffb24d]"
            />
            <div className="min-w-0">
              <p className="truncate text-xs text-ice">
                Solar Cycle {cycle.cycleNumber} · {cycle.phaseLabel}
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
                approx phase · not a forecast
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  title,
}: {
  label: string;
  value: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[13px] tracking-wide text-dim">
        {value}
      </p>
    </div>
  );
}
