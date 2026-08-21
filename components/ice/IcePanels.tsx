"use client";

import {
  CERTAINTY_NOTE,
  EXTENT_THRESHOLD_PERCENT,
  INSTRUMENT_NOTE,
  MONTH_NAMES,
  OUTAGE_NOTE,
  POLE_HOLE_NOTE,
  RECORD_START_NOTE,
  SEA_LEVEL_NOTE,
  THRESHOLD_NOTE,
  TWO_POLES_NOTE,
  VOLUME_NOTE,
  WINDOW_NOTE,
  doyLabel,
  type BandPosition,
  type ExtentAreaGap,
  type Hemisphere,
  type MonthlySeries,
  type Trend,
  type YearValue,
} from "@/lib/seaice";
import {
  AREA_COLOR,
  DOCS_BASE,
  EXTENT_COLOR,
  HEMI_LABEL,
  ICE_ACCENT,
  NSIDC_DATA_PAGE,
  NSIDC_PAGE,
  fmtExtent,
  fmtPercent,
  fmtShort,
  fmtTrend,
  ordinal,
  sigma,
  sigmaWords,
} from "./iceUi";

/** Where the ice is today, against the same day in an earlier era. */
export function TodayCard({
  hemisphere,
  band,
  complete,
  minimumSoFar,
}: {
  hemisphere: Hemisphere;
  band: BandPosition | null;
  complete: boolean;
  minimumSoFar: { doy: number; extent: number } | null;
}) {
  if (!band) return null;
  const belowMedian = ((band.p50 - band.extent) / band.p50) * 100;

  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        {HEMI_LABEL[hemisphere]} sea ice on {doyLabel(band.doy)}
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: ICE_ACCENT }}
      >
        {band.extent.toFixed(2)}
        <span className="ml-1.5 font-mono text-[13px] text-faint">million km²</span>
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        That is <span className="text-ice">{band.label}</span> for this day of the
        year, and {belowMedian >= 0 ? "below" : "above"} the 1981 to 2010 median of{" "}
        {fmtShort(band.p50)} by {Math.abs(belowMedian).toFixed(0)}%.
      </p>

      {minimumSoFar && (
        <p className="mt-2.5 border-t border-line/60 pt-2 font-mono text-[11px] text-dim">
          {complete ? (
            <>
              This year&apos;s minimum: {fmtShort(minimumSoFar.extent)} on{" "}
              {doyLabel(minimumSoFar.doy)}.
            </>
          ) : (
            <>
              Lowest so far this year: {fmtShort(minimumSoFar.extent)} on{" "}
              {doyLabel(minimumSoFar.doy)}.{" "}
              <span className="text-faint">
                The year is not over, so this is not yet a minimum and is not called
                one.
              </span>
            </>
          )}
        </p>
      )}
    </section>
  );
}

