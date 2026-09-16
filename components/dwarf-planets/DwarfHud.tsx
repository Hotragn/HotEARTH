"use client";

import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import {
  CHARON,
  DWARFS,
  dwarfState,
  heliocentricPosition,
  type DwarfName,
} from "@/lib/dwarf-planets";
import {
  DWARF_ACCENT,
  DWARF_FACTS,
  ILLUSTRATIVE_BADGE,
  TEXTURE_CAVEAT,
  hasRealMap,
  honestBanner,
  type DwarfBodyName,
  type DwarfConstantsExtra,
  type DwarfPhenomena,
} from "@/lib/dwarf-facts";

const DAY_MS = 86_400_000;
const SUP = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

/** "1.30 × 10²² kg" style mass label. */
function formatMass(kg?: number): string {
  if (!kg || !isFinite(kg)) return "–";
  const exp = Math.floor(Math.log10(kg));
  const mant = kg / Math.pow(10, exp);
  const expStr = String(exp)
    .split("")
    .map((c) => (c === "-" ? "⁻" : SUP[Number(c)]))
    .join("");
  return `${mant.toFixed(2)} × 10${expStr} kg`;
}

/** Normalised, source-agnostic core stats for one detail body. */
interface Core {
  type: string;
  designation: string;
  radiusLabel: string;
  radiusTitle: string;
  orbitalPeriodYears: number;
  rotationPeriodHours: number;
  rotationUncertain: boolean;
  distanceAU: number;
  distanceTitle: string;
  eccentricity: number;
  inclinationDeg: number;
  moonCount: number;
  moonNames?: string[];
  meanTempK: number;
  geometricAlbedo: number;
}

/**
 * Per-body detail HUD for the dwarf-planet phase. Prints the common physical/
 * orbital facts (type, mean radius or Haumea's triaxial axes, mass, orbital
 * period, rotation period + uncertainty, live heliocentric distance,
 * eccentricity, inclination, moons, albedo, temperature) drawn from
 * lib/dwarf-planets, enriched defensively by constants.json. The phenomena.json
 * headline + individually-sourced measured facts follow; un-imaged bodies show
 * the illustrative-appearance disclaimer prominently. A per-body honesty banner
 * states the honesty bar. Nothing here is invented.
 *
 * Handles both the five dwarf planets and Pluto's moon Charon (which has no
 * heliocentric orbit of its own; it rides Pluto's, so its distance is Pluto's
 * and its orbit is shown about Pluto). Pluto links to Charon and back, surfacing
 * the Pluto–Charon binary.
 */
