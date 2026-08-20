"use client";

import {
  AMPLITUDE_NOTE,
  GWP_HORIZON_NOTE,
  ICE_CORE_NOTE,
  MEASUREMENT_NOTE,
  METHANE_GWP,
  NO_ATTRIBUTION_NOTE,
  NO_FORECAST_NOTE,
  PREINDUSTRIAL_CH4_PPB,
  PREINDUSTRIAL_CO2_PPM,
  SEASONAL_COPY,
  SMOOTHING_NOTE,
  timesPreindustrial,
  type AmplitudeComparison,
  type DecadeGrowth,
  type GasSeries,
  type SeasonalCycle,
} from "@/lib/carbon";
import {
  CARBON_ACCENT,
  DOCS_BASE,
  MONTH_SHORT,
  NOAA_PAGE,
  SERIES_COLOR,
  fmtConc,
  fmtDeparture,
  fmtGrowth,
  fmtMonth,
  fmtMultiple,
} from "./carbonUi";

/** Where we are now, against a measurement from a completely different method. */
export function NowCard({
  co2,
  ch4,
}: {
  co2: GasSeries | null;
  ch4: GasSeries | null;
}) {
  const co2Now = co2 ? co2.value[co2.value.length - 1] : null;
  const ch4Now = ch4 ? ch4.value[ch4.value.length - 1] : null;

  return (
    <section className="hud-panel rounded-2xl p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            CO₂ now, Mauna Loa
          </p>
          <p
            className="mt-1 font-display text-4xl font-medium tracking-tight"
            style={{ color: CARBON_ACCENT }}
          >
            {co2Now !== null ? co2Now.toFixed(2) : "--"}
            <span className="ml-1.5 font-mono text-[13px] text-faint">ppm</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-faint">
            {fmtMultiple(co2Now !== null ? timesPreindustrial(co2Now, "co2") : null)} the
            pre-industrial {PREINDUSTRIAL_CO2_PPM} ppm
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Methane now, global
          </p>
          <p
            className="mt-1 font-display text-4xl font-medium tracking-tight"
            style={{ color: SERIES_COLOR.ch4_glob }}
          >
            {ch4Now !== null ? ch4Now.toFixed(0) : "--"}
            <span className="ml-1.5 font-mono text-[13px] text-faint">ppb</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-faint">
            {fmtMultiple(ch4Now !== null ? timesPreindustrial(ch4Now, "ch4") : null)} the
            pre-industrial {PREINDUSTRIAL_CH4_PPB} ppb
          </p>
        </div>
      </div>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {ICE_CORE_NOTE}
      </p>
    </section>
  );
}