/** Trends over several windows, each with its error bar and its verdict. */
export function TrendCard({
  hemisphere,
  month,
  trends,
}: {
  hemisphere: Hemisphere;
  month: number;
  trends: Array<{ label: string; trend: Trend | null; note?: string }>;
}) {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        {MONTH_NAMES[month - 1]} {HEMI_LABEL[hemisphere]} ice, by window
      </h2>

      <ul className="mt-2.5 space-y-2.5">
        {trends.map(({ label, trend, note }) => {
          const s = trend ? sigma(trend.perDecade, trend.stdErrPerDecade) : null;
          return (
            <li key={label} className="border-t border-line/60 pt-2.5 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[11px] text-dim">{label}</span>
                <span className="font-mono text-[12px] text-ice">
                  {trend ? (
                    <>
                      {fmtTrend(trend.perDecade, trend.stdErrPerDecade)}{" "}
                      <span className="text-faint">million km²/decade</span>
                    </>
                  ) : (
                    <span className="text-faint">too short to fit</span>
                  )}
                </span>
              </div>
              {trend && (
                <p className="mt-0.5 font-mono text-[10px] text-faint">
                  {fmtPercent(trend.percentPerDecade)} per decade against the{" "}
                  {trend.referenceYears[0]} to {trend.referenceYears[1]} mean ·{" "}
                  {trend.n} years · {s !== null ? `${s.toFixed(1)}σ, ` : ""}
                  {sigmaWords(s)}
                </p>
              )}
              {note && (
                <p className="mt-1 text-[11px] leading-relaxed text-dim">{note}</p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {WINDOW_NOTE}
      </p>
    </section>
  );
}

/** The convention exhibit: two answers to one question. */
export function ExtentAreaCard({
  hemisphere,
  month,
  gaps,
}: {
  hemisphere: Hemisphere;
  month: number;
  gaps: ExtentAreaGap[];
}) {
  if (gaps.length === 0) return null;
  const max = Math.max(...gaps.map((g) => g.extent));

  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        Two answers, differing by a third
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        The same {MONTH_NAMES[month - 1]} in the same ocean, counted two ways.
      </p>

      <ul className="mt-3 space-y-2">
        {gaps.map((g) => (
          <li key={g.year}>
            <div className="flex items-baseline justify-between font-mono text-[11px]">
              <span className="text-faint">{g.year}</span>
              <span className="text-dim">
                <span style={{ color: EXTENT_COLOR }}>{fmtShort(g.extent)}</span>
                {" extent · "}
                <span style={{ color: AREA_COLOR }}>{fmtShort(g.area)}</span>
                {" area · "}
                <span className="text-ice">
                  {(g.fraction * 100).toFixed(0)}% of it is water
                </span>
              </span>
            </div>
            <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full"
                style={{
                  width: `${(g.area / max) * 100}%`,
                  backgroundColor: AREA_COLOR,
                  opacity: 0.75,
                }}
              />
              <span
                className="block h-full"
                style={{
                  width: `${((g.extent - g.area) / max) * 100}%`,
                  backgroundColor: EXTENT_COLOR,
                  opacity: 0.35,
                }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {THRESHOLD_NOTE}
      </p>
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-faint">
        The {EXTENT_THRESHOLD_PERCENT}% line is why the two bars differ, and the
        gap is not a fixed correction: it moves from year to year with the state of
        the pack.
      </p>
    </section>
  );
}

/** The trend for all twelve months: what a single annual figure hides. */
export function ByMonthCard({
  hemisphere,
  byMonth,
}: {
  hemisphere: Hemisphere;
  byMonth: Array<{ month: number; trend: Trend | null }>;
}) {
  const values = byMonth
    .map((b) => b.trend?.percentPerDecade ?? null)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return null;
  const worst = Math.min(...values);
  const best = Math.max(...values);
  const scale = Math.max(Math.abs(worst), Math.abs(best));

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        {HEMI_LABEL[hemisphere]} trend, month by month
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        Percent per decade against each month&apos;s own 1981 to 2010 average. A
        single annual number averages all twelve of these into one, and hides the
        thing that matters.
      </p>

      <ul className="mt-3 space-y-[3px]">
        {byMonth.map(({ month, trend }) => {
          const v = trend?.percentPerDecade ?? null;
          const frac = v === null ? 0 : Math.abs(v) / scale;
          return (
            <li key={month} className="flex items-center gap-2">
              <span className="w-6 font-mono text-[10px] text-faint">
                {MONTH_NAMES[month - 1].slice(0, 3)}
              </span>
              <span className="relative h-2.5 flex-1 rounded-full bg-white/5">
                {/* zero in the middle, so a sign change is visible as a side */}
                <span className="absolute left-1/2 top-0 h-full w-px bg-white/20" />
                {v !== null && (
                  <span
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      width: `${(frac * 100) / 2}%`,
                      [v < 0 ? "right" : "left"]: "50%",
                      backgroundColor: v < 0 ? EXTENT_COLOR : AREA_COLOR,
                      opacity: 0.4 + 0.6 * frac,
                    }}
                  />
                )}
              </span>
              <span className="w-16 text-right font-mono text-[10px] text-dim">
                {fmtPercent(v)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The two hemispheres, and why they are not one story. */
export function TwoPolesCard({
  north,
  south,
}: {
  north: { label: string; trend: Trend | null }[];
  south: { label: string; trend: Trend | null }[];
}) {
  const row = (
    entries: { label: string; trend: Trend | null }[],
    title: string,
    color: string
  ) => (
    <div className="rounded-xl border border-line/60 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {title}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {entries.map(({ label, trend }) => {
          const s = trend ? sigma(trend.perDecade, trend.stdErrPerDecade) : null;
          return (
            <li key={label} className="font-mono text-[11px]">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-faint">{label}</span>
                <span style={{ color }}>
                  {trend ? fmtTrend(trend.perDecade, trend.stdErrPerDecade) : "--"}
                </span>
              </div>
              <p className="text-[9.5px] text-faint">
                {s !== null ? `${s.toFixed(1)}σ, ${sigmaWords(s)}` : "not measurable"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        One dataset, quoted on both sides of an argument
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {row(north, "Arctic, September minimum", EXTENT_COLOR)}
        {row(south, "Antarctic, February minimum", "#ffc46b")}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-dim">{TWO_POLES_NOTE}</p>
      <p className="mt-2 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {CERTAINTY_NOTE}
      </p>
    </section>
  );
}

/** Records, plainly, with the rank of the current year. */
export function RecordsCard({
  hemisphere,
  month,
  lowest,
  highest,
  latest,
  rank,
  outOf,
}: {
  hemisphere: Hemisphere;
  month: number;
  lowest: YearValue | null;
  highest: YearValue | null;
  latest: YearValue | null;
  rank: number | null;
  outOf: number | null;
}) {
  if (!lowest || !highest || !latest) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        {MONTH_NAMES[month - 1]} {HEMI_LABEL[hemisphere]} records
      </h2>
      <dl className="mt-2 font-mono text-[11px]">
        <Row label={`Lowest, ${lowest.year}`} value={fmtExtent(lowest.value)} />
        <Row label={`Highest, ${highest.year}`} value={fmtExtent(highest.value)} />
        <Row
          label={`Most recent, ${latest.year}`}
          value={fmtExtent(latest.value)}
          note={
            rank !== null && outOf !== null
              ? `${ordinal(rank)} lowest of the ${outOf} years on record`
              : undefined
          }
        />
        <Row
          label="Lost since the highest year"
          value={`${(highest.value - latest.value).toFixed(2)} million km²`}
          note={`${(((highest.value - latest.value) / highest.value) * 100).toFixed(0)}% of the ${highest.year} figure, which is one pair of years rather than a trend`}
        />
      </dl>
    </section>
  );
}

/** The load-bearing panel. */
export function IceHonesty({
  generated,
  sources,
}: {
  generated: Date | null;
  sources: Record<string, [number, number]>;
}) {
  const entries = Object.entries(sources);
  return (
    <section className="hud-panel rounded-2xl border border-sky-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-sky-200/90">
        What this measures, and what it cannot
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {SEA_LEVEL_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="Area, not volume:" cls="text-sky-300/90" body={VOLUME_NOTE} />
        <Item tag="A hole over the pole:" cls="text-amber-200/90" body={POLE_HOLE_NOTE} />
        <Item tag="Where the record starts:" cls="text-emerald-300/90" body={RECORD_START_NOTE} />
        <Item tag="Two months missing:" cls="text-rose-200/90" body={OUTAGE_NOTE} />
        <Item tag="The instrument changed:" cls="text-violet-300/90" body={INSTRUMENT_NOTE} />
      </ul>

      {entries.length > 0 && (
        <p className="mt-3 border-t border-line/60 pt-2 font-mono text-[10px] leading-relaxed text-faint">
          Products under this series:{" "}
          {entries
            .map(([name, [from, to]]) => `${name} ${from}${to !== from ? ` to ${to}` : ""}`)
            .join(" · ")}
        </p>
      )}

      <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        NSIDC Sea Ice Index, Version 4, National Snow and Ice Data Center, Boulder.
        Committed and refreshed monthly, because a monthly mean extent is a state
        revised on reprocessing rather than a list of events, and NSIDC does not
        send CORS headers. Trends, ranks, gaps and every percentage here are
        computed by lib/seaice; the percentile band is NSIDC&apos;s own.{" "}
        <a
          href={NSIDC_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-sky-200/80 transition-colors duration-200 hover:text-sky-100"
        >
          Sea Ice Today
        </a>
        {" · "}
        <a
          href={NSIDC_DATA_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-sky-200/80 transition-colors duration-200 hover:text-sky-100"
        >
          the dataset
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/ICE_PHYSICS.md`}
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
