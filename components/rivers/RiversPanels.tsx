"use client";

import {
  CURVE_VERSUS_RECORD_NOTE,
  DAILY_MEAN_NOTE,
  EXTRAPOLATION_NOTE,
  NAME_IS_THE_PROBLEM_NOTE,
  NEVER_NATURAL_NOTE,
  NOT_A_FORECAST_NOTE,
  NOT_BULLETIN_17C_NOTE,
  PEAK_CODES,
  RECONSTRUCTED_PEAKS_GENERAL,
  RECONSTRUCTED_PEAKS_NOTE,
  REGULATION_NOTE,
  WATER_YEAR_NOTE,
  exceedanceProbability,
  multipleExceedanceProbability,
  type GaugeSummary,
  type RiversData,
} from "@/lib/rivers";
import {
  CURVE_COLOR,
  DOCS_BASE,
  RECORD_COLOR,
  REGULATED_COLOR,
  USGS_NWIS_PAGE,
  USGS_PEAK_PAGE,
  fmtArea,
  fmtCfs,
  fmtCumecs,
  fmtOdds,
  fmtPercent,
  fmtReturn,
} from "./riversUi";

/** Windows a reader has a personal stake in. */
const WINDOWS = [
  { years: 1, label: "this year" },
  { years: 5, label: "five years" },
  { years: 30, label: "a thirty year mortgage" },
  { years: 70, label: "a lifetime" },
  { years: 100, label: "a century" },
];

/** The headline card: what the name means, in odds a person can check. */
export function OddsCard({ returnYears }: { returnYears: number }) {
  const mortgage = exceedanceProbability(returnYears, 30);
  const twice = multipleExceedanceProbability(returnYears, 5, 2);
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        A {returnYears} year flood is not a flood every {returnYears} years
      </h2>
      <p
        className="mt-2 font-display text-4xl font-medium tracking-tight"
        style={{ color: CURVE_COLOR }}
      >
        {fmtPercent(mortgage)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        is the chance of seeing at least one, somewhere inside a thirty year mortgage. It means a{" "}
        {fmtOdds(returnYears)} chance in any given year, and that chance does not go down because
        it happened last year.
      </p>

      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        {WINDOWS.map((w) => (
          <Row
            key={w.years}
            label={`At least one in ${w.label}`}
            value={fmtPercent(exceedanceProbability(returnYears, w.years))}
            note={w.years === 100 ? "not a certainty, which is the other half of the confusion" : undefined}
          />
        ))}
        <Row
          label="Two of them inside five years"
          value={twice !== null ? `${fmtPercent(twice, 3)}` : "unknown"}
          note={
            twice !== null && twice > 0
              ? `about ${fmtOdds(1 / twice)} at one gauge, and there are thousands of gauges`
              : undefined
          }
        />
      </dl>

      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {NAME_IS_THE_PROBLEM_NOTE}
      </p>
    </section>
  );
}

/** How much of the number came from the river and how much from the fit. */
export function UncertaintyCard({
  short,
  long,
  returnYears,
}: {
  short: GaugeSummary;
  long: GaugeSummary;
  returnYears: number;
}) {
  if (!short.interval || !long.interval) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        The same question, two record lengths
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: CURVE_COLOR }}
      >
        {short.interval.ratio.toFixed(1)}&times;
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        is how much wider the top of the answer is than the bottom, for the{" "}
        {returnYears} year flood on the shortest record here. On the longest it is{" "}
        {long.interval.ratio.toFixed(1)} times. Nothing separates them but years of measurement.
      </p>
      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label={`${short.gauge.label}, ${short.fit?.n} years`}
          value={fmtCfs(short.interval.estimate)}
          note={`somewhere between ${fmtCfs(short.interval.low)} and ${fmtCfs(short.interval.high)}`}
        />
        <Row
          label={`${long.gauge.label}, ${long.fit?.n} years`}
          value={fmtCfs(long.interval.estimate)}
          note={`somewhere between ${fmtCfs(long.interval.low)} and ${fmtCfs(long.interval.high)}`}
        />
      </dl>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {EXTRAPOLATION_NOTE}
      </p>
    </section>
  );
}

/** The dam, and the curve fitted across it. */
export function RegulationCard({ summary }: { summary: GaugeSummary }) {
  const split = summary.split;
  if (!split || split.beforeDischarge === null || split.afterDischarge === null) return null;
  const combined = split.combinedDischarge;
  const above = combined !== null && combined > split.beforeDischarge;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        {summary.gauge.label}: one gauge, two rivers
      </h2>
      <dl className="mt-3 font-mono text-[11px]">
        <Row
          label={`Before ${split.firstRegulatedYear}, ${split.beforeCount} peaks`}
          value={fmtCfs(split.beforeDischarge)}
          note="the river as it was, fitted on its own"
        />
        <Row
          label={`From ${split.firstRegulatedYear}, ${split.afterCount} peaks`}
          value={fmtCfs(split.afterDischarge)}
          note="every one of these years carries the USGS regulation flag"
        />
        <Row
          label="Both halves, fitted together"
          value={fmtCfs(combined)}
          note={
            above
              ? "higher than the undammed river ever managed, because mixing two populations inflates the spread"
              : "between the two, which is not the same as being right"
          }
        />
      </dl>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {REGULATION_NOTE}
      </p>
    </section>
  );
}

