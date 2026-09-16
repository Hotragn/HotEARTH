"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import {
  APOPHIS_2029_NOTE,
  ILLUSTRATIVE_APPEARANCE,
  SMALL_BODY_ACCENT,
  SMALL_BODY_HONESTY,
  appearanceFor,
  classLabel,
  fmtAU,
  fmtAlbedo,
  fmtDeg,
  fmtDiameter,
  fmtEcc,
  fmtKmFromAU,
  fmtLD,
  fmtMag,
  fmtRotation,
  fmtTisserand,
  fmtVel,
  fmtYears,
  isApophisApproach,
  smallBodyDerived,
  type CloseApproachData,
  type SmallBodyObject,
} from "@/lib/small-body-facts";
import { cometActivity } from "@/lib/small-bodies";

/**
 * Per-object detail HUD. Prints the MEASURED orbital elements (a, e, q, Q or
 * "none: unbound", i, period or "unbound", MOID, Tisserand), the physical
 * parameters (diameter, rotation, albedo, spectral type, H or comet total mag),
 * and the COMPUTED classification (NEO group, comet family, regime). The PHA
 * badge is stated factually with the CNEOS definition; interstellar bodies carry
 * a prominent "unbound" note; comets get their illustrative-tail + activity note.
 * Appearance follows the texture rules: a labelled real photo for the photo
 * bodies (67P with its exact ESA credit), a map note for Eros/Vesta/Bennu, the
 * illustrative disclaimer otherwise. Missing values render "not measured".
 */
export default function SmallBodyHud({
  object,
  approaches,
  onBack,
}: {
  object: SmallBodyObject;
  approaches: CloseApproachData[];
  onBack: () => void;
}) {
  const el = object.elements;
  const d = smallBodyDerived(object);
  const appearance = appearanceFor(object);
  const activity = cometActivity(el.q);

  const kindLabel = object.kind === "comet" ? "Comet" : "Asteroid";

  return (
    <section
      aria-label={`${object.name} facts`}
      className="pointer-events-auto absolute left-3 top-20 w-[320px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-11rem)] overflow-y-auto rounded-2xl p-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-2.5 flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          <ArrowLeft size={12} weight="bold" aria-hidden />
          Orbit view
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            {object.designation ?? kindLabel}
          </p>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
              appearance.kind === "map"
                ? "border border-line text-faint"
                : appearance.kind === "photo"
                  ? "border border-line text-faint"
                  : "border border-solar/40 bg-solar/10 text-solar"
            }`}
          >
            {appearance.kind === "map"
              ? "real map"
              : appearance.kind === "photo"
                ? "real photo"
                : "illustrative"}
          </span>
        </div>

        <h2
          className="mt-1 font-display text-2xl font-medium"
          style={{ color: SMALL_BODY_ACCENT }}
        >
          {object.name}
        </h2>
        <p className="mt-0.5 font-mono text-[10px] text-faint">
          {kindLabel} · {classLabel(object)}
        </p>

        {/* badges */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {object.pha && (
            <Badge title="Potentially Hazardous Asteroid: a factual classification, see the definition below.">
              PHA
            </Badge>
          )}
          {object.neo && <Badge>Near-Earth</Badge>}
          {d.interstellar && (
            <Badge color="#c8a6ff" title="Unbound hyperbolic orbit: not gravitationally bound to the Sun.">
              interstellar
            </Badge>
          )}
          {d.bound ? null : (
            <Badge color="#c8a6ff">unbound</Badge>
          )}
          {object.visited && <Badge color={SMALL_BODY_ACCENT}>visited</Badge>}
        </div>

        {/* honesty banner */}
        <p className="mt-3 rounded-xl border border-solar/25 bg-solar/[0.06] px-3 py-2 text-[10px] leading-relaxed text-dim">
          {SMALL_BODY_HONESTY}
        </p>

        {/* interstellar note (prominent) */}
        {d.interstellar && (
          <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: "#c8a6ff55", background: "#c8a6ff12" }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: "#c8a6ff" }}>
              Interstellar visitor
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              Hyperbolic orbit (e = {fmtEcc(el.e)}): not bound to the Sun. It
              enters the Solar System once and leaves forever; it is passing
              through, not orbiting.
            </p>
          </div>
        )}

        {/* appearance block */}
        <AppearanceBlock object={object} />

        {/* orbital elements */}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Orbit (measured, JPL SBDB)
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat label="Perihelion q" value={fmtAU(el.q)} title="Closest approach to the Sun." />
          <Stat
            label="Aphelion Q"
            value={d.bound ? fmtAU(el.Q) : "none, unbound"}
            title={d.bound ? "Farthest point from the Sun." : "An open orbit has no aphelion."}
          />
          <Stat
            label="Semi-major axis"
            value={d.bound ? fmtAU(el.a) : `${fmtAU(el.a)} (unbound)`}
            title={d.bound ? undefined : "Negative osculating a is the JPL convention for a hyperbolic orbit."}
          />
          <Stat label="Eccentricity" value={fmtEcc(el.e)} />
          <Stat label="Inclination" value={fmtDeg(el.i)} title="To the J2000 ecliptic." />
          <Stat
            label="Period"
            value={d.bound ? fmtYears(el.period_yr) : "unbound, no period"}
          />
          <Stat
            label="Earth MOID"
            value={fmtAU(el.moid_au)}
            title="Minimum distance between this orbit and Earth's: a close-approach proxy, not the current gap."
          />
          <Stat
            label="Tisserand (Jup.)"
            value={fmtTisserand(el.t_jup)}
            title="Nearly-conserved parameter separating comet/asteroid dynamical classes."
          />
        </div>

        {/* classification */}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Classification (computed)
        </p>
        <div className="mt-1.5 space-y-1.5 border-t border-line pt-2.5 text-[11px] leading-relaxed text-dim">
          <p>
            <span className="text-faint">Regime: </span>
            {d.regime ?? "–"}
            {d.bound ? " (bound, closed orbit)" : " (unbound, open orbit)"}
          </p>
          {d.nea && (
            <p>
              <span className="text-faint">Near-Earth group: </span>
              {d.nea}
            </p>
          )}
          {d.comet && (
            <p>
              <span className="text-faint">Comet family: </span>
              {d.comet.note}
            </p>
          )}
        </div>

        {/* PHA definition: stated factually */}
        {object.pha && (
          <div className="mt-3 rounded-xl border border-solar/30 bg-solar/[0.06] px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
              Potentially Hazardous Asteroid
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">{d.moidNote}</p>
          </div>
        )}

        {/* physical */}
        <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Physical (measured)
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-2.5">
          <Stat label="Diameter" value={fmtDiameter(object.physical.diameter_km)} />
          <Stat label="Rotation" value={fmtRotation(object.physical.rotation_h)} />
          <Stat label="Albedo" value={fmtAlbedo(object.physical.albedo)} title="Geometric albedo." />
          <Stat label="Spectral type" value={object.physical.spectral ?? "not measured"} />
          {object.kind === "comet" ? (
            <Stat
              label="Total mag (M1)"
              value={fmtMag(object.physical.comet_total_mag_M1)}
              title="Comet total absolute magnitude."
            />
          ) : (
            <Stat label="Abs. mag (H)" value={fmtMag(object.physical.H)} />
          )}
        </div>

        {/* comet activity + tail note */}
        {object.kind === "comet" && (
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Coma & tail (illustrative)
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">
              {activity > 0
                ? `Water-ice sublimation switches on inside ~3 AU; near perihelion (q = ${fmtAU(
                    el.q
                  )}) this comet is at its most active. In the orbit view the tail is drawn anti-sunward (away from the Sun) from the comet's live position and grows as it nears the Sun: an illustrative activity cue, not a photometric measurement.`
                : `Its perihelion (q = ${fmtAU(
                    el.q
                  )}) lies beyond the ~3 AU water-ice activity onset, so little dust/gas tail is expected. Any tail shown is illustrative.`}
            </p>
          </div>
        )}

        {/* visited + mission */}
        {object.visited && object.mission && (
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Visited by spacecraft
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-dim">{object.mission}</p>
          </div>
        )}

        {/* note */}
        {object.note && (
          <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-dim">
            {object.note}
          </p>
        )}

        {/* close approaches for this object */}
        {approaches.length > 0 && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
              Close approaches (JPL CNEOS)
            </p>
            <div className="mt-2 space-y-2">
              {approaches.map((ca, i) => (
                <ApproachRow key={`${ca.designation}-${i}`} ca={ca} />
              ))}
            </div>
          </div>
        )}

        <p className="mt-3 border-t border-line pt-2.5 font-mono text-[9px] leading-relaxed text-faint">
          Elements + parameters: NASA/JPL Small-Body Database. Close approaches:
          CNEOS. Classification computed (see About).
        </p>
      </div>
    </section>
  );
}

