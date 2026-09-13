"use client";

import type { GasIndex, GasResponse } from "@/lib/ozone";
import { CHEM_COLOR, HOLE_COLOR, fmtPercent, fmtPpt } from "./ozoneUi";

/**
 * Ten gases, each with its own sparkline, sorted by how far it has fallen.
 *
 * The row order is the argument. Methyl chloroform is at the top, down 99
 * percent; the replacement HCFCs are at the bottom, still near their peak. The
 * same treaty, the same years, and a range from gone to not yet started, set
 * almost entirely by atmospheric lifetime and by whether the old stock was
 * scrapped or left to leak.
 *
 * The two right-hand columns are the honest part. The published lifetime is a
 * constant from the WMO assessment; the measured one is fitted from this series.
 * Where they match, emissions have genuinely stopped. Where the measured number
 * is much larger, something is still leaking. The tab shows the disagreement
 * rather than picking one.
 *
 * EVERY SPARKLINE SHARES ITS OWN VERTICAL SCALE, not a common one, because the
 * abundances span a factor of forty and a shared scale would flatten eight of
 * the ten rows into a straight line. The percentage column carries the
 * comparison instead, which is what a number is for.
 */

const SPARK_W = 96;
const SPARK_H = 22;

function Spark({ values, accent }: { values: readonly number[]; accent: string }) {
  if (values.length < 3) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_W;
      const y = SPARK_H - 2 - ((v - lo) / span) * (SPARK_H - 4);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} width={SPARK_W} height={SPARK_H} aria-hidden>
      <path d={d} fill="none" stroke={accent} strokeWidth={1.4} strokeLinejoin="round" />
    </svg>
  );
}

function lifetimeCell(gas: GasResponse) {
  if (gas.lifetimeYears === null) {
    return (
      <span className="text-faint" title="An aggregate of compounds with unlike lifetimes.">
        aggregate
      </span>
    );
  }
  return <span>{gas.lifetimeYears} yr</span>;
}

/** Short label for each of the three reasons there is no decay number. */
const EFOLD_SHORT: Record<string, string> = {
  "peaked too recently to fit": "too recent",
  "no sustained decline": "has not fallen",
  "falls toward a large natural floor, so a decay time means nothing": "not meaningful",
};

function measuredCell(gas: GasResponse) {
  if (gas.measuredEfoldYears === null) {
    const why = gas.efoldUnavailable;
    return (
      <span className="text-faint" title={why ?? undefined}>
        {(why && EFOLD_SHORT[why]) ?? "not fitted"}
      </span>
    );
  }
  const ratio =
    gas.lifetimeYears !== null ? gas.measuredEfoldYears / gas.lifetimeYears : null;
  const close = ratio !== null && ratio > 0.7 && ratio < 1.4;
  return (
    <span style={close ? { color: HOLE_COLOR } : undefined}>
      {gas.measuredEfoldYears.toFixed(0)} yr
    </span>
  );
}

export default function GasTable({
  index,
  responses,
}: {
  index: GasIndex;
  responses: readonly GasResponse[];
}) {
  if (responses.length === 0) return null;
  const first = index.years[0];
  const last = index.years[index.years.length - 1];

  return (
    <section className="hud-panel rounded-2xl p-4">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          One treaty, ten gases, and every one of them on its own schedule
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {first} to {last} · global mean surface abundance
        </p>
      </header>

      <div className="hud-scroll -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[640px] border-collapse text-left font-mono text-[11.5px]">
          <thead>
            <tr className="text-faint">
              <th className="py-1 pr-3 font-normal">gas</th>
              <th className="py-1 pr-3 font-normal">since {first}</th>
              <th className="py-1 pr-3 text-right font-normal">peak</th>
              <th className="py-1 pr-3 text-right font-normal">now</th>
              <th className="py-1 pr-3 text-right font-normal">from peak</th>
              <th className="py-1 pr-3 text-right font-normal">lifetime</th>
              <th className="py-1 text-right font-normal">measured decay</th>
            </tr>
          </thead>
          <tbody>
            {responses.map((gas) => (
              <tr key={gas.name} className="border-t border-line align-middle">
                <td className="py-1.5 pr-3 text-ice">
                  {gas.name}
                  {gas.largelyNatural && (
                    <span
                      className="ml-1.5 text-faint"
                      title="Mostly natural: the treaty can only reach part of it."
                    >
                      nat
                    </span>
                  )}
                </td>
                <td className="py-1 pr-3">
                  <Spark values={index.gases[gas.name] ?? []} accent={CHEM_COLOR} />
                </td>
                <td className="py-1.5 pr-3 text-right text-dim">
                  {fmtPpt(gas.peakPpt)}
                  <span className="ml-1 text-faint">{gas.peakYear}</span>
                </td>
                <td className="py-1.5 pr-3 text-right text-dim">{fmtPpt(gas.latestPpt)}</td>
                <td
                  className="py-1.5 pr-3 text-right"
                  style={{ color: gas.percentFromPeak < -50 ? HOLE_COLOR : undefined }}
                >
                  {fmtPercent(gas.percentFromPeak, 0)}
                </td>
                <td className="py-1.5 pr-3 text-right text-dim">{lifetimeCell(gas)}</td>
                <td className="py-1.5 text-right text-dim">{measuredCell(gas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[12px] leading-relaxed text-dim">
        Sparklines are each on their own scale, because the abundances span a factor of forty and a
        shared one would flatten most of these rows into a straight line. The last two columns are a
        published constant and a number fitted from this series: they agree only for the gas whose
        emissions genuinely stopped, and the size of the gap for the others is roughly how much is
        still leaking out of equipment nobody scrapped. The two gases marked nat are mostly natural
        and get no fitted number at all, because they fall toward an ocean and a biosphere rather
        than toward zero and an exponential fitted to that is not a lifetime.
      </p>
    </section>
  );
}
