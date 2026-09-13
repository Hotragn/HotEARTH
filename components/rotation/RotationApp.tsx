"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  driftSeconds,
  firstNegativeYear,
  leapGap,
  leapSecondCount,
  leapSecondsBetween,
  parseRotation,
  seasonalCycle,
  trailingMeans,
  yearsToNegativeLeap,
  type RotationData,
} from "@/lib/rotation";
import DriftChart from "./DriftChart";
import LodChart from "./LodChart";
import {
  IntegralCard,
  LeapCard,
  NowCard,
  ReversalCard,
  RotationHonesty,
  SeasonalCard,
  TidalCard,
} from "./RotationPanels";
import { ROTATION_DATA_PATH } from "./rotationUi";

/**
 * Rotation: the day is not 86,400 seconds, and the leap second is the patch.
 *
 * This tab closes a loop the rest of the Earth worlds leave open. The eclipses
 * tab needs to know where the Earth had turned to; the tonight tab needs
 * sidereal time; the moon tab explains tidal braking. All three depend on the
 * fact that the planet is not a clock, and none of them says so.
 *
 * The signature exhibit is an arithmetic identity rather than a picture: the
 * running integral of the measured excess length of day, drawn against the leap
 * seconds actually inserted. Two IERS products, computed independently, landing
 * on each other to a tenth of a second over fifty years.
 */
export default function RotationApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<RotationData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(ROTATION_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setData(parseRotation(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = data?.monthly ?? null;
  const daily = data?.daily ?? null;

  /** The last day that is a measurement, not a prediction. */
  const latest = useMemo(() => {
    if (!daily) return null;
    for (let i = daily.date.length - 1; i >= 0; i--) {
      if (daily.lodMs[i] === null) continue;
      if (daily.predicted[i]) continue;
      return { date: daily.date[i], lodMs: daily.lodMs[i]!, predicted: false };
    }
    return null;
  }, [daily]);

  const drift = useMemo(() => driftSeconds(monthly, "1972-01", "2025-12"), [monthly]);
  const inserted = useMemo(
    () => (data ? leapSecondsBetween(data.leapSeconds, "1972-01", "2025-12") : 0),
    [data]
  );
  const gap = useMemo(
    () => (data ? leapGap(data.leapSeconds, new Date()) : null),
    [data]
  );
  const cycle = useMemo(() => seasonalCycle(monthly, 1990), [monthly]);
  const trailing = useMemo(() => trailingMeans(daily, 365), [daily]);
  const negative = useMemo(
    () =>
      data && trailing
        ? yearsToNegativeLeap(data.latestUt1Utc, trailing.recent.lodMs)
        : null,
    [data, trailing]
  );

  if (!data) return <BootScreen label="Reading the Earth's rotation" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,210,122,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="rotation" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Rotation
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            The day is not 86,400 seconds.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            The second was pinned to the length of a day in about 1820, and the
            Earth has not kept to it since. The difference is a millisecond or two,
            it piles up, and a leap second is what takes it away. Both halves of
            that are measured here rather than described.
          </p>
        </header>

        {!monthly ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed Earth orientation record could not be read.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-4">
              <NowCard
                latestLod={latest?.lodMs ?? null}
                latestDate={latest?.date ?? null}
                ut1Utc={data.latestUt1Utc}
                taiMinusUtc={data.taiMinusUtc}
                predicted={false}
              />
            </div>

            <div className="mt-3">
              <DriftChart monthly={monthly} leapSeconds={data.leapSeconds} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <IntegralCard
                drift={drift}
                inserted={inserted}
                ut1Utc={data.latestUt1Utc}
              />
              <LeapCard
                gap={gap}
                count={leapSecondCount(data.leapSeconds)}
                estimate={negative}
              />
            </div>

            <div className="mt-3">
              <LodChart monthly={monthly} />
            </div>

            <div className="mt-3">
              <ReversalCard
                recent={trailing?.recent ?? null}
                previous={trailing?.previous ?? null}
                shortest={data.extremes?.shortest ?? null}
                firstNegative={firstNegativeYear(monthly)}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <SeasonalCard cycle={cycle} />
              <TidalCard />
            </div>

            <div className="mt-3">
              <RotationHonesty data={data} />
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