/** What the record says about its own largest flood, against what the curve says. */
export function RecordVersusCurveCard({ summaries }: { summaries: readonly GaugeSummary[] }) {
  const rows = summaries
    .filter((s) => s.largestEmpiricalReturn !== null && s.largestFittedReturn !== null)
    .map((s) => ({
      s,
      ratio: s.largestFittedReturn! / s.largestEmpiricalReturn!,
    }))
    .sort((a, b) => a.ratio - b.ratio);
  if (rows.length === 0) return null;

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        The biggest flood on record, dated two ways
      </h2>
      <div className="hud-scroll -mx-1 mt-2 overflow-x-auto px-1">
        <table className="w-full min-w-[560px] border-collapse text-left font-mono text-[11px]">
          <thead>
            <tr className="text-faint">
              <th className="py-1 pr-3 font-normal">river</th>
              <th className="py-1 pr-3 font-normal">largest peak</th>
              <th className="py-1 pr-3 text-right font-normal">the record says</th>
              <th className="py-1 pr-3 text-right font-normal">the curve says</th>
              <th className="py-1 text-right font-normal">apart by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, ratio }) => (
              <tr key={s.gauge.site} className="border-t border-line">
                <td className="py-1.5 pr-3 text-ice">{s.gauge.label}</td>
                <td className="py-1.5 pr-3 text-dim">
                  {fmtCfs(s.largest?.cfs ?? null)}
                  <span className="ml-1 text-faint">{s.largest?.waterYear}</span>
                </td>
                <td className="py-1.5 pr-3 text-right text-dim">
                  {Math.round(s.largestEmpiricalReturn!)} yr
                </td>
                <td className="py-1.5 pr-3 text-right text-dim">
                  {fmtReturn(s.largestFittedReturn)}
                </td>
                <td
                  className="py-1.5 text-right"
                  style={{ color: ratio > 5 ? REGULATED_COLOR : undefined }}
                >
                  {ratio > 1000 ? "beyond saying" : `${ratio.toFixed(1)}×`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">{CURVE_VERSUS_RECORD_NOTE}</p>
    </section>
  );
}

