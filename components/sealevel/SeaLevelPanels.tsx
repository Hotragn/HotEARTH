"use client";

import {
  ACCELERATION_NOTE,
  NOT_A_TIDY_STAIRCASE_NOTE,
  CONVENTION_NOTE,
  DATUM_NOTE,
  GIA_CORRECTION_MM_PER_YEAR,
  GIA_NOTE,
  NOT_A_FORECAST_NOTE,
  NOT_FLOOD_RISK_NOTE,
  OUR_TREND_DIFFERS_NOTE,
  RELAY_NOTE,
  TWO_INSTRUMENTS_NOTE,
  type Acceleration,
  type GlobalVariant,
  type MissionOverlap,
  type Trend,
  type VariantId,
} from "@/lib/sealevel";
import {
  DOCS_BASE,
  GLOBAL_COLOR,
  NOAA_PAGE,
  PSMSL_PAGE,
  SEALEVEL_ACCENT,
  fmtPerCentury,
  fmtRate,
  fmtRateWithError,
  landWords,
} from "./sealevelUi";

/** The headline: how fast, measured against the centre of the Earth. */
export function GlobalCard({
  fit,
  curve,
  published,
}: {
  fit: Trend | null;
  curve: Acceleration | null;
  published: number | null;
}) {
  if (!fit) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        Global mean sea level, satellite altimetry
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: SEALEVEL_ACCENT }}
      >
        {fmtRate(fit.mmPerYear)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        averaged over the whole record, {Math.floor(fit.from)} to{" "}
        {Math.floor(fit.to)}. But the average is the wrong shape:{" "}
        {curve && (
          <>
            the rate was {fmtRate(curve.rateAtStart)} at the start and is{" "}
            <span className="text-ice">{fmtRate(curve.rateAtEnd)}</span> now.
          </>
        )}
      </p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="Our fit"
          value={fmtRateWithError(fit.mmPerYear, fit.stdErr)}
          note={`least squares over ${fit.n} samples, computed here`}
        />
        {published !== null && (
          <Row
            label="NOAA's own figure"
            value={`${published.toFixed(2)} mm/yr`}
            note="from the header of the same file, without a glacial isostatic adjustment"
          />
        )}
        {published !== null && (
          <Row
            label="With the GIA correction"
            value={`${(published + GIA_CORRECTION_MM_PER_YEAR).toFixed(2)} mm/yr`}
            note="the figure usually quoted, which answers a different question: how much water, not how high the surface"
          />
        )}
        {curve && (
          <Row
            label="Acceleration"
            value={`+${curve.mmPerYearPerYear.toFixed(3)} mm/yr per year`}
            note="a quadratic fit; the rise has roughly doubled since 1992"
          />
        )}
      </dl>
    </section>
  );
}

