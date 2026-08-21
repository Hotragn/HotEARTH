"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  FIRST_FULL_YEAR,
  MONTH_NAMES,
  bandPosition,
  dailyExtremes,
  extentAreaGap,
  extremes,
  parseSeaIce,
  rankLowest,
  trend,
  trendByMonth,
  type Hemisphere,
  type SeaIceData,
} from "@/lib/seaice";
import SeasonalCurve from "./SeasonalCurve";
import {
  ByMonthCard,
  ExtentAreaCard,
  IceHonesty,
  RecordsCard,
  TodayCard,
  TrendCard,
  TwoPolesCard,
} from "./IcePanels";
import { HEMI_LABEL, ICE_ACCENT, ICE_DATA_PATH } from "./iceUi";

/**
 * Ice: the cryosphere, and the fact that "how much ice is there" has two answers.
 *
 * This tab completes the Earth spine. Air, Climate and Carbon are the
 * atmosphere; Quakes is the solid planet; Magnetic and Aurora are the field;
 * Tides is the ocean. Ice is the part of the system that both responds fastest
 * and feeds back hardest, and it is where the difference between a measurement
 * and a convention is easiest to see: extent and area differ by a third because
 * of a 15 percent threshold somebody chose.
 *
 * The hemisphere switch is the interaction, and it is not decoration. The two
 * poles have never told the same story, and the Antarctic series contains a real
 * rise, a real fall, and a full-record trend indistinguishable from zero. Every
 * slope on the page carries its window and its error bar for that reason.
 */
