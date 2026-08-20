"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  compareAmplitude,
  growthByDecade,
  parseCarbon,
  seasonalCycle,
  type CarbonData,
  type GasSeriesId,
} from "@/lib/carbon";
import KeelingCurve from "./KeelingCurve";
import {
  AmplitudeCard,
  CarbonHonesty,
  GrowthCard,
  MethaneCard,
  NowCard,
  SeasonalCard,
} from "./CarbonPanels";
import { CARBON_DATA_PATH, SERIES_COLOR } from "./carbonUi";

/**
 * Carbon: the longest continuous measurement of anything in the atmosphere, and
 * the one wobble in it that nobody expected to still be there.
 *
 * The Climate tab measures an effect. This one measures the driver, and it does
 * so with a very different kind of instrument: not thousands of stations
 * homogenised into a global field, but a single analyser on a Hawaiian volcano
 * that has been reading the same air since 1958. Nothing here is modelled.
 *
 * The interaction is the series switch. Put the single station next to the
 * whole-planet average and the seasonal sawtooth shrinks by about a third and
 * shifts a month earlier, which is not the cancellation the usual telling
 * implies, and the reason is simply where the land is.
 */

const ORDER: GasSeriesId[] = ["co2_mlo", "co2_glob", "ch4_glob"];

export default function CarbonApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<CarbonData | null>(null);
  const [failed, setFailed] = useState(false);
  const [seriesId, setSeriesId] = useState<GasSeriesId>("co2_mlo");

  useEffect(() => {
    let cancelled = false;
    fetch(CARBON_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseCarbon(raw);
        setData(parsed);
        setFailed(!parsed.co2_mlo && !parsed.co2_glob && !parsed.ch4_glob);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const series = data?.[seriesId] ?? null;

  // Recent decades only: the amplitude at Mauna Loa has itself been growing, so
  // averaging the whole record understates the cycle as it is today.
  const cycle = useMemo(() => seasonalCycle(series, 1990), [series]);
  const decades = useMemo(() => growthByDecade(series), [series]);
  const amplitude = useMemo(
    () => compareAmplitude(data?.co2_mlo ?? null, data?.co2_glob ?? null),
    [data]
  );

  if (!data) return <BootScreen label="Reading the Keeling record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,196,107,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="carbon" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Carbon
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            You can hear the planet breathing.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            One analyser on a Hawaiian volcano has read the same air every month
            since March 1958. The rise is the part everyone quotes. The small
            annual wobble around it is northern vegetation growing and rotting,
            and it survives into the average of the entire planet.
          </p>
        </header>

        {failed ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed greenhouse-gas record could not be read.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-4">
              <NowCard co2={data.co2_mlo} ch4={data.ch4_glob} />
            </div>

            {/* series switch */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {ORDER.map((id) => {
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
            </div>

            {series && (
              <div className="mt-3">
                <KeelingCurve series={series} />
              </div>
            )}

            {/* The sawtooth is the whole point of this tab and on seventy years
                of rise it reads as line thickness. Same data, last eight years,
                where the breathing is actually legible. */}
            {series && (
              <div className="mt-3">
                <KeelingCurve
                  series={series}
                  lastYears={8}
                  eyebrow={`${series.label}, the last eight years`}
                />
              </div>
            )}

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SeasonalCard cycle={cycle} series={series} />
              <GrowthCard decades={decades} unit={series?.unit ?? "ppm"} />
            </div>

            <div className="mt-3">
              <AmplitudeCard c={amplitude} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <MethaneCard />
              <CarbonHonesty generated={data.generated} />
            </div>

            {series && (
              <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">
                {series.note}
              </p>
            )}
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
