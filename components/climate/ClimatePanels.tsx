"use client";

import {
  ANOMALY_NOT_ABSOLUTE_NOTE,
  BASELINES,
  BASELINE_NOTE,
  COVERAGE_NOTE,
  NO_ATTRIBUTION_NOTE,
  SINGLE_YEAR_NOTE,
  TWO_ANALYSES_NOTE,
  type SeriesComparison,
  type TemperatureSeries,
  type Trend,
} from "@/lib/climate";
import {
  CLIMATE_ACCENT,
  GISTEMP_PAGE,
  HADCRUT_PAGE,
  DOCS_BASE,
  SERIES_COLOR,
  fmtAnomaly,
  fmtBaseline,
  fmtPercent,
  fmtTrend,
} from "./climateUi";

/** The baseline switcher, which is the interactive core of the tab. */
export function BaselinePicker({
  activeId,
  onChange,
  series,
  unavailable,
}: {
  activeId: string;
  onChange: (id: string) => void;
  series: TemperatureSeries | null;
  unavailable: string[];
}) {
  const active = BASELINES.find((b) => b.id === activeId);
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Measured from when?
      </h2>

      <div
        role="tablist"
        aria-label="Baseline period"
        className="mt-2 flex flex-wrap gap-1"
      >
        {BASELINES.map((b) => {
          const isActive = b.id === activeId;
          const off = unavailable.includes(b.id);
          return (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={off}
              onClick={() => onChange(b.id)}
              title={off ? "this series does not reach back that far" : undefined}
              className={`cursor-pointer rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 disabled:cursor-not-allowed disabled:opacity-35 ${
                isActive ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
              }`}
            >
              {b.label}
            </button>
          );
        })}
      </div>

      {active && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-dim">
          <span style={{ color: CLIMATE_ACCENT }}>{active.label}: </span>
          {active.who}
        </p>
      )}

      {series && (
        <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
          <Row
            label={`${series.years[series.years.length - 1]} on this baseline`}
            value={fmtAnomaly(series.anomaly[series.anomaly.length - 1])}
          />
          <Row label="Baseline in use" value={fmtBaseline(series.baseline)} />
        </dl>
      )}

      <p className="mt-3 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {BASELINE_NOTE}
      </p>
    </section>
  );
}

/** Trends over several windows, each with its error bar. */
export function TrendCard({
  trends,
}: {
  trends: Array<{ label: string; trend: Trend | null; note?: string }>;
}) {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The slope, which the baseline cannot touch
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        Change the baseline above and every one of these numbers stays exactly
        the same, to twelve decimal places. Rebasing subtracts one constant from
        every year, and subtracting a constant cannot tilt a line. This is the
        number to argue about.
      </p>

      <ul className="mt-3">
        {trends.map((t) => (
          <li
            key={t.label}
            className="border-t border-line/60 py-2 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-mono text-[11px] text-faint">{t.label}</span>
              <span
                className="font-mono text-[12px]"
                style={{ color: t.trend ? CLIMATE_ACCENT : undefined }}
              >
                {t.trend
                  ? fmtTrend(t.trend.perDecade, t.trend.stdErrPerDecade)
                  : "too few years to fit"}
              </span>
            </div>
            {t.trend && (
              <p className="mt-0.5 font-mono text-[10px] text-faint">
                {t.trend.n} years, r² = {t.trend.rSquared.toFixed(2)}
              </p>
            )}
            {t.note && (
              <p className="mt-0.5 text-[10px] leading-snug text-faint">{t.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The headline exhibit: two analyses, before and after a common baseline. */
export function ComparisonCard({ c }: { c: SeriesComparison | null }) {
  if (!c) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="text-[11px] text-dim">
          Both analyses do not cover a common year to compare.
        </p>
      </section>
    );
  }
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        Two teams, one planet, {c.year}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            as each one publishes it
          </p>
          <div className="mt-1.5 space-y-1 font-mono text-[12px]">
            <p style={{ color: SERIES_COLOR.gistemp }}>
              NASA {fmtAnomaly(c.publishedA)}
            </p>
            <p style={{ color: SERIES_COLOR.hadcrut5 }}>
              Met Office {fmtAnomaly(c.publishedB)}
            </p>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-solar">
            {fmtAnomaly(c.publishedGap)} apart
          </p>
        </div>

        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            both on {c.commonBaseline[0]} to {c.commonBaseline[1]}
          </p>
          <div className="mt-1.5 space-y-1 font-mono text-[12px]">
            <p style={{ color: SERIES_COLOR.gistemp }}>NASA {fmtAnomaly(c.rebasedA)}</p>
            <p style={{ color: SERIES_COLOR.hadcrut5 }}>
              Met Office {fmtAnomaly(c.rebasedB)}
            </p>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-emerald-300/90">
            {fmtAnomaly(c.rebasedGap)} apart
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ice">
        <span className="text-amber-200/90">
          {fmtPercent(c.fractionExplainedByBaseline)} of the apparent disagreement
          was the baseline,{" "}
        </span>
        not the planet.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{TWO_ANALYSES_NOTE}</p>
    </section>
  );
}

/** The warmest years, which is what people actually ask. */
export function WarmestCard({
  warmest,
  series,
}: {
  warmest: Array<{ year: number; anomaly: number }>;
  series: TemperatureSeries | null;
}) {
  if (warmest.length === 0) return null;
  const max = warmest[0].anomaly;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The ten warmest years on record
      </h2>
      <ul className="mt-2 space-y-1">
        {warmest.map((w) => (
          <li key={w.year} className="flex items-center gap-2.5">
            <span className="w-10 font-mono text-[11px] text-ice">{w.year}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(4, (w.anomaly / max) * 100)}%`,
                  backgroundColor: CLIMATE_ACCENT,
                  opacity: 0.55 + 0.45 * (w.anomaly / max),
                }}
              />
            </span>
            <span className="w-20 text-right font-mono text-[11px] text-dim">
              {fmtAnomaly(w.anomaly)}
            </span>
          </li>
        ))}
      </ul>
      {series && (
        <p className="mt-2 font-mono text-[10px] text-faint">
          {series.label}, against {fmtBaseline(series.baseline)}
        </p>
      )}
      <p className="mt-2 border-t border-line/60 pt-2 text-[10px] leading-snug text-faint">
        {SINGLE_YEAR_NOTE}
      </p>
    </section>
  );
}

/** The load-bearing panel. */
export function ClimateHonesty({ generated }: { generated: Date | null }) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        What is measured, what is a convention
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {ANOMALY_NOT_ABSOLUTE_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="A thin early record:" cls="text-amber-200/90" body={COVERAGE_NOTE} />
        <Item tag="One year is weather:" cls="text-sky-300/90" body={SINGLE_YEAR_NOTE} />
        <Item
          tag="Measurement, not attribution:"
          cls="text-emerald-300/90"
          body={NO_ATTRIBUTION_NOTE}
        />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        Committed mirror, refreshed monthly, because an annual global mean is a
        state rather than a list of events and neither source sends CORS headers.
        Rebasing, trends, error bars and the comparison are all computed by
        lib/climate.{" "}
        <a
          href={GISTEMP_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          NASA GISTEMP
        </a>
        {" · "}
        <a
          href={HADCRUT_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          Met Office HadCRUT5
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/CLIMATE_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the method
        </a>
        {generated ? ` · mirror built ${generated.toLocaleDateString()}` : ""}
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line/60 pt-1.5 first:border-t-0 first:pt-0">
      <dt className="text-faint">{label}</dt>
      <dd className="text-ice">{value}</dd>
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
