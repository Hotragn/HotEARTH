"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import {
  DIRECTLY_IMAGED_NOTE,
  EXO_ACCENT,
  HZ_GREEN,
  ILLUSTRATIVE_APPEARANCE,
  displayName,
  exoPlanetDerived,
  fmtAU,
  fmtDays,
  fmtEcc,
  fmtInsol,
  fmtLy,
  fmtMass,
  fmtRadius,
  fmtTempK,
  isMinimumMass,
  lsunFromLogLum,
  starTypeLabel,
  type ExoPlanet,
  type ExoSystemData,
} from "@/lib/exo-facts";

/**
 * Per-planet detail HUD. Prints the MEASURED archive parameters with units
 * (radius, mass, flagged as a minimum mass for RV planets, period, sma,
 * eccentricity, equilibrium temperature, insolation, discovery method/year) and
 * the host-star facts, then the COMPUTED layers (equilibrium temperature when
 * the archive has none, composition estimate, HZ membership), each labelled as
 * computed/estimated. Missing values render "not measured", never a guess. The
 * illustrative-appearance disclaimer is prominent; directly-imaged planets carry
 * the "unresolved point of light" note.
 */
export default function ExoPlanetHud({
  planet,
  system,
  onBack,
}: {
  planet: ExoPlanet & { name: string };
  system: ExoSystemData;
  onBack: () => void;
}) {
  const star = system.star;
  const lumLinear = lsunFromLogLum(star.lum);
  const ed = exoPlanetDerived(planet, { teff: star.teff, lum: lumLinear });

  const eqtMeasured =
    typeof planet.eqt_k === "number" && Number.isFinite(planet.eqt_k);
  const eqtTag = eqtMeasured ? "measured" : ed.eqtComputed ? "computed" : null;
  const minMass = isMinimumMass(planet);
  const imaged = planet.directly_imaged === true;

  const hzBadge =
    ed.inHabitableZone === true
      ? { text: "In habitable zone", color: HZ_GREEN }
      : ed.inHabitableZone === false
        ? { text: "Outside habitable zone", color: "#9aa2b1" }
        : { text: "HZ membership unknown", color: "#626a7a" };

  return (
    <section
      aria-label={`${planet.name} facts`}
      className="pointer-events-auto absolute left-3 top-20 w-[300px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          {displayName(system)} system
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {system.hostname}
          </p>
          {imaged && (
            <span className="rounded-full border border-solar/40 bg-solar/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar">
              directly imaged
            </span>
          )}
        </div>

        <h2 className="mt-1 font-display text-2xl font-medium" style={{ color: EXO_ACCENT }}>
          {planet.name}
        </h2>

        {/* HZ + composition badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
            style={{
              borderColor: `${hzBadge.color}66`,
              backgroundColor: `${hzBadge.color}14`,
              color: hzBadge.color,
            }}
          >
            {hzBadge.text}
          </span>
          {ed.composition && (
            <span
              title={ed.composition.note}
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-dim"
            >
              {ed.composition.label} · est.
            </span>
          )}
        </div>

        {/* illustrative disclaimer (prominent) */}
        <div className="mt-3 rounded-xl border border-solar/30 bg-solar/[0.08] px-3 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
            Illustrative appearance
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-dim">
            {ILLUSTRATIVE_APPEARANCE}
          </p>
          {imaged && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-dim/90">
              {DIRECTLY_IMAGED_NOTE}
            </p>
          )}
        </div>

        {/* measured parameters */}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Measured
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat label="Radius" value={fmtRadius(planet.radius_re)} />
          <Stat
            label="Mass"
            value={fmtMass(planet.mass_me)}
            sub={minMass && planet.mass_me != null ? "minimum mass (M·sin i)" : undefined}
            title={
              minMass
                ? "Radial-velocity mass is a lower limit: the true mass depends on the unknown orbital inclination."
                : undefined
            }
          />
          <Stat label="Orbital period" value={fmtDays(planet.period_days)} />
          <Stat label="Semi-major axis" value={fmtAU(planet.sma_au)} />
          <Stat label="Eccentricity" value={fmtEcc(planet.ecc)} />
          <Stat
            label="Equilibrium temp"
            value={fmtTempK(ed.eqtK)}
            sub={eqtTag ?? undefined}
            title={
              eqtTag === "computed"
                ? "Computed from radiative balance (albedo 0.3); the archive has no measured value."
                : "Equilibrium (black-body) temperature; ignores greenhouse warming."
            }
          />
          <Stat label="Insolation" value={fmtInsol(planet.insol)} />
          <Stat
            label="Discovered"
            value={
              planet.disc_year != null
                ? `${planet.disc_year}`
                : "not measured"
            }
            sub={planet.method ?? undefined}
          />
        </div>

        {/* host star */}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Host star
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat label="Type" value={starTypeLabel(star)} />
          <Stat
            label="Temperature"
            value={
              star.teff != null
                ? `${Math.round(star.teff).toLocaleString()} K`
                : "not measured"
            }
          />
          <Stat label="Distance" value={fmtLy(system.distance_ly ?? null)} />
          <Stat
            label="Radius"
            value={star.rad != null ? `${star.rad.toFixed(2)} R☉` : "not measured"}
          />
        </div>

        {ed.solarSystem && (
          <p className="mt-3 border-t border-line pt-2.5 text-[10px] leading-relaxed text-dim">
            <span className="text-faint">Compared to our system: </span>
            {ed.solarSystem.label}.
          </p>
        )}

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          Values: NASA Exoplanet Archive. Composition + habitable-zone membership
          are computed estimates (see About).
        </p>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  title,
}: {
  label: string;
  value: string;
  sub?: string;
  title?: string;
}) {
  return (
    <div title={title}>
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
