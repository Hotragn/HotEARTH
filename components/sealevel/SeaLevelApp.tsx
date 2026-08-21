"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  acceleration,
  landComponentEstimate,
  parseSeaLevel,
  trend,
  trendByBlock,
  type SeaLevelData,
  type Trend,
  type VariantId,
} from "@/lib/sealevel";
import AltimetryChart from "./AltimetryChart";
import GaugeComparison from "./GaugeComparison";
import {
  BlocksCard,
  ConventionCard,
  GaugeDetailCard,
  GlobalCard,
  OverlapCard,
  SeaLevelHonesty,
} from "./SeaLevelPanels";
import { SEALEVEL_ACCENT, SEALEVEL_DATA_PATH } from "./sealevelUi";

/**
 * Sea level: two instruments answering two different questions.
 *
 * The ice tab says, in as many words, that melting sea ice does not raise sea
 * level and that the rise comes from land ice and thermal expansion, neither of
 * which it computes. This tab is the other half of that sentence.
 *
 * The interaction that matters is the gauge comparison. A satellite reports one
 * number for the whole planet; ten tide gauges report rates from minus eighteen
 * to plus thirteen millimetres a year, because a gauge measures the sea against
 * ground that is itself rising or sinking. Both instruments are right, and the
 * person asking whether their street will flood wants the second one.
 */

const ALTIMETRY_START = 1993;

export default function SeaLevelApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<SeaLevelData | null>(null);
  const [variantId, setVariantId] = useState<VariantId>("free_all_66");
  const [gaugeId, setGaugeId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SEALEVEL_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setData(parseSeaLevel(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const variants = useMemo(
    () => (data ? Object.values(data.global).filter((v) => v !== undefined) : []),
    [data]
  );
  const variant = data?.global[variantId] ?? variants[0] ?? null;

  const fits = useMemo(() => {
    const out: Partial<Record<VariantId, Trend | null>> = {};
    for (const v of variants) out[v.id] = trend(v.time, v.value);
    return out;
  }, [variants]);

  const fit = variant ? (fits[variant.id] ?? null) : null;
  const curve = useMemo(
    () => (variant ? acceleration(variant.time, variant.value) : null),
    [variant]
  );
  const blocks = useMemo(() => trendByBlock(variant, 10), [variant]);

  const gauges = data?.gauges ?? [];
  const gauge = useMemo(
    () => gauges.find((g) => g.id === gaugeId) ?? gauges[0] ?? null,
    [gauges, gaugeId]
  );

  const gaugeWhole = useMemo(
    () => (gauge ? trend(gauge.years, gauge.value) : null),
    [gauge]
  );
  const gaugeRecent = useMemo(
    () => (gauge ? trend(gauge.years, gauge.value, ALTIMETRY_START) : null),
    [gauge]
  );
  const land = useMemo(
    () => landComponentEstimate(gauge, fit?.mmPerYear ?? null, ALTIMETRY_START),
    [gauge, fit]
  );

  if (!data) return <BootScreen label="Reading the sea level record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(127,196,255,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="sea-level" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Sea level
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            In some places the sea is going down.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            A satellite measures the sea against the centre of the Earth and gets
            one number for the planet. A tide gauge measures it against the land it
            is bolted to, and the land moves. Both are right, which is why the same
            ocean gives Skagway minus 18 millimetres a year and Manila plus 13.
          </p>
        </header>

        {!variant ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed sea level record could not be read.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-4">
              <GlobalCard
                fit={fit}
                curve={curve}
                published={variant.publishedTrendMmPerYear}
              />
            </div>

            <div className="mt-3">
              <AltimetryChart variant={variant} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <BlocksCard blocks={blocks} />
              <ConventionCard
                variants={variants}
                active={variant.id}
                onChange={setVariantId}
                fits={fits}
              />
            </div>

            <div className="mt-3">
              <GaugeComparison
                gauges={gauges}
                globalMmPerYear={fit?.mmPerYear ?? null}
                since={ALTIMETRY_START}
              />
            </div>

            {/* one gauge in detail */}
            {gauges.length > 0 && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
                    In detail
                  </span>
                  {gauges.map((g) => {
                    const on = gauge?.id === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGaugeId(g.id)}
                        className={`hud-panel cursor-pointer rounded-full px-3 py-1 font-mono text-[10px] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                          on ? "text-ice" : "text-faint hover:text-dim"
                        }`}
                        style={on ? { color: SEALEVEL_ACCENT } : undefined}
                      >
                        {g.name}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {gauge && (
                    <GaugeDetailCard
                      name={gauge.name}
                      why={gauge.why}
                      whole={gaugeWhole}
                      recent={gaugeRecent}
                      land={land}
                      firstYear={gauge.firstYear}
                    />
                  )}
                  <OverlapCard overlaps={variant.overlaps} gaps={variant.gaps} />
                </div>
              </>
            )}

            <div className="mt-3">
              <SeaLevelHonesty generated={data.generated} credit={data.credit} />
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