/** The appearance section: framed real photo, map note, or illustrative note. */
function AppearanceBlock({ object }: { object: SmallBodyObject }) {
  const appearance = appearanceFor(object);

  if (appearance.kind === "photo" && appearance.texture) {
    return (
      <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Real mission photo
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={appearance.texture}
          alt={`${object.name}: real mission photo`}
          className="mt-2 w-full rounded-lg border border-line"
          loading="lazy"
        />
        <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-faint">
          {appearance.credit}
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-dim/90">
          A single-view frame: not wrappable on a sphere, so the 3D body shown is
          an illustrative shape.
        </p>
      </div>
    );
  }

  if (appearance.kind === "map") {
    return (
      <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
          Real imagery
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-dim">
          The real mosaic is wrapped on a slightly-irregular sphere; the true
          shape is approximated.
        </p>
        <p className="mt-1 font-mono text-[9px] leading-relaxed text-faint">
          {appearance.credit}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-solar/30 bg-solar/[0.08] px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
        Illustrative appearance
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-dim">
        {ILLUSTRATIVE_APPEARANCE}
      </p>
    </div>
  );
}

function ApproachRow({ ca }: { ca: CloseApproachData }) {
  const apophis = isApophisApproach(ca);
  return (
    <div
      className={`rounded-xl px-3 py-2 ${
        apophis ? "border border-solar/40 bg-solar/[0.06]" : "border border-line"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] text-ice">{ca.date}</p>
        <p className="font-mono text-[11px]" style={{ color: apophis ? "#f2a63b" : "#9aa2b1" }}>
          {fmtLD(ca.dist_ld)}
        </p>
      </div>
      <p className="mt-0.5 font-mono text-[9px] text-faint">
        {fmtKmFromAU(ca.dist_au)} · {fmtVel(ca.v_rel_kms)}
      </p>
      {apophis && (
        <p className="mt-1.5 text-[10px] leading-relaxed text-dim">
          {APOPHIS_2029_NOTE}
        </p>
      )}
    </div>
  );
}

function Badge({
  children,
  color,
  title,
}: {
  children: React.ReactNode;
  color?: string;
  title?: string;
}) {
  const c = color ?? "#f2a63b";
  return (
    <span
      title={title}
      className="rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
      style={{ borderColor: `${c}66`, backgroundColor: `${c}14`, color: c }}
    >
      {children}
    </span>
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