/** Every gauge, and what kind of record each one is. */
export function GaugeTable({
  summaries,
  selected,
  onSelect,
  returnYears,
}: {
  summaries: readonly GaugeSummary[];
  selected: string;
  onSelect: (site: string) => void;
  returnYears: number;
}) {
  return (
    <section className="hud-panel rounded-2xl p-4">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          Eight rivers, and what kind of record each one is
        </h2>
        <p className="font-mono text-[10px] text-faint">
          USGS annual peak streamflow · pick one to draw its curve
        </p>
      </header>
      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[720px] border-collapse text-left font-mono text-[11px]">
          <thead>
            <tr className="text-faint">
              <th className="py-1 pr-3 font-normal">river</th>
              <th className="py-1 pr-3 text-right font-normal">peaks</th>
              <th className="py-1 pr-3 text-right font-normal">basin</th>
              <th className="py-1 pr-3 text-right font-normal">{returnYears} year flood</th>
              <th className="py-1 pr-3 text-right font-normal">range</th>
              <th className="py-1 font-normal">flags on the record</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const g = s.gauge;
              // A handful of flagged years at the end of a long record is not a
              // regime change, and calling it "regulated from 2020" would invent
              // one. The Mississippi has three, out of a hundred and sixty five.
              const flags: string[] = [];
              if (s.regulatedCount === g.peaks.length) flags.push("regulated throughout");
              else if (s.split) flags.push(`regulated from ${s.split.firstRegulatedYear}`);
              else if (s.regulatedCount > 0)
                flags.push(`${s.regulatedCount} regulated ${plural(s.regulatedCount, "year")}`);
              if (s.historicCount > 0) flags.push(`${s.historicCount} reconstructed`);
              if (s.dailyMeanCount > 0)
                flags.push(`${s.dailyMeanCount} daily ${plural(s.dailyMeanCount, "mean")}`);
              if (flags.length === 0) flags.push("none");
              return (
                <tr
                  key={g.site}
                  onClick={() => onSelect(g.site)}
                  className={`cursor-pointer border-t border-line transition-colors duration-150 ${
                    selected === g.site ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <td className="py-1.5 pr-3 text-ice">{g.label}</td>
                  <td className="py-1.5 pr-3 text-right text-dim">
                    {s.fit?.n}
                    <span className="ml-1 text-faint">
                      {s.fit?.firstYear}-{s.fit?.lastYear}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 text-right text-dim">
                    {fmtArea(g.drainageAreaSqMi)}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-dim">{fmtCfs(s.hundredYear)}</td>
                  <td className="py-1.5 pr-3 text-right text-dim">
                    {s.interval ? `${s.interval.ratio.toFixed(2)}×` : "unknown"}
                  </td>
                  <td
                    className="py-1.5 text-[10.5px]"
                    style={{ color: s.regulatedCount > 0 ? REGULATED_COLOR : undefined }}
                  >
                    {flags.join(", ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        The range column is the top of the resampled ninety percent interval divided by its
        bottom. It tracks record length and nothing else: the longest record here is the tightest
        and the shortest is three times looser.
      </p>
    </section>
  );
}

/** The codes on one river, in USGS's own words. */
export function CodesCard({ summary }: { summary: GaugeSummary }) {
  const codes = Object.entries(summary.gauge.codeCounts).sort((a, b) => b[1] - a[1]);
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        What USGS says about the numbers on {summary.gauge.label}
      </p>
      {codes.length === 0 ? (
        <p className="mt-2 text-[12px] leading-relaxed text-dim">
          No qualification flags on any of the {summary.gauge.peaks.length} peaks. Every one of
          them is an instantaneous peak, gauged, on an unregulated river. That is rare, and it is
          why this record can be fitted without an argument.
        </p>
      ) : (
        <dl className="mt-2 font-mono text-[11px]">
          {codes.map(([code, count]) => (
            <Row
              key={code}
              label={`${count} of ${summary.gauge.peaks.length}`}
              value={code}
              note={PEAK_CODES[code] ?? "an unrecognised code"}
            />
          ))}
        </dl>
      )}
      {closingNote(summary) && (
        <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
          {closingNote(summary)}
        </p>
      )}
    </section>
  );
}

/**
 * The note that belongs to THIS river.
 *
 * Three of the honesty strings name a specific gauge, and an earlier version of
 * this card showed the Willamette one under whichever river happened to be
 * selected. A note about the three largest floods on the Willamette printed
 * under a heading reading "Middle Fork Flathead" is the same fault as a label
 * from one hemisphere over numbers from the other, so the river-specific strings
 * are now gated on the river and everything else gets the general version.
 */
function closingNote(summary: GaugeSummary): string | null {
  if (summary.regulatedCount === summary.gauge.peaks.length) return NEVER_NATURAL_NOTE;
  if (summary.dailyMeanCount > 10) return DAILY_MEAN_NOTE;
  if (summary.historic.dominatesTheTail && summary.historic.count >= 3)
    return RECONSTRUCTED_PEAKS_NOTE;
  if (summary.historicCount > 0) return RECONSTRUCTED_PEAKS_GENERAL;
  if (summary.split) return REGULATION_NOTE;
  return null;
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/** The load-bearing honesty block. */
export function RiversHonesty({
  data,
  generated,
}: {
  data: RiversData;
  generated: Date | null;
}) {
  const peaks = data.gauges.reduce((n, g) => n + g.peaks.length, 0);
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        Where the numbers stop, and what this cannot tell you
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {NOT_BULLETIN_17C_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="The name is the problem:" cls="text-amber-200/90" body={NAME_IS_THE_PROBLEM_NOTE} />
        <Item tag="Every number is an extrapolation:" cls="text-sky-300/90" body={EXTRAPOLATION_NOTE} />
        <Item tag="Two rivers, one gauge:" cls="text-rose-300/90" body={REGULATION_NOTE} />
        <Item tag="Never natural:" cls="text-violet-300/90" body={NEVER_NATURAL_NOTE} />
        <Item tag="Reconstructed, not gauged:" cls="text-emerald-300/90" body={RECONSTRUCTED_PEAKS_NOTE} />
        <Item tag="Daily means among the peaks:" cls="text-amber-200/90" body={DAILY_MEAN_NOTE} />
        <Item tag="A year that starts in October:" cls="text-sky-300/90" body={WATER_YEAR_NOTE} />
        <Item tag="Not a forecast:" cls="text-emerald-300/90" body={NOT_A_FORECAST_NOTE} />
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        Annual peak streamflow and station metadata from the United States Geological Survey
        National Water Information System: {peaks.toLocaleString("en-US")} annual peaks across{" "}
        {data.gauges.length} gauges, the longest running since 1844. Works of the USGS are in the
        public domain and need no key. Every curve, interval, split and probability here is
        computed by lib/rivers from that mirror.{" "}
        <a
          href={USGS_PEAK_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          peak streamflow
        </a>
        {" · "}
        <a
          href={USGS_NWIS_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          NWIS
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/RIVERS_PHYSICS.md`}
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

/** The selected river, in one line, in both unit systems. */
export function RiverSummary({ summary }: { summary: GaugeSummary }) {
  if (!summary.largest) return null;
  return (
    <p className="text-[12px] leading-relaxed text-dim">
      The largest flood {summary.gauge.label} has on record is{" "}
      <span style={{ color: RECORD_COLOR }}>{fmtCfs(summary.largest.cfs)}</span> (
      {fmtCumecs(summary.largest.cfs)}) in water year {summary.largest.waterYear}, out of{" "}
      {summary.gauge.peaks.length} annual peaks. The record puts that at{" "}
      {Math.round(summary.largestEmpiricalReturn ?? 0)} years, because it is the largest of{" "}
      {summary.gauge.peaks.length}. The fitted curve puts it at{" "}
      {fmtReturn(summary.largestFittedReturn)}.
    </p>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
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
