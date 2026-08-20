"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  BASELINES,
  compareSeries,
  parseClimate,
  rebase,
  trend,
  warmestYears,
  type ClimateData,
  type SeriesId,
} from "@/lib/climate";
import WarmingStripes from "./WarmingStripes";
import {
  BaselinePicker,
  ClimateHonesty,
  ComparisonCard,
  TrendCard,
  WarmestCard,
} from "./ClimatePanels";
import { CLIMATE_DATA_PATH, SERIES_COLOR, fmtAnomaly } from "./climateUi";

/**
 * Climate: the instrumental record, and the difference between a number and a
 * trend.
 *
 * The whole tab is built around one interaction. Change the baseline and every
 * headline number moves by up to half a degree while every trend stays
 * identical to twelve decimal places. That is not a design flourish, it is the
 * single most misused fact in public arguments about temperature records, and
 * it is provable rather than assertable: rebasing subtracts a constant, and a
 * constant cannot tilt a line.
 *
 * Committed mirror rather than a live fetch, and the reasoning is written into
 * the fetch script: neither source sends CORS headers, and an annual global
 * mean is a STATE that gets revised monthly rather than a list of events, so a
 * mirror a few weeks old is still a correct description of the climate. The
 * Seismic Earth tab refuses a mirror for exactly the opposite reason.
 */
export default function ClimateApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<ClimateData | null>(null);
  const [failed, setFailed] = useState(false);
  const [seriesId, setSeriesId] = useState<SeriesId>("hadcrut5");
  const [baselineId, setBaselineId] = useState<string>("1850-1900");

  useEffect(() => {
    let cancelled = false;
    fetch(CLIMATE_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseClimate(raw);
        setData(parsed);
        setFailed(!parsed.gistemp && !parsed.hadcrut5);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const native = data?.[seriesId] ?? null;

  /** Which baselines this series cannot honestly be put on. */
  const unavailable = useMemo(() => {
    if (!native) return [];
    return BASELINES.filter((b) => rebase(native, b.range[0], b.range[1]) === null).map(
      (b) => b.id
    );
  }, [native]);

  // If the chosen baseline is out of reach for this series, fall back rather
  // than showing nothing: GISTEMP starts in 1880 and cannot use 1850-1900.
  const effectiveBaselineId = useMemo(() => {
    if (!unavailable.includes(baselineId)) return baselineId;
    const first = BASELINES.find((b) => !unavailable.includes(b.id));
    return first?.id ?? baselineId;
  }, [baselineId, unavailable]);

  const baseline = BASELINES.find((b) => b.id === effectiveBaselineId) ?? BASELINES[0];

  const shown = useMemo(
    () => (native ? rebase(native, baseline.range[0], baseline.range[1]) : null),
    [native, baseline]
  );

  const trends = useMemo(() => {
    const s = shown ?? native;
    if (!s) return [];
    const first = s.years[0];
    const last = s.years[s.years.length - 1];
    return [
      {
        label: `the whole record, ${first} to ${last}`,
        trend: trend(s, first, last),
        note: "Averaged over the full span, including decades when the world barely warmed at all.",
      },
      {
        label: "since 1975",
        trend: trend(s, 1975, last),
        note: "The modern warming period. About two and a half times the full-record rate.",
      },
      {
        label: "the last thirty years",
        trend: trend(s, last - 29, last),
      },
      {
        label: "the last fifteen years",
        trend: trend(s, last - 14, last),
        note: "Note how much wider the error bar is. A short window is where a trend can be made to say almost anything, which is why one should never be quoted without it.",
      },
    ];
  }, [shown, native]);

  const comparison = useMemo(() => {
    if (!data?.gistemp || !data?.hadcrut5) return null;
    // The most recent year both analyses have a full annual value for.
    const shared = data.gistemp.years.filter((y) => data.hadcrut5!.years.includes(y));
    const year = shared[shared.length - 1];
    return compareSeries(data.gistemp, data.hadcrut5, year, [1961, 1990]);
  }, [data]);

  const warmest = useMemo(() => warmestYears(shown ?? native, 10), [shown, native]);

  if (!data) return <BootScreen label="Reading the temperature record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,155,122,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="climate" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Climate
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            The number is a choice. The trend is not.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            Two independent analyses of the instrumental record, and one
            interaction: change the reference period and watch every headline
            number move while every trend stays exactly where it was. That
            difference is the most misused fact in public arguments about
            temperature.
          </p>
        </header>

        {failed ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed temperature record could not be read.
            </p>
          </section>
        ) : (
          <>
            {/* series switch */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["hadcrut5", "gistemp"] as SeriesId[]).map((id) => {
                const s = data[id];
                if (!s) return null;
                const on = id === seriesId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSeriesId(id)}
                    className={`hud-panel cursor-pointer rounded-full px-3.5 py-1.5 font-mono text-[11px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                      on ? "text-ice" : "text-faint hover:text-dim"
                    }`}
                    style={on ? { color: SERIES_COLOR[id] } : undefined}
                  >
                    {s.label}
                  </button>
                );
              })}
              {shown && (
                <span className="font-mono text-[10px] text-faint">
                  {shown.years[shown.years.length - 1]}:{" "}
                  {fmtAnomaly(shown.anomaly[shown.anomaly.length - 1])} against{" "}
                  {baseline.label}
                </span>
              )}
            </div>

            {shown && (
              <div className="mt-3">
                <WarmingStripes series={shown} />
              </div>
            )}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <BaselinePicker
                activeId={effectiveBaselineId}
                onChange={setBaselineId}
                series={shown}
                unavailable={unavailable}
              />
              <TrendCard trends={trends} />
            </div>

            <div className="mt-3">
              <ComparisonCard c={comparison} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <WarmestCard warmest={warmest} series={shown} />
              <ClimateHonesty generated={data.generated} />
            </div>

            {native && (
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
                {native.note}
              </p>
            )}
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