/** The seasonal cycle, drawn as twelve bars: the biosphere in one picture. */
export function SeasonalCard({
  cycle,
  series,
}: {
  cycle: SeasonalCycle | null;
  series: GasSeries | null;
}) {
  if (!cycle || !series) return null;
  const max = Math.max(...cycle.byMonth.map((v) => Math.abs(v ?? 0)));
  // Keyed to the series: methane's cycle is not the CO2 cycle, and captioning
  // it with leaf-out was wrong in the first version of this tab.
  const copy = SEASONAL_COPY[series.id];

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        The wobble, month by month
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{copy.note}</p>

      <div className="mt-3 flex items-end gap-1" style={{ height: 96 }}>
        {cycle.byMonth.map((v, i) => {
          const val = v ?? 0;
          const h = max > 0 ? (Math.abs(val) / max) * 42 : 0;
          const isPeak = i + 1 === cycle.peakMonth;
          const isTrough = i + 1 === cycle.troughMonth;
          return (
            <div key={i} className="flex flex-1 flex-col items-center justify-end">
              {/* above the line */}
              <div className="flex h-[46px] w-full items-end justify-center">
                {val > 0 && (
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${h}px`,
                      backgroundColor: isPeak ? CARBON_ACCENT : "rgba(255,196,107,0.45)",
                    }}
                    title={`${MONTH_SHORT[i]}: ${fmtDeparture(v, series.unit)}`}
                  />
                )}
              </div>
              <div className="h-px w-full bg-white/15" />
              {/* below the line */}
              <div className="flex h-[46px] w-full items-start justify-center">
                {val <= 0 && (
                  <div
                    className="w-full rounded-b"
                    style={{
                      height: `${h}px`,
                      backgroundColor: isTrough ? "#8fd0e8" : "rgba(143,208,232,0.45)",
                    }}
                    title={`${MONTH_SHORT[i]}: ${fmtDeparture(v, series.unit)}`}
                  />
                )}
              </div>
              <span className="mt-1 font-mono text-[8.5px] text-faint">
                {MONTH_SHORT[i][0]}
              </span>
            </div>
          );
        })}
      </div>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row label="Peak" value={`${fmtMonth(cycle.peakMonth)}, ${copy.peakReason}`} />
        <Row
          label="Trough"
          value={`${fmtMonth(cycle.troughMonth)}, ${copy.troughReason}`}
        />
        <Row label="Peak to trough" value={fmtConc(cycle.amplitude, series.unit)} />
        <Row label="Years averaged" value={String(cycle.years)} />
      </dl>
    </section>
  );
}

/** The exhibit: one northern station against the whole planet. */
export function AmplitudeCard({ c }: { c: AmplitudeComparison | null }) {
  if (!c) return null;
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        CO₂: one station against the whole planet, {c.from} to {c.to}
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Mauna Loa, 19.5° N
          </p>
          <p className="mt-1 font-mono text-[16px]" style={{ color: SERIES_COLOR.co2_mlo }}>
            {c.stationAmplitude.toFixed(2)} ppm swing
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            peaks {fmtMonth(c.stationPeakMonth)}
          </p>
        </div>
        <div className="rounded-xl border border-line/60 p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
            Globally averaged
          </p>
          <p className="mt-1 font-mono text-[16px]" style={{ color: SERIES_COLOR.co2_glob }}>
            {c.globalAmplitude.toFixed(2)} ppm swing
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-faint">
            peaks {fmtMonth(c.globalPeakMonth)}, a month earlier
          </p>
        </div>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-ice">
        The station swings{" "}
        <span className="text-amber-200/90">{c.ratio.toFixed(2)} times</span> as much
        as the entire planet, not several times over.
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{AMPLITUDE_NOTE}</p>
    </section>
  );
}

/** Growth per decade: the acceleration. */
export function GrowthCard({
  decades,
  unit,
}: {
  decades: DecadeGrowth[];
  unit: string;
}) {
  if (decades.length === 0) return null;
  const max = Math.max(...decades.map((d) => d.perYear));

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        How fast it is rising, by decade
      </h2>
      <ul className="mt-2 space-y-1">
        {decades.map((d) => (
          <li key={d.decade} className="flex items-center gap-2.5">
            <span className="w-12 font-mono text-[11px] text-ice">{d.decade}s</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${Math.max(3, (d.perYear / max) * 100)}%`,
                  backgroundColor: CARBON_ACCENT,
                  opacity: 0.5 + 0.5 * (d.perYear / max),
                }}
              />
            </span>
            <span className="w-24 text-right font-mono text-[11px] text-dim">
              {fmtGrowth(d.perYear, unit)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        Each bar is the mean year-over-year increase in the annual mean, and a
        decade needs at least five complete years to appear at all. A year in
        progress is excluded, because averaging a partial year puts it on the
        seasonal cycle rather than on the trend.
      </p>
    </section>
  );
}

/** Methane potency: the second "the number is a convention" exhibit. */
export function MethaneCard() {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        How strong is methane?
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">
        It depends entirely on the question you ask, and the honest answer is a
        table rather than a number.
      </p>

      <ul className="mt-3">
        {METHANE_GWP.map((g) => (
          <li key={g.horizonYears} className="border-t border-line/60 py-2 first:border-t-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-mono text-[11px] text-faint">
                over {g.horizonYears} years
              </span>
              <span className="font-mono text-[13px]" style={{ color: CARBON_ACCENT }}>
                {g.gwp.toFixed(g.gwp < 10 ? 2 : 1)}x CO₂
              </span>
            </div>
            <p className="mt-0.5 text-[10px] leading-snug text-faint">{g.note}</p>
          </li>
        ))}
      </ul>

      <p className="mt-2.5 border-t border-line/60 pt-2 text-[11px] leading-relaxed text-dim">
        {GWP_HORIZON_NOTE}
      </p>
    </section>
  );
}

/** The load-bearing panel. */
export function CarbonHonesty({ generated }: { generated: Date | null }) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        What is measured, what is left out
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {MEASUREMENT_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="The smoothing:" cls="text-amber-200/90" body={SMOOTHING_NOTE} />
        <Item tag="No projection:" cls="text-sky-300/90" body={NO_FORECAST_NOTE} />
        <Item
          tag="Concentration, not cause:"
          cls="text-emerald-300/90"
          body={NO_ATTRIBUTION_NOTE}
        />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        Committed mirror, refreshed monthly, because a monthly mean is a state
        revised on reanalysis rather than a list of events and NOAA does not send
        CORS headers. The seasonal decomposition, growth rates, multiples of
        pre-industrial and the amplitude comparison are computed by lib/carbon.{" "}
        <a
          href={NOAA_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          NOAA GML
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/CARBON_PHYSICS.md`}
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
