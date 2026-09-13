"use client";

import {
  DEFINITION_NOTE,
  INTEGRAL_NOTE,
  MONTH_NAMES,
  NEGATIVE_LEAP_NOTE,
  NOMINAL_DAY_SECONDS,
  NOT_A_FORECAST_NOTE,
  OBSERVED_SLOWING_MS_PER_CENTURY,
  PREDICTION_NOTE,
  REVERSAL_NOTE,
  SEASONAL_NOTE,
  SIGN_FLIP_NOTE,
  SPLICE_NOTE,
  TIDAL_BRAKING_MS_PER_CENTURY,
  TIDAL_NOTE,
  UT1_TOLERANCE_SECONDS,
  driftPerYearSeconds,
  type DayRecord,
  type Drift,
  type LeapGap,
  type NegativeLeapEstimate,
  type RotationData,
  type SeasonalCycle,
  type TrailingMean,
} from "@/lib/rotation";
import {
  DOCS_BASE,
  DRIFT_COLOR,
  FAST_COLOR,
  IERS_PAGE,
  LEAP_PAGE,
  ROTATION_ACCENT,
  SLOW_COLOR,
  dayWords,
  fmtDay,
  fmtLod,
  fmtSeconds,
  fmtYears,
} from "./rotationUi";

/** How long today was, and how far the Earth's clock has slipped. */
export function NowCard({
  latestLod,
  latestDate,
  ut1Utc,
  taiMinusUtc,
  predicted,
}: {
  latestLod: number | null;
  latestDate: string | null;
  ut1Utc: number | null;
  taiMinusUtc: number | null;
  predicted: boolean;
}) {
  if (latestLod === null) return null;
  const slow = latestLod > 0;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        The day on {fmtDay(latestDate)}
        {predicted ? ", predicted" : ", measured"}
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: slow ? SLOW_COLOR : FAST_COLOR }}
      >
        {fmtLod(latestLod)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        {dayWords(latestLod)}. At that rate the Earth gains or loses{" "}
        <span className="text-ice">
          {fmtSeconds(driftPerYearSeconds(latestLod), 2)}
        </span>{" "}
        against atomic time in a year.
      </p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="UT1 minus UTC"
          value={fmtSeconds(ut1Utc)}
          note={`the Earth's own time against atomic time, held inside ${UT1_TOLERANCE_SECONDS} s by leap seconds`}
        />
        <Row
          label="TAI minus UTC"
          value={taiMinusUtc !== null ? `${taiMinusUtc} s` : "unknown"}
          note="every leap second ever inserted, plus the 10 second offset set in 1972"
        />
        <Row
          label="The nominal day"
          value={`${NOMINAL_DAY_SECONDS.toLocaleString()} s`}
          note="a definition pinned to the mean solar day of about 1820, not a measurement of today"
        />
      </dl>
    </section>
  );
}

/** The arithmetic that proves leap seconds are not arbitrary. */
export function IntegralCard({
  drift,
  inserted,
  ut1Utc,
}: {
  drift: Drift | null;
  inserted: number;
  ut1Utc: number | null;
}) {
  if (!drift) return null;
  const residual = drift.seconds - inserted;
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        The patch equals the integral of what it patches
      </h2>

      <dl className="mt-3 font-mono text-[11px]">
        <Row
          label={`Drift accumulated, ${drift.from} to ${drift.to}`}
          value={`${drift.seconds.toFixed(3)} s`}
          note={`the measured excess length of day, summed over ${drift.days.toLocaleString()} days`}
        />
        <Row
          label="Leap seconds actually inserted"
          value={`${inserted} s`}
          note="from the IERS leap second table, computed independently of the line above"
        />
        <Row
          label="Left over"
          value={`${residual >= 0 ? "+" : ""}${residual.toFixed(3)} s`}
          note={
            ut1Utc !== null
              ? `and the UT1-UTC offset standing today is ${fmtSeconds(ut1Utc)}, which is the same quantity`
              : undefined
          }
        />
      </dl>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {INTEGRAL_NOTE}
      </p>
    </section>
  );
}

