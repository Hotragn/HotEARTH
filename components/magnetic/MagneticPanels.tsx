"use client";

import {
  CRUSTAL_NOTE,
  DAILY_VARIATION_NOTE,
  DIP_POLE_SPEED_NOTE,
  EXTRAPOLATION_NOTE,
  MODEL_NOTE,
  NO_REVERSAL_NOTE,
  SAA_NOTE,
  THREE_POLES_NOTE,
  driftKm,
  formatDeclination,
  trueBearing,
  type FieldExtreme,
  type IgrfModel,
  type MagneticField,
  type Pole,
} from "@/lib/geomagnetism";
import {
  DOCS_BASE,
  EAST_COLOR,
  IGRF_PAGE,
  MAGNETIC_ACCENT,
  POLES_PAGE,
  WEST_COLOR,
  compassPoint,
  fmtDegrees,
  fmtMicrotesla,
  fmtNanotesla,
  fmtPlace,
  fmtRate,
} from "./magneticUi";

/** The practical answer: how wrong is a compass here, and what does that cost. */
export function HereCard({
  field,
  change,
  placeLabel,
}: {
  field: MagneticField | null;
  change: { declination: number; inclination: number; f: number; h: number } | null;
  placeLabel: string;
}) {
  if (!field) return null;
  const west = field.declination < 0;
  const bearing = trueBearing(90, field.declination);
  const drift = driftKm(10, field.declination);

  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        At {placeLabel}, a compass points
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: west ? WEST_COLOR : EAST_COLOR }}
      >
        {formatDeclination(field.declination)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        of true north. Hold the needle on 90 degrees and you are actually walking
        a bearing of {bearing !== null ? bearing.toFixed(0) : "--"} degrees,{" "}
        {compassPoint(bearing)}. Over ten kilometres that is{" "}
        <span className="text-ice">
          {drift !== null ? `${drift.toFixed(1)} km` : "--"}
        </span>{" "}
        sideways of where you meant to be.
      </p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="Dip below horizontal"
          value={fmtDegrees(field.inclination)}
          note={
            Math.abs(field.inclination) > 60
              ? "steep: the needle wants to point down, which is why compasses are balanced for a latitude band"
              : undefined
          }
        />
        <Row label="Total field" value={`${fmtNanotesla(field.f)} (${fmtMicrotesla(field.f)})`} />
        <Row
          label="Horizontal part"
          value={fmtNanotesla(field.h)}
          note="the only part that turns a needle"
        />
        {change ? (
          <Row
            label="Drifting"
            value={`${fmtRate(change.declination, "degrees a year", 3)}`}
            note={
              Math.abs(change.declination) > 0.02
                ? `a printed chart goes ${Math.abs(change.declination * 10).toFixed(1)} degrees stale per decade`
                : undefined
            }
          />
        ) : (
          <Row
            label="Drifting"
            value="not computable here"
            note="the rate is measured across half a year either side of the date, and one of those falls outside the model, so it is refused rather than taken one-sided"
          />
        )}
      </dl>
    </section>
  );
}

/** The three north poles, computed, plus the fourth thing that is not a pole. */
export function ThreePolesCard({
  geomagnetic,
  dipNorth,
  dipSouth,
  tilt,
}: {
  geomagnetic: Pole | null;
  dipNorth: Pole | null;
  dipSouth: Pole | null;
  tilt: number | null;
}) {
  return (
    <section className="hud-panel rounded-2xl border border-rose-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-200/90">
        Three north poles, and none of them is where the needle points
      </h2>

      <ul className="mt-3 space-y-2.5">
        <PoleRow
          name="Geographic"
          where="90.00° N"
          what="Where the rotation axis comes out. The only one that does not move."
        />
        <PoleRow
          name="Geomagnetic"
          where={fmtPlace(geomagnetic?.latDeg ?? null, geomagnetic?.lonDeg ?? null)}
          what={`Where the axis of the best-fit central dipole comes out, from exactly three of the 195 coefficients. Tilted ${
            tilt !== null ? tilt.toFixed(2) : "--"
          }° from the rotation axis. This is the pole the auroral oval is centred on.`}
        />
        <PoleRow
          name="North dip pole"
          where={fmtPlace(dipNorth?.latDeg ?? null, dipNorth?.lonDeg ?? null)}
          what="Where the field is actually vertical and a needle stands on end. Found here by searching all 195 coefficients for zero horizontal field."
        />
        <PoleRow
          name="South dip pole"
          where={fmtPlace(dipSouth?.latDeg ?? null, dipSouth?.lonDeg ?? null)}
          what="Nowhere near antipodal to the northern one, off the coast of Antarctica. Two dip poles 20 degrees away from opposite is the clearest single sign that the Earth is not a bar magnet."
        />
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {THREE_POLES_NOTE}
      </p>
    </section>
  );
}