export default function DwarfHud({
  name,
  nowMs,
  offsetDays,
  phenomena,
  constants,
  onBack,
  onNavigate,
}: {
  name: DwarfBodyName;
  nowMs: number;
  offsetDays: number;
  phenomena?: DwarfPhenomena;
  constants?: DwarfConstantsExtra;
  onBack: () => void;
  onNavigate: (body: DwarfBodyName) => void;
}) {
  const facts = DWARF_FACTS[name];
  const accent = DWARF_ACCENT[name];
  const imaged = hasRealMap(name);
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const isCharon = name === "Charon";

  const core: Core = isCharon
    ? {
        type: constants?.type ?? "Moon of Pluto",
        designation: constants?.designation ?? "Pluto I",
        radiusLabel: `${CHARON.physical.meanRadiusKm.toLocaleString()} km`,
        radiusTitle: "Mean radius (New Horizons 2015)",
        // Charon rides Pluto's heliocentric orbit, so its year is Pluto's.
        orbitalPeriodYears: DWARFS.Pluto.orbit.siderealPeriodYears,
        rotationPeriodHours: CHARON.physical.rotationPeriodHours,
        rotationUncertain: false,
        distanceAU: heliocentricPosition("Pluto", date).distanceAU,
        distanceTitle:
          "Charon has no heliocentric orbit of its own; it rides Pluto's, so this is Pluto's live distance from the Sun.",
        eccentricity: CHARON.orbit.eccentricity,
        inclinationDeg: CHARON.orbit.inclinationDeg,
        moonCount: 0,
        meanTempK: CHARON.physical.meanSurfaceTempK,
        geometricAlbedo: CHARON.physical.geometricAlbedo,
      }
    : buildDwarfCore(name as DwarfName, date, constants);

  const headline = phenomena?.headline ?? facts.headline;
  const caveat = TEXTURE_CAVEAT[name];
  const appearanceNote = phenomena?.appearanceNote;
  const triaxial = !isCharon ? DWARFS[name as DwarfName].physical.triaxialAxesKm : undefined;
  const hasRing = name === "Haumea";

  return (
    <section
      aria-label={`${name} facts`}
      className="pointer-events-auto absolute left-3 top-20 w-[300px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          Dwarf planets
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {core.designation}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {hasRing && (
              <span
                title="First ring found around a trans-Neptunian object (Ortiz 2017)"
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-faint"
              >
                ringed
              </span>
            )}
            {(name === "Pluto" || isCharon) && (
              <span
                title="Pluto–Charon is a true binary: barycenter outside Pluto"
                className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-faint"
              >
                binary
              </span>
            )}
            <span
              title={
                imaged
                  ? "Real spacecraft surface map exists"
                  : "Never visited: illustrative appearance"
              }
              className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                imaged
                  ? "border border-line text-faint"
                  : "border border-solar/40 bg-solar/10 text-solar"
              }`}
            >
              {imaged ? "real map" : "illustrative"}
            </span>
          </div>
        </div>

        <h2 className="mt-1 font-display text-2xl font-medium" style={{ color: accent }}>
          {name}
        </h2>
        <p className="mt-1 text-xs leading-snug text-dim">{headline}</p>

        {/* honesty banner */}
        <p className="mt-3 rounded-xl border border-solar/25 bg-solar/[0.06] px-3 py-2 text-[10px] leading-relaxed text-dim">
          {honestBanner()}
        </p>

        {/* illustrative disclaimer (un-imaged bodies) */}
        {!imaged && (
          <div className="mt-3 rounded-xl border border-solar/30 bg-solar/[0.08] px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
              Illustrative appearance
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              {appearanceNote?.value ?? ILLUSTRATIVE_BADGE}
            </p>
            {appearanceNote?.source && (
              <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">
                {appearanceNote.source}
              </p>
            )}
            {hasRing && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-dim/90">
                The elongated shape and ring shown here, however, are real,
                measured geometry (Ortiz et al. 2017).
              </p>
            )}
          </div>
        )}

        {/* core stats */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat label="Type" value={core.type} />
          <Stat
            label={triaxial ? "Axes (a×b×c)" : "Mean radius"}
            value={
              triaxial
                ? `${triaxial.a}×${triaxial.b}×${triaxial.c} km`
                : core.radiusLabel
            }
            title={
              triaxial
                ? "Full triaxial axis lengths: a Jacobi ellipsoid forced by the fast spin (Ortiz 2017)"
                : core.radiusTitle
            }
          />
          <Stat label="Mass" value={formatMass(constants?.massKg)} title="JPL SBDB / mission-derived" />
          <Stat
            label="Orbital period"
            value={`${core.orbitalPeriodYears.toFixed(1)} yr`}
            title={
              isCharon
                ? "Charon shares Pluto's ~249 yr heliocentric orbit (it orbits Pluto every 6.39 d: see 'Orbit of Pluto')"
                : "Sidereal orbital period (JPL SBDB)"
            }
          />
          <Stat
            label="Rotation"
            value={`${core.rotationPeriodHours.toFixed(2)} h${core.rotationUncertain ? " *" : ""}`}
            title={
              constants?.rotationNote ??
              (core.rotationUncertain
                ? "Rotation period is observationally uncertain"
                : "Sidereal rotation period")
            }
          />
          <Stat
            label="Distance"
            value={`${core.distanceAU.toFixed(2)} AU`}
            title={core.distanceTitle}
          />
          <Stat label="Eccentricity" value={core.eccentricity.toFixed(3)} title="JPL SBDB orbital element" />
          <Stat
            label="Inclination"
            value={`${core.inclinationDeg.toFixed(1)}°`}
            title="Inclination to the J2000 ecliptic (JPL SBDB)"
          />
          <Stat
            label="Moons"
            value={
              core.moonCount > 0
                ? `${core.moonCount}${core.moonNames ? ` · ${core.moonNames[0]}${core.moonCount > 1 ? "…" : ""}` : ""}`
                : "0"
            }
            title={core.moonNames?.join(", ")}
          />
          <Stat
            label="Albedo"
            value={core.geometricAlbedo.toFixed(2)}
            title="Geometric (visible) albedo"
          />
          <Stat
            label="Surface temp"
            value={`${core.meanTempK} K`}
            title={constants?.tempNote ?? "Mean surface temperature (mission / radiative estimate)"}
          />
          {isCharon && (
            <Stat
              label="Orbit of Pluto"
              value={`${CHARON.orbit.semiMajorAxisKm.toLocaleString()} km`}
              title={`Semi-major axis about Pluto; period ${CHARON.orbit.siderealPeriodDays} d (New Horizons / JPL)`}
            />
          )}
        </div>

        {/* Pluto ↔ Charon binary navigation */}
        {name === "Pluto" && (
          <button
            type="button"
            onClick={() => onNavigate("Charon")}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-[11px] text-dim transition-colors duration-200 hover:border-solar/40 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <span>
              Pluto–Charon <span className="text-faint">binary</span>: view Charon
            </span>
            <ArrowRight size={13} weight="bold" aria-hidden />
          </button>
        )}
        {isCharon && (
          <button
            type="button"
            onClick={() => onNavigate("Pluto")}
            className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-line px-3 py-2 text-left text-[11px] text-dim transition-colors duration-200 hover:border-solar/40 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <span>
              <ArrowLeft size={13} weight="bold" aria-hidden className="mr-1 inline" />
              Back to Pluto
            </span>
          </button>
        )}

        {/* body-specific honesty notes from constants.json */}
        <BodyNotes name={name} constants={constants} />

        {/* curated body-specific notes (fallback + colour) */}
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
          {facts.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-dim">
              <span aria-hidden style={{ color: accent }}>
                ·
              </span>
              <span>{n}</span>
            </li>
          ))}
        </ul>

        {/* measured facts from phenomena.json, each individually cited */}
        {phenomena && phenomena.facts.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              {imaged ? "Measured by spacecraft" : "Measured (occultation / photometry)"}
            </p>
            {phenomena.facts.map((f) => (
              <div key={f.key} className="rounded-xl border border-line px-3 py-2">
                <p className="flex flex-wrap items-center gap-2 text-[11px] text-ice">
                  {f.label}
                  {f.status && (
                    <span
                      title="Not settled: reported but uncertain"
                      className="rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-solar"
                    >
                      {f.status}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-dim">{f.value}</p>
                <p className="mt-0.5 font-mono text-[9px] leading-relaxed text-faint">
                  {f.source}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* texture honesty caveat (imaged bodies) */}
        {caveat && (
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              About this map
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">{caveat.detail}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/** Build normalised core stats for a dwarf planet (not Charon). */
function buildDwarfCore(
  name: DwarfName,
  date: Date,
  constants?: DwarfConstantsExtra
): Core {
  const st = dwarfState(name, date);
  const orbit = DWARFS[name].orbit;
  return {
    type: constants?.type ? capitalize(constants.type) : "Dwarf planet",
    designation: DWARFS[name].designation,
    radiusLabel: `${st.meanRadiusKm.toLocaleString()} km`,
    radiusTitle: "Volume-equivalent mean radius (mission / occultation)",
    orbitalPeriodYears: st.orbitalPeriodYears,
    rotationPeriodHours: st.rotationPeriodHours,
    rotationUncertain: st.rotationUncertain,
    distanceAU: st.position.distanceAU,
    distanceTitle: "Live heliocentric distance from the Sun (computed, JPL SBDB elements)",
    eccentricity: orbit.e,
    inclinationDeg: orbit.iDeg,
    moonCount: st.moonCount,
    moonNames: constants?.moonNames,
    meanTempK: constants?.meanTempK ?? st.meanSurfaceTempK,
    geometricAlbedo: st.geometricAlbedo,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Surfaces the standout honesty notes carried in constants.json per body. */
function BodyNotes({
  name,
  constants,
}: {
  name: DwarfBodyName;
  constants?: DwarfConstantsExtra;
}) {
  const notes: { label: string; text: string }[] = [];
  if (constants?.neptuneResonance)
    notes.push({ label: "Neptune resonance", text: constants.neptuneResonance });
  if (constants?.barycenterNote)
    notes.push({ label: "Binary system", text: constants.barycenterNote });
  if (constants?.shapeNote)
    notes.push({ label: "Shape", text: constants.shapeNote });
  if (constants?.ringNote) notes.push({ label: "Ring", text: constants.ringNote });
  if (constants?.atmosphereNote)
    notes.push({ label: "Atmosphere", text: constants.atmosphereNote });
  if (notes.length === 0) return null;

  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      {notes.map((n) => (
        <div
          key={n.label}
          className="rounded-xl border border-line bg-white/[0.02] px-3 py-2"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            {n.label}
          </p>
          <p className="mt-1 text-[10px] leading-relaxed text-dim">{n.text}</p>
        </div>
      ))}
    </div>
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
      <p className="mt-0.5 font-mono text-[12px] tracking-wide text-dim">{value}</p>
    </div>
  );
}