/** How long since the last leap second, and whether that is unprecedented. */
export function LeapCard({
  gap,
  count,
  estimate,
}: {
  gap: LeapGap | null;
  count: number;
  estimate: NegativeLeapEstimate | null;
}) {
  if (!gap) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Leap seconds
      </h2>
      <p
        className="mt-1 font-display text-3xl font-medium tracking-tight"
        style={{ color: ROTATION_ACCENT }}
      >
        {fmtYears(gap.yearsSinceLast)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        since the last one, on {fmtDay(gap.lastDate)}.{" "}
        {gap.isRecord ? (
          <>
            That is already the <span className="text-ice">longest gap there has been</span>
            , beating {gap.previousLongestYears.toFixed(1)} years from{" "}
            {gap.previousLongestFrom.slice(0, 4)}.
          </>
        ) : (
          <>
            The longest gap so far was {gap.previousLongestYears.toFixed(1)} years.
          </>
        )}
      </p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="Inserted since 1972"
          value={`${count}`}
          note="every one of them positive: a minute with 61 seconds in it"
        />
        <Row
          label="A negative one"
          value={estimate ? `about ${fmtYears(estimate.years)} away at today's rate` : "not in prospect at today's rate"}
          note={
            estimate
              ? "arithmetic, not a forecast: the rate has never held that long"
              : "the Earth is currently running slow again, which drives the offset the other way"
          }
        />
      </dl>

      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {NEGATIVE_LEAP_NOTE}
      </p>
    </section>
  );
}

/** The 2020s speed-up, and its reversal. */
export function ReversalCard({
  recent,
  previous,
  shortest,
  firstNegative,
}: {
  recent: TrailingMean | null;
  previous: TrailingMean | null;
  shortest: DayRecord | null;
  firstNegative: number | null;
}) {
  if (!recent || !previous) return null;
  const sped = recent.lodMs < previous.lodMs;
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        The headline from 2024, checked against today
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            The twelve months before that
          </p>
          <p
            className="mt-1 font-mono text-[16px]"
            style={{ color: previous.lodMs > 0 ? SLOW_COLOR : FAST_COLOR }}
          >
            {fmtLod(previous.lodMs)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            {previous.from} to {previous.to}
          </p>
        </div>
        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            The last twelve measured months
          </p>
          <p
            className="mt-1 font-mono text-[16px]"
            style={{ color: recent.lodMs > 0 ? SLOW_COLOR : FAST_COLOR }}
          >
            {fmtLod(recent.lodMs)}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            {recent.from} to {recent.to}
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ice">
        The Earth has been turning {sped ? "faster" : "slower"} over the last year
        than the year before, by {Math.abs(recent.lodMs - previous.lodMs).toFixed(2)}{" "}
        ms a day.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{SIGN_FLIP_NOTE}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{REVERSAL_NOTE}</p>

      {shortest && (
        <p className="mt-2.5 border-t border-line/60 pt-2 font-mono text-[10px] leading-relaxed text-faint">
          Shortest day in the whole record: {fmtDay(shortest.date)} at{" "}
          {fmtLod(shortest.lodMs)}
          {firstNegative ? ` · first year with a negative annual mean: ${firstNegative}` : ""}
        </p>
      )}
    </section>
  );
}

