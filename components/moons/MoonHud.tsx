"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import {
  MOONS,
  dayLengthDays,
  moonSnapshot,
  type MoonName,
} from "@/lib/moons";
import {
  MOON_FACTS,
  TEXTURE_CAVEAT,
  honestBanner,
  type MoonConstantsExtra,
  type MoonPhenomena,
} from "@/lib/moon-facts";

const DAY_MS = 86_400_000;

/**
 * Per-moon detail HUD. Prints the common physical/orbital facts (parent, mean
 * radius, orbital period + tidal-lock note, distance from parent, surface temp,
 * albedo) from lib/moons.MOONS, plus a LIVE sub-solar longitude that advances as
 * you scrub the orbit (demonstrating the computed terminator). The curated
 * body-specific notes come from lib/moon-facts; the individually-sourced MEASURED
 * facts (with debated/possible tags) come from phenomena.json, parsed defensively
 * upstream. A prominent honesty banner states the honesty bar for the body:
 * Titan's acknowledges its real methane weather. Nothing here is invented.
 */
export default function MoonHud({
  name,
  nowMs,
  offsetDays,
  phenomena,
  constants,
  onBack,
}: {
  name: MoonName;
  nowMs: number;
  offsetDays: number;
  phenomena?: MoonPhenomena;
  constants?: MoonConstantsExtra;
  onBack: () => void;
}) {
  const facts = MOON_FACTS[name];
  const data = MOONS[name];
  const phys = data.physical;
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const st = moonSnapshot(name, date);

  const period = dayLengthDays(name); // |orbital period| in Earth days
  const subLon = st.subsolar.lon;
  const subLonLabel = `${Math.abs(subLon).toFixed(0)}°${subLon >= 0 ? "E" : "W"}`;
  const headline = phenomena?.headline ?? facts.headline;
  const caveat = TEXTURE_CAVEAT[name];
  const tempRange = constants?.tempRangeK;

  return (
    <section
      aria-label={`${name} facts`}
      className="pointer-events-auto absolute left-3 top-20 w-[286px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          Moons
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Moon of {data.parent}
          </p>
          <div className="flex items-center gap-1.5">
            {st.retrograde && (
              <span
                title="Retrograde orbit (orbits opposite the parent's spin)"
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-faint"
              >
                retrograde
              </span>
            )}
            {facts.weather && (
              <span
                title="The one moon with genuine weather (methane cycle)"
                className="rounded-full border border-solar/40 bg-solar/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar"
              >
                weather
              </span>
            )}
          </div>
        </div>

        <h2
          className="mt-1 font-display text-2xl font-medium"
          style={{ color: facts.accent }}
        >
          {name}
        </h2>
        <p className="mt-1 text-xs leading-snug text-dim">{headline}</p>

        {/* honesty banner (Titan-aware) */}
        <p className="mt-3 rounded-xl border border-solar/25 bg-solar/[0.06] px-3 py-2 text-[10px] leading-relaxed text-dim">
          {honestBanner(name)}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat label="Parent" value={data.parent} />
          <Stat
            label="Mean radius"
            value={`${phys.meanRadiusKm.toLocaleString()} km`}
            title="JPL SSD Planetary Satellite Physical Parameters"
          />
          <Stat
            label="Orbit period"
            value={`${period.toFixed(2)} d`}
            title="Sidereal orbital period (JPL SSD). Tidally locked ⇒ one solar day ≈ one orbit."
          />
          <Stat
            label="Distance"
            value={`${data.orbit.semiMajorAxisKm.toLocaleString()} km`}
            title="Semi-major axis from the parent (JPL SSD mean orbital params)"
          />
          <Stat
            label="Surface temp"
            value={
              tempRange
                ? `${phys.meanSurfaceTempK} K (${tempRange[0]}–${tempRange[1]})`
                : `${phys.meanSurfaceTempK} K`
            }
            title={
              constants?.tempNote ??
              "Mean surface temperature (mission-summary value)"
            }
          />
          <Stat
            label="Albedo"
            value={phys.geometricAlbedo.toFixed(2)}
            title={
              constants?.albedoNote ??
              "Geometric (visible) albedo: JPL SSD physical params"
            }
          />
          <Stat
            label="Density"
            value={
              constants?.densityGCm3
                ? `${constants.densityGCm3.toFixed(2)} g/cm³`
                : "–"
            }
            title="Bulk density (JPL SSD; derived from GM + radius)"
          />
          <Stat
            label="Sub-solar lon"
            value={subLonLabel}
            title="Live sub-solar longitude: sweeps once per orbit (tidal lock). This drives the computed day/night terminator."
          />
        </div>

        {/* tidal-lock line */}
        <p className="mt-3 rounded-xl border border-line px-3 py-2 text-[10px] leading-relaxed text-faint">
          Tidally locked: one face always points toward {data.parent}. The
          terminator here is a real, computed sub-solar sweep: not imagery.
        </p>

        {/* curated body-specific notes */}
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {facts.notes.map((n, i) => (
            <li
              key={i}
              className="flex gap-2 text-[11px] leading-relaxed text-dim"
            >
              <span aria-hidden style={{ color: facts.accent }}>
                ·
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>

        {/* Titan: the one real weather card */}
        {facts.weather && (
          <div className="mt-3 rounded-xl border border-solar/30 bg-solar/[0.07] px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
              Methane cycle · real weather
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              Titan runs an active hydrologic cycle in methane/ethane: haze,
              clouds, rain, rivers and standing north-polar seas (Kraken, Ligeia,
              Punga Mare). It is the only world besides Earth with genuine weather
              and standing surface liquid.
            </p>
            <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">
              Cassini / Huygens (Fulchignoni et al. 2005; Cassini RADAR)
            </p>
          </div>
        )}

        {/* measured facts from phenomena.json, each individually cited */}
        {phenomena && phenomena.facts.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              Measured by spacecraft
            </p>
            {phenomena.facts.map((f) => (
              <div key={f.key} className="rounded-xl border border-line px-3 py-2">
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-ice">
                  {f.label}
                  {f.status && (
                    <span
                      title="Not settled science: reported but debated"
                      className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar"
                    >
                      {f.status}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-dim">
                  {f.value}
                </p>
                <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-faint">
                  {f.source}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* texture honesty caveat */}
        {caveat && (
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              About this map
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">
              {caveat.detail}
            </p>
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
