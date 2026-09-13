"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  bootstrapBand,
  parseRivers,
  plottingPositions,
  summarise,
  type RiversData,
} from "@/lib/rivers";
import FloodCurve from "./FloodCurve";
import {
  CodesCard,
  GaugeTable,
  OddsCard,
  RecordVersusCurveCard,
  RegulationCard,
  RiverSummary,
  RiversHonesty,
  UncertaintyCard,
} from "./RiversPanels";
import { CURVE_RETURN_PERIODS, RIVERS_ACCENT, RIVERS_DATA_PATH } from "./riversUi";

/**
 * Rivers: what a hundred year flood is, and what it is not.
 *
 * The interaction that matters is the return period selector. Everything on the
 * page is recomputed from it, including the odds card, so a reader who does not
 * believe that a one percent flood has a 26 percent chance of turning up in a
 * mortgage can move the number and watch the arithmetic hold.
 *
 * The second interaction is choosing a river, and the table is ordered so the
 * choice is informative: from a mountain catchment with no dam and no flags
 * through to one that has been regulated for every year it has been measured.
 * The same fit applied to all eight says wildly different things, and the
 * difference is the record, not the method.
 */

/** Return periods a reader might ask about, and what each one is called. */
const RETURNS = [10, 25, 50, 100, 500];

export default function RiversApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<RiversData | null>(null);
  const [site, setSite] = useState<string | null>(null);
  const [returnYears, setReturnYears] = useState(100);

  useEffect(() => {
    let cancelled = false;
    fetch(RIVERS_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setData(parseRivers(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summaries = useMemo(
    () => (data ? data.gauges.map((g) => summarise(g, returnYears)) : []),
    [data, returnYears]
  );

  const selected = useMemo(
    () => summaries.find((s) => s.gauge.site === site) ?? summaries[0] ?? null,
    [summaries, site]
  );

  const band = useMemo(
    () => (selected ? bootstrapBand(selected.gauge.peaks, CURVE_RETURN_PERIODS) : []),
    [selected]
  );
  const positions = useMemo(
    () => (selected ? plottingPositions(selected.gauge.peaks) : []),
    [selected]
  );

  // The shortest and longest records, found rather than named, so adding a gauge
  // to the fetch script cannot leave this panel describing the wrong two rivers.
  const extremes = useMemo(() => {
    const withFit = summaries.filter((s) => s.fit !== null && s.interval !== null);
    if (withFit.length < 2) return null;
    const sorted = [...withFit].sort((a, b) => a.fit!.n - b.fit!.n);
    return { short: sorted[0], long: sorted[sorted.length - 1] };
  }, [summaries]);

  // The clearest split, which is the one with the biggest gap between halves.
  const regulated = useMemo(() => {
    const candidates = summaries.filter(
      (s) => s.split?.beforeDischarge != null && s.split?.afterDischarge != null
    );
    return (
      candidates.sort(
        (a, b) =>
          b.split!.beforeDischarge! / b.split!.afterDischarge! -
          a.split!.beforeDischarge! / a.split!.afterDischarge!
      )[0] ?? null
    );
  }, [summaries]);

  const generated = useMemo(() => {
    if (!data?.generated) return null;
    const t = Date.parse(data.generated);
    return Number.isNaN(t) ? null : new Date(t);
  }, [data]);

  if (!data || !selected) return <BootScreen label="Reading the flood record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% -10%, ${RIVERS_ACCENT}1f 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Rivers · a probability with a badly chosen name
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ice sm:text-4xl">
            The hundred year flood
          </h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-dim">
            It means a flood with a one percent chance of being exceeded in any given year. It does
            not mean once a century, it is not a schedule, and a river that had one last year is
            exactly as likely to have one this year. Everything that follows is fitted to eight
            USGS records, the longest running since 1844, and every number is an extrapolation
            past the end of the record that produced it. This page shows how far past.
          </p>
          <div className="mt-3">
            <RiverSummary summary={selected} />
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Show the
          </span>
          {RETURNS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setReturnYears(t)}
              aria-pressed={returnYears === t}
              className={`pointer-events-auto rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                returnYears === t
                  ? "border-transparent text-abyss"
                  : "border-line text-dim hover:text-ice"
              }`}
              style={returnYears === t ? { backgroundColor: RIVERS_ACCENT } : undefined}
            >
              {t} year
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <FloodCurve
            gauge={selected.gauge}
            fit={selected.fit}
            band={band}
            positions={positions}
            highlightReturn={returnYears}
          />

          <GaugeTable
            summaries={summaries}
            selected={selected.gauge.site}
            onSelect={setSite}
            returnYears={returnYears}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <OddsCard returnYears={returnYears} />
            {extremes && (
              <UncertaintyCard
                short={extremes.short}
                long={extremes.long}
                returnYears={returnYears}
              />
            )}
          </div>

          <RecordVersusCurveCard summaries={summaries} />

          <div className="grid gap-4 sm:grid-cols-2">
            {regulated && <RegulationCard summary={regulated} />}
            <CodesCard summary={selected} />
          </div>

          <RiversHonesty data={data} generated={generated} />
        </div>
      </div>

      <NavShell onAbout={() => setAboutOpen(true)} active="rivers" />
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