/** The seasonal cycle in day length, which is the air. */
export function SeasonalCard({ cycle }: { cycle: SeasonalCycle | null }) {
  if (!cycle) return null;
  const max = Math.max(...cycle.byMonth.map((v) => Math.abs(v ?? 0)));

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The year in the length of the day
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{SEASONAL_NOTE}</p>

      <div className="mt-3 flex items-end gap-1" style={{ height: 96 }}>
        {cycle.byMonth.map((v, i) => {
          const val = v ?? 0;
          const h = max > 0 ? (Math.abs(val) / max) * 42 : 0;
          const isLong = i + 1 === cycle.longestMonth;
          const isShort = i + 1 === cycle.shortestMonth;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end">
              <div className="flex h-[46px] w-full items-end justify-center">
                {val > 0 && (
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${h}px`,
                      backgroundColor: isLong ? SLOW_COLOR : "rgba(255,155,122,0.45)",
                    }}
                    title={`${MONTH_NAMES[i]}: ${fmtLod(v)}`}
                  />
                )}
              </div>
              <div className="h-px w-full bg-white/15" />
              <div className="flex h-[46px] w-full items-start justify-center">
                {val <= 0 && (
                  <div
                    className="w-full rounded-b"
                    style={{
                      height: `${h}px`,
                      backgroundColor: isShort ? FAST_COLOR : "rgba(143,224,192,0.45)",
                    }}
                    title={`${MONTH_NAMES[i]}: ${fmtLod(v)}`}
                  />
                )}
              </div>
              <span className="mt-1 font-mono text-[8.5px] text-faint">
                {MONTH_NAMES[i][0]}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row label="Longest days" value={MONTH_NAMES[cycle.longestMonth - 1]} />
        <Row label="Shortest days" value={MONTH_NAMES[cycle.shortestMonth - 1]} />
        <Row
          label="Swing across the year"
          value={`${cycle.amplitude.toFixed(2)} ms`}
          note="larger than the change in annual means across the whole record, which is why one month says little"
        />
        <Row label="Years averaged" value={String(cycle.years)} />
      </dl>
    </section>
  );
}

/** The long slowing, and the two published numbers that disagree. */
export function TidalCard() {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The Moon is doing this, slowly
      </h2>
      <dl className="mt-2 font-mono text-[11px]">
        <Row
          label="Tidal braking, from laser ranging"
          value={`${TIDAL_BRAKING_MS_PER_CENTURY} ms per century`}
          note="how fast the Moon is actually taking angular momentum, measured by bouncing light off the reflectors Apollo left"
        />
        <Row
          label="Observed slowing, from ancient eclipses"
          value={`${OBSERVED_SLOWING_MS_PER_CENTURY} ms per century`}
          note="where Babylonian and Chinese eclipse records say the shadow actually fell"
        />
        <Row
          label="The difference"
          value={`${(TIDAL_BRAKING_MS_PER_CENTURY - OBSERVED_SLOWING_MS_PER_CENTURY).toFixed(1)} ms per century`}
          note="the Earth still rebounding from the last ice age: a rounder planet spins faster"
        />
      </dl>
      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {TIDAL_NOTE}
      </p>
    </section>
  );
}

/** The load-bearing panel. */
export function RotationHonesty({ data }: { data: RotationData }) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        Where the definition came from, and what this cannot tell you
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {DEFINITION_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="Measured, then predicted:" cls="text-amber-200/90" body={PREDICTION_NOTE} />
        <Item tag="Two products, joined:" cls="text-sky-300/90" body={SPLICE_NOTE} />
        <Item tag="Not a forecast:" cls="text-emerald-300/90" body={NOT_A_FORECAST_NOTE} />
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        {data.credit} Definitive through {fmtDay(data.definitiveThrough)}, measured
        through {fmtDay(data.lastFinal)}.
        {data.overlap
          ? ` The two series agree to a median of ${data.overlap.medianMs.toFixed(
              3
            )} ms across ${data.overlap.days.toLocaleString()} shared days.`
          : ""}{" "}
        Every drift, mean, cycle and residual here is computed by lib/rotation from
        that record.{" "}
        <a
          href={IERS_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          IERS
        </a>
        {" · "}
        <a
          href={LEAP_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          Bulletin C
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/ROTATION_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the method
        </a>
        {data.generated ? ` · mirror built ${data.generated.toLocaleDateString()}` : ""}
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
