"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { PLANETS, planetState } from "@/lib/planets";
import { PLANET_FACTS, type DetailPlanetName } from "@/lib/planet-facts";

const DAY_MS = 86_400_000;

/**
 * Per-body detail HUD. Prints the common facts (temperature, equatorial radius,
 * day length, orbital period, axial tilt, live distance from the Sun) alongside
 * the honest per-body notes and named features. Every printed number is either
 * computed live from lib/planets (distance, sub-solar point, season, solar day)
 * or transcribed from constants.json via lib/planet-facts (temperature,
 * features): nothing is invented. A prominent banner states the honesty bar.
 */
export default function PlanetHud({
  name,
  nowMs,
  offsetDays,
  onBack,
}: {
  name: DetailPlanetName;
  nowMs: number;
  offsetDays: number;
  onBack: () => void;
}) {
  const facts = PLANET_FACTS[name];
  const phys = PLANETS[name].physical;
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const st = planetState(name, date);

  const solarDay = st.solarDayEarthDays;
  const dayLabel =
    solarDay < 2
      ? `${(solarDay * 24).toFixed(1)} h`
      : `${solarDay.toFixed(1)} d`;
  const subLat = `${Math.abs(st.subsolar.lat).toFixed(1)}°${st.subsolar.lat >= 0 ? "N" : "S"}`;

  const tempValue = facts.tempExtremesC
    ? `+${facts.tempExtremesC.dayMax}° / ${facts.tempExtremesC.nightMin}°C`
    : `${facts.meanTempC}°C`;
  const tempTitle = facts.tempExtremesC
    ? facts.tempExtremesC.note
    : `${facts.tempKind}: NASA NSSDC Planetary Fact Sheet`;

  return (
    <section
      aria-label={`${name} facts`}
      className="pointer-events-auto absolute left-3 top-20 w-[268px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-14rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          Orrery
        </button>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {facts.type}
          </p>
          {st.retrograde && (
            <span
              title="Retrograde rotation (spins opposite its orbital motion)"
              className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-faint"
            >
              retrograde
            </span>
          )}
        </div>
        <h2
          className="mt-1 font-display text-2xl font-medium"
          style={{ color: facts.accent }}
        >
          {name}
        </h2>
        <p className="mt-1 text-xs leading-snug text-dim">{facts.headline}</p>

        {/* honesty banner */}
        <p className="mt-3 rounded-xl border border-solar/25 bg-solar/[0.06] px-3 py-2 text-[10px] leading-relaxed text-dim">
          No live weather feed exists for this world. Orbital mechanics and
          rotation are computed; wind profiles are measured / climatological
          averages, not forecasts.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat
            label={facts.tempExtremesC ? "Surface temp" : facts.noSolidSurface ? "Temp (1-bar)" : "Mean temp"}
            value={tempValue}
            title={tempTitle}
          />
          <Stat label="Equatorial R" value={`${phys.equatorialRadiusKm.toLocaleString()} km`} />
          <Stat label="Day (solar)" value={dayLabel} title="Mean solar day, derived from sidereal rotation + orbital period" />
          <Stat label="Orbit period" value={`${phys.orbitalPeriodYears.toFixed(2)} yr`} />
          <Stat label="Axial tilt" value={`${phys.obliquityDeg.toFixed(1)}°`} title="Obliquity to orbit (NASA Fact Sheet)" />
          <Stat label="Distance" value={`${st.position.distanceAU.toFixed(3)} AU`} title="Live heliocentric distance (JPL Keplerian elements)" />
          <Stat label="Subsolar lat" value={subLat} title="Solar declination: the modelled seasonal latitude" />
          <Stat label="Modelled season" value={st.season.replace("Northern ", "N. ")} title="Season cycle position (adopted reference), not calendar-anchored" />
        </div>

        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {facts.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-dim">
              <span aria-hidden style={{ color: facts.accent }}>
                ·
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>

        {facts.features && facts.features.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            {facts.features.map((f) => (
              <div key={f.label} className="rounded-xl border border-line px-3 py-2">
                <p className="flex items-center gap-2 text-xs text-ice">
                  {f.label}
                  {f.transient && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar">
                      transient
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-faint">
                  {f.detail}
                </p>
              </div>
            ))}
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
      <p className="mt-0.5 font-mono text-[12px] tracking-wide text-dim">
        {value}
      </p>
    </div>
  );
}
