"use client";

import { formatLibration, moonState } from "@/lib/lunar";

const DAY_MS = 86_400_000;

/** Cool silver accent for the Moon (stays in the dark-aesthetic family). */
const MOON_ACCENT = "#c3c9d6";

/**
 * Top-left honest readout for the Moon: phase name + illuminated %, lunar age,
 * sub-solar point, and optical libration (with the note that it reveals ~59% of
 * the surface). Everything traces to the Meeus lunar theory in lib/lunar:
 * labeled "computed", never a live feed. The Moon has NO atmosphere and NO
 * weather; this panel shows illumination + libration geometry only.
 *
 * Driven by `nowMs` + `offsetDays` from the parent's 1Hz tick: no per-frame
 * React work (the globe reads the same offset via a ref).
 */
export default function MoonHud({
  nowMs,
  offsetDays,
}: {
  nowMs: number;
  offsetDays: number;
}) {
  const date = new Date(nowMs + offsetDays * DAY_MS);
  const s = moonState(date);

  const illumPct = (s.phase.illuminatedFraction * 100).toFixed(1);
  const subLat = `${Math.abs(s.subsolar.lat).toFixed(2)}°${s.subsolar.lat >= 0 ? "N" : "S"}`;
  const subLon = `${Math.abs(s.subsolar.lon).toFixed(1)}°${s.subsolar.lon >= 0 ? "E" : "W"}`;

  return (
    <section
      aria-label="Moon illumination & libration"
      className="pointer-events-auto absolute left-3 top-20 w-[248px] animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Lunar phase
        </p>
        <div className="mt-1.5 flex items-center gap-2.5">
          <PhaseGlyph
            fraction={s.phase.illuminatedFraction}
            waxing={s.phase.waxing}
          />
          <div className="min-w-0">
            <p
              className="truncate font-display text-lg font-medium leading-tight"
              style={{ color: MOON_ACCENT }}
            >
              {s.phase.name}
            </p>
            <p className="font-mono text-[11px] text-dim">
              {illumPct}% illuminated
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-line pt-3">
          <Stat
            label="Lunar age"
            value={`${s.phase.ageDays.toFixed(1)} d`}
            title="Days since the last new moon (synodic cycle ~29.53 d): computed, Meeus lunar theory"
          />
          <Stat
            label="Phase angle"
            value={`${s.phase.phaseAngle.toFixed(0)}°`}
            title="Sun–Moon–Earth phase angle i (0° full, 180° new)"
          />
          <Stat
            label="Subsolar lat"
            value={subLat}
            title="Selenographic latitude of the Sun. Bounded by the lunar equator's 1.54° tilt → the Moon has ~no seasons."
          />
          <Stat label="Subsolar lon" value={subLon} />
        </div>

        {/* libration: the monthly nod that reveals ~59% of the surface */}
        <div
          className="mt-3 rounded-xl border border-line px-3 py-2"
          title="Optical libration (Meeus Ch. 53): the Moon's apparent nod (latitude) and rock (longitude), up to ±~7.9° lon / ±~6.9° lat. Over time this reveals ~59% of the surface, not just 50%."
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint">
              Libration
            </p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-faint">
              computed
            </p>
          </div>
          <p
            className="mt-0.5 font-mono text-[13px] tracking-wide"
            style={{ color: MOON_ACCENT }}
          >
            {formatLibration(s.libration)}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-faint">
            The Moon &quot;nods&quot;: over time we see ~59% of its surface.
          </p>
        </div>
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

/**
 * A tiny SVG phase glyph: a grey disk with the illuminated fraction shown as a
 * lit crescent/gibbous, oriented by waxing/waning. Purely a decorative summary
 * of the computed illuminated fraction (no data claim).
 */
function PhaseGlyph({
  fraction,
  waxing,
}: {
  fraction: number;
  waxing: boolean;
}) {
  const r = 12;
  const cx = 14;
  const cy = 14;
  // Terminator ellipse half-width: 0 at quarter, ±r at new/full.
  const k = Math.max(0, Math.min(1, fraction));
  const rx = r * Math.abs(1 - 2 * k);
  // Which side is lit: waxing → right lit; waning → left lit.
  const litRight = waxing;
  // Sweep flags to carve the lit shape.
  const gibbous = k > 0.5;
  return (
    <svg
      width={28}
      height={28}
      viewBox="0 0 28 28"
      aria-hidden
      className="shrink-0"
    >
      {/* dark disk */}
      <circle cx={cx} cy={cy} r={r} fill="#1c2029" stroke="#3a3f4b" strokeWidth={0.75} />
      {/* lit region */}
      <path
        d={litPath(cx, cy, r, rx, litRight, gibbous)}
        fill={MOON_ACCENT}
        opacity={0.92}
      />
    </svg>
  );
}

function litPath(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  litRight: boolean,
  gibbous: boolean
): string {
  // Outer semicircle (the lit limb) + inner terminator ellipse arc.
  const top = `${cx},${cy - r}`;
  const bottom = `${cx},${cy + r}`;
  // Outer arc sweep: right side if litRight else left side.
  const outerSweep = litRight ? 1 : 0;
  // Inner terminator arc: for gibbous it bulges toward the lit side (same
  // sweep as outer); for crescent it bulges toward the dark side.
  const innerSweep = gibbous ? outerSweep : 1 - outerSweep;
  return [
    `M ${top}`,
    `A ${r} ${r} 0 0 ${outerSweep} ${bottom}`,
    `A ${rx} ${r} 0 0 ${innerSweep} ${top}`,
    "Z",
  ].join(" ");
}