export default function IceApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<SeaIceData | null>(null);
  const [hemisphere, setHemisphere] = useState<Hemisphere>("north");

  useEffect(() => {
    let cancelled = false;
    fetch(ICE_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setData(parseSeaIce(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hemi = data?.[hemisphere] ?? null;
  const minMonth = hemi?.minimumMonth ?? (hemisphere === "north" ? 9 : 2);
  const minSeries = hemi?.monthly[minMonth] ?? null;

  const dailyYears = useMemo(() => {
    if (!hemi) return [];
    return Object.values(hemi.daily).sort((a, b) => a.year - b.year);
  }, [hemi]);

  const currentYear = dailyYears.length > 0 ? dailyYears[dailyYears.length - 1].year : 0;
  const current = dailyYears.find((d) => d.year === currentYear) ?? null;

  const latestBand = useMemo(() => {
    if (!hemi || !current) return null;
    const i = current.doy.length - 1;
    return bandPosition(hemi.climatology, current.doy[i], current.extent[i]);
  }, [hemi, current]);

  const currentExtremes = useMemo(() => dailyExtremes(current), [current]);

  const trends = useMemo(() => {
    if (!minSeries) return [];
    const last = minSeries.years[minSeries.years.length - 1];
    // Each hemisphere gets its OWN record year for the "ends on the record"
    // window. The first version hardcoded 2012 and labelled it "the Arctic's
    // record low year", which then sat above Antarctic numbers when the switch
    // was flipped: a label from one context describing another, which is the
    // same fault the methane caption had on the carbon tab.
    const recordYear = hemi?.recordMinimumYear ?? null;
    const whole = trend(minSeries, FIRST_FULL_YEAR, 3000);
    const toRecord = recordYear !== null ? trend(minSeries, FIRST_FULL_YEAR, recordYear) : null;

    // Whether ending on the record makes the trend steeper is a QUESTION, not a
    // given, and the answer differs by hemisphere. In the Arctic it does, by a
    // lot. In the Antarctic the years after 2023 partly recovered, so ending on
    // the record actually makes the slope shallower. The first version asserted
    // "steeper" for both, which put Arctic reasoning above Antarctic numbers
    // that contradicted it.
    const steeper =
      toRecord && whole ? Math.abs(toRecord.perDecade) > Math.abs(whole.perDecade) : null;

    return [
      {
        label: `the whole record, ${FIRST_FULL_YEAR} to ${last}`,
        trend: whole,
      },
      {
        label:
          recordYear !== null
            ? `to ${recordYear}, the record low year here`
            : "to the record low year",
        trend: toRecord,
        note:
          steeper === null
            ? undefined
            : steeper
              ? "Steeper, because it ends on the record. Stopping a trend at an extreme is the oldest way to make one look worse than it is, and it is worth seeing the size of the effect."
              : "Shallower here, not steeper, because the years since the record have partly recovered. Ending a window on an extreme usually exaggerates a trend; this hemisphere is the case that shows why the window has to be stated rather than assumed.",
      },
      {
        label: "the first thirty-five years, to 2014",
        trend: trend(minSeries, FIRST_FULL_YEAR, 2014),
      },
      {
        label: `since 2014`,
        trend: trend(minSeries, 2014, 3000),
        note:
          hemisphere === "south"
            ? "The reversal. Seven times steeper than the rise that preceded it, and in the opposite direction."
            : undefined,
      },
      {
        label: "the last fifteen years",
        trend: trend(minSeries, last - 14, 3000),
        note: "Note how much wider the error bar is on a short window.",
      },
    ];
  }, [minSeries, hemi, hemisphere]);

  const byMonth = useMemo(() => trendByMonth(hemi), [hemi]);

  const gaps = useMemo(() => {
    if (!minSeries) return [];
    const last = minSeries.years[minSeries.years.length - 1];
    const record = hemi?.recordMinimumYear ?? null;
    const wanted = [FIRST_FULL_YEAR, 1996, ...(record ? [record] : []), last];
    return wanted
      .filter((y, i, a) => a.indexOf(y) === i)
      .map((y) => extentAreaGap(minSeries, y))
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [minSeries, hemi]);

  const records = useMemo(() => extremes(minSeries), [minSeries]);
  const rank = useMemo(
    () => (records ? rankLowest(minSeries, records.latest.year) : null),
    [minSeries, records]
  );

  const twoPoles = useMemo(() => {
    const build = (h: typeof hemi, month: number) => {
      const s = h?.monthly[month] ?? null;
      return [
        { label: "whole record", trend: trend(s, FIRST_FULL_YEAR, 3000) },
        { label: "to 2014", trend: trend(s, FIRST_FULL_YEAR, 2014) },
        { label: "since 2014", trend: trend(s, 2014, 3000) },
      ];
    };
    return {
      north: build(data?.north ?? null, 9),
      south: build(data?.south ?? null, 2),
    };
  }, [data]);

  if (!data) return <BootScreen label="Reading the sea ice record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(143,216,255,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="ice" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Ice
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            How much sea ice is there? Two answers, a third apart.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            Extent counts a patch of ocean as ice if 15 percent of it is ice. Area
            adds up the fractions. Almost every headline number is the first one.
            Both are in this data, along with two hemispheres that have never told
            the same story.
          </p>
        </header>

        {!hemi ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed sea ice record could not be read.
            </p>
          </section>
        ) : (
          <>
            {/* hemisphere switch */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(["north", "south"] as Hemisphere[]).map((h) => {
                const on = h === hemisphere;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHemisphere(h)}
                    className={`hud-panel cursor-pointer rounded-full px-3.5 py-1.5 font-mono text-[11px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                      on ? "text-ice" : "text-faint hover:text-dim"
                    }`}
                    style={on ? { color: ICE_ACCENT } : undefined}
                  >
                    {HEMI_LABEL[h]}
                  </button>
                );
              })}
              <span className="font-mono text-[10px] text-faint">
                minimum in {MONTH_NAMES[minMonth - 1]}
                {hemisphere === "south" ? ", six months out of step with the north" : ""}
              </span>
            </div>

            <div className="mt-3">
              <TodayCard
                hemisphere={hemisphere}
                band={latestBand}
                complete={currentExtremes?.complete ?? false}
                minimumSoFar={currentExtremes?.minimum ?? null}
              />
            </div>

            <div className="mt-3">
              <SeasonalCurve
                hemisphere={hemisphere}
                climatology={hemi.climatology}
                years={dailyYears}
                currentYear={currentYear}
                recordYear={hemi.recordMinimumYear}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <TrendCard hemisphere={hemisphere} month={minMonth} trends={trends} />
              <ExtentAreaCard hemisphere={hemisphere} month={minMonth} gaps={gaps} />
            </div>

            <div className="mt-3">
              <TwoPolesCard north={twoPoles.north} south={twoPoles.south} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <ByMonthCard hemisphere={hemisphere} byMonth={byMonth} />
              <RecordsCard
                hemisphere={hemisphere}
                month={minMonth}
                lowest={records?.lowest ?? null}
                highest={records?.highest ?? null}
                latest={records?.latest ?? null}
                rank={rank?.rank ?? null}
                outOf={rank?.outOf ?? null}
              />
            </div>

            <div className="mt-3">
              <IceHonesty
                generated={data.generated}
                sources={minSeries?.sources ?? {}}
              />
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