/** The acceleration as a staircase, with no curve assumed. */
export function BlocksCard({
  blocks,
}: {
  blocks: Array<{ from: number; to: number; trend: Trend | null }>;
}) {
  const fitted = blocks.filter((b) => b.trend);
  if (fitted.length < 2) return null;
  const max = Math.max(...fitted.map((b) => b.trend!.mmPerYear));

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The same rise, one decade at a time
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        Straight lines over ten-year blocks, with no curve fitted to anything.
      </p>

      <ul className="mt-3 space-y-2">
        {fitted.map((b) => (
          <li key={b.from} className="flex items-center gap-2.5">
            {/* Labelled from what was actually fitted, not from the block
                boundaries: the blocks are half-open, so the first and last
                samples inside one are the honest description of it. */}
            <span className="w-20 font-mono text-[10px] text-faint">
              {Math.floor(b.trend!.from)}–{Math.floor(b.trend!.to)}
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(3, (b.trend!.mmPerYear / max) * 100)}%`,
                  backgroundColor: SEALEVEL_ACCENT,
                  opacity: 0.45 + 0.55 * (b.trend!.mmPerYear / max),
                }}
              />
            </span>
            <span className="w-32 text-right font-mono text-[10px] text-dim">
              {fmtRateWithError(b.trend!.mmPerYear, b.trend!.stdErr)}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {ACCELERATION_NOTE}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">
        {NOT_A_TIDY_STAIRCASE_NOTE}
      </p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
        Ten-year blocks, because ten years is the shortest window this page will
        fit at all. One trend per SATELLITE would have been a neater picture and is
        not available: three of the five have flown for under a decade, and there
        is no sea level trend in four years of data.
      </p>
    </section>
  );
}

/** The four published variants, which are four conventions. */
export function ConventionCard({
  variants,
  active,
  onChange,
  fits,
}: {
  variants: Array<GlobalVariant>;
  active: VariantId;
  onChange: (id: VariantId) => void;
  fits: Partial<Record<VariantId, Trend | null>>;
}) {
  if (variants.length < 2) return null;
  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        One measurement, four published numbers
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        NOAA publishes these same satellite passes four ways. Pick one and the
        chart above redraws; none of them is the true one.
      </p>

      <ul className="mt-3 space-y-1.5">
        {variants.map((v) => {
          const on = v.id === active;
          const fit = fits[v.id] ?? null;
          return (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onChange(v.id)}
                className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                  on
                    ? "border-sky-400/40 bg-white/[0.04]"
                    : "border-line/60 hover:border-line"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[11px]">
                  <span className={on ? "text-ice" : "text-dim"}>
                    seasonal {v.seasonal}, {v.domain}
                  </span>
                  <span style={{ color: on ? SEALEVEL_ACCENT : undefined }}>
                    NOAA {v.publishedTrendMmPerYear.toFixed(2)}
                    {fit && (
                      <span className="ml-1.5 text-faint">
                        · ours {fit.mmPerYear.toFixed(2)}
                      </span>
                    )}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {CONVENTION_NOTE}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{GIA_NOTE}</p>
    </section>
  );
}

/** The seams in a continuous record. */
export function OverlapCard({
  overlaps,
  gaps,
}: {
  overlaps: MissionOverlap[];
  gaps: Record<string, { gaps: number; largestGapDays: number }>;
}) {
  if (overlaps.length === 0) return null;
  const worst = Math.max(...overlaps.map((o) => o.maxAbsDifferenceMm));
  const realGaps = Object.entries(gaps).filter(([, g]) => g.gaps > 0);

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Where one satellite handed over to the next
      </h2>

      <ul className="mt-2.5 space-y-2">
        {overlaps.map((o) => (
          <li
            key={o.missions.join()}
            className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[11px]">
              <span className="text-dim">
                {o.missions[0]} → {o.missions[1]}
              </span>
              <span className="text-ice">
                {o.meanAbsDifferenceMm.toFixed(2)} mm apart on average
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              flew together {o.from.toFixed(2)} to {o.to.toFixed(2)} ·{" "}
              {o.samples} simultaneous samples · worst disagreement{" "}
              {o.maxAbsDifferenceMm.toFixed(2)} mm
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {RELAY_NOTE}
      </p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
        The largest single disagreement in the record is {worst.toFixed(1)} mm,
        which is roughly {(worst / 3.2).toFixed(1)} years of the signal being
        measured.
        {realGaps.length > 0 && (
          <>
            {" "}
            Coverage gaps over 36 days:{" "}
            {realGaps
              .map(([m, g]) => `${m}, ${g.largestGapDays.toFixed(0)} days`)
              .join("; ")}
            . Everything else is continuous.
          </>
        )}
      </p>
    </section>
  );
}

/** One gauge in detail, with the land component named as a residual. */
export function GaugeDetailCard({
  name,
  why,
  whole,
  recent,
  land,
  firstYear,
}: {
  name: string;
  why: string;
  whole: Trend | null;
  recent: Trend | null;
  land: number | null;
  firstYear: number;
}) {
  if (!whole) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        {name}, from {firstYear}
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{why}</p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="Whole record"
          value={fmtRateWithError(whole.mmPerYear, whole.stdErr)}
          note={`${whole.n} years, ${Math.floor(whole.from)} to ${Math.floor(whole.to)}`}
        />
        {recent && (
          <Row
            label="Since 1993"
            value={fmtRateWithError(recent.mmPerYear, recent.stdErr)}
            note={
              recent.mmPerYear > whole.mmPerYear
                ? "faster than its own long-run rate: acceleration at a single station, with no global average involved"
                : undefined
            }
          />
        )}
        {land !== null && (
          <Row
            label="Implied land motion"
            value={`${land >= 0 ? "+" : ""}${land.toFixed(2)} mm/yr, ${landWords(land)}`}
            note="the gauge rate minus the global altimeter rate over the same years. A residual, not a measurement: it lumps vertical land motion together with regional ocean differences. Measuring the land itself takes GPS at the gauge."
          />
        )}
        <Row
          label="At this rate, a century"
          value={fmtPerCentury(recent?.mmPerYear ?? whole.mmPerYear)}
          note="arithmetic, not a forecast"
        />
      </dl>
    </section>
  );
}

/** The load-bearing panel. */
export function SeaLevelHonesty({
  generated,
  credit,
}: {
  generated: Date | null;
  credit: { altimetry: string; gauges: string };
}) {
  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        Two instruments, two questions
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {TWO_INSTRUMENTS_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="The gauge datum:" cls="text-sky-300/90" body={DATUM_NOTE} />
        <Item tag="Our number differs:" cls="text-amber-200/90" body={OUR_TREND_DIFFERS_NOTE} />
        <Item tag="No projection:" cls="text-emerald-300/90" body={NOT_A_FORECAST_NOTE} />
        <Item tag="Not a flood forecast:" cls="text-rose-200/90" body={NOT_FLOOD_RISK_NOTE} />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        {credit.altimetry} {credit.gauges} Committed and refreshed monthly, because
        both are states revised on reprocessing rather than lists of events, and
        neither source sends CORS headers. Every trend, error bar, acceleration and
        residual here is computed by lib/sealevel from those two files.{" "}
        <a
          href={NOAA_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-sky-200/80 transition-colors duration-200 hover:text-sky-100"
        >
          NOAA altimetry
        </a>
        {" · "}
        <a
          href={PSMSL_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-sky-200/80 transition-colors duration-200 hover:text-sky-100"
        >
          PSMSL
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/SEA_LEVEL_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-sky-200/80 transition-colors duration-200 hover:text-sky-100"
        >
          the method
        </a>
        {generated ? ` · mirror built ${generated.toLocaleDateString()}` : ""}
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

function Item({ tag, cls, body }: { tag: string; cls: string; body: string }) {
  return (
    <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
      <span className={cls}>{tag} </span>
      {body}
    </li>
  );
}