/** The weakening, as the number it is actually measured by. */
export function MomentCard({
  series,
}: {
  series: Array<{ year: number; moment: number }>;
}) {
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const lo = Math.min(...series.map((d) => d.moment));
  const hi = Math.max(...series.map((d) => d.moment));
  const drop = (1 - last.moment / first.moment) * 100;

  const W = 520;
  const H = 120;
  const pad = 4;
  const x = (y: number) => ((y - first.year) / (last.year - first.year)) * (W - 2 * pad) + pad;
  const yy = (m: number) => H - pad - ((m - lo * 0.995) / (hi * 1.005 - lo * 0.995)) * (H - 2 * pad);
  const path = series
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(d.year).toFixed(1)},${yy(d.moment).toFixed(1)}`)
    .join(" ");

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The dipole is weakening
      </h2>
      <p className="mt-1 font-mono text-[13px]" style={{ color: MAGNETIC_ACCENT }}>
        {first.moment.toFixed(2)} to {last.moment.toFixed(2)} × 10²² A m², down{" "}
        {drop.toFixed(1)}% since {first.year}
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block h-auto w-full" aria-hidden>
        <path d={path} fill="none" stroke={MAGNETIC_ACCENT} strokeWidth={2} />
      </svg>
      <div className="flex justify-between font-mono text-[10px] text-faint">
        <span>{first.year}</span>
        <span>{last.year}</span>
      </div>

      <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {NO_REVERSAL_NOTE}
      </p>
    </section>
  );
}

/** The weak spot, computed rather than quoted. */
export function AnomalyCard({
  now,
  then,
}: {
  now: FieldExtreme | null;
  then: FieldExtreme | null;
}) {
  if (!now) return null;
  // At the first epoch, "now" IS the baseline, and a card reading "0% weaker
  // than it was in 1900" is the kind of arithmetic that is technically true and
  // reads as broken. Drop the comparison instead of printing a zero.
  const comparable = then !== null && Math.abs(now.year - then.year) >= 1;
  const driftDeg = comparable ? now.lonDeg - then!.lonDeg : null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The weakest place on Earth
      </h2>
      <p className="mt-1 font-mono text-[13px] text-ice">
        {fmtPlace(now.latDeg, now.lonDeg)} · {fmtNanotesla(now.f)}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-dim">
        Found by sweeping the globe for the minimum of the total field, then
        refining.{" "}
        {comparable ? (
          <>
            That is the South Atlantic Anomaly, and it is roughly{" "}
            {Math.round(((then!.f - now.f) / then!.f) * 100)}% weaker than it was
            in {then!.year.toFixed(0)}
            {driftDeg !== null && Math.abs(driftDeg) > 1
              ? `, and ${Math.abs(driftDeg).toFixed(0)} degrees of longitude further ${
                  driftDeg < 0 ? "west" : "east"
                }`
              : ""}
            .
          </>
        ) : (
          <>
            That is the South Atlantic Anomaly at the earliest epoch the model
            covers, so there is nothing earlier here to compare it against.
          </>
        )}
      </p>
      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {SAA_NOTE}
      </p>
    </section>
  );
}

/** The load-bearing panel. */
export function MagneticHonesty({ model }: { model: IgrfModel }) {
  return (
    <section className="hud-panel rounded-2xl border border-rose-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-rose-200/90">
        What this is, and what it cannot tell you
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">{MODEL_NOTE}</p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="The rock under you:" cls="text-rose-200/90" body={CRUSTAL_NOTE} />
        <Item tag="Today, not on average:" cls="text-sky-300/90" body={DAILY_VARIATION_NOTE} />
        <Item tag="Past the last epoch:" cls="text-amber-200/90" body={EXTRAPOLATION_NOTE} />
        <Item tag="The pole's sprint:" cls="text-emerald-300/90" body={DIP_POLE_SPEED_NOTE} />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        {model.model}, valid {model.validFrom.toFixed(0)} to {model.validTo.toFixed(0)},{" "}
        {model.credit}. A frozen publication rather than a live feed: a generation
        of IGRF never changes, so it is fetched once and committed, with no cron
        and no staleness. Verified in the tests against the official pyIGRF
        reference implementation and against NOAA&apos;s published pole positions
        for 2025.{" "}
        <a
          href={IGRF_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-rose-200/80 transition-colors duration-200 hover:text-rose-100"
        >
          IGRF
        </a>
        {" · "}
        <a
          href={POLES_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-rose-200/80 transition-colors duration-200 hover:text-rose-100"
        >
          NOAA on the wandering poles
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/MAGNETIC_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-rose-200/80 transition-colors duration-200 hover:text-rose-100"
        >
          the method
        </a>
      </p>
    </section>
  );
}

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-t border-line/60 pt-1.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <dt className="text-faint">{label}</dt>
        <dd className="text-ice">{value}</dd>
      </div>
      {note && <p className="mt-0.5 text-[10px] leading-snug text-faint">{note}</p>}
    </div>
  );
}

function PoleRow({
  name,
  where,
  what,
}: {
  name: string;
  where: string;
  what: string;
}) {
  return (
    <li className="border-t border-line/60 pt-2.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-mono text-[11px] text-ice">{name}</span>
        <span className="font-mono text-[11px]" style={{ color: MAGNETIC_ACCENT }}>
          {where}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{what}</p>
    </li>
  );
}

function Item({ tag, cls, body }: { tag: string; cls: string; body: string }) {
  return (
    <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
      <span className={cls}>{tag} </span>
      {body}
    </li>
  );
}
