"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  SUDDEN_WARMING_YEARS,
  causeVersusEffect,
  checkIndex,
  crossCheck,
  gasResponses,
  latitudeLadder,
  meanChange,
  parseOzone,
  percentRecovered,
  trend,
  yearsToBenchmark,
  type OzoneData,
} from "@/lib/ozone";
import CauseAndEffect from "./CauseAndEffect";
import GasTable from "./GasTable";
import LatitudeLadder from "./LatitudeLadder";
import {
  CrossCheckCard,
  DetectionCard,
  HoleSummary,
  IndexCard,
  OzoneHonesty,
  ThicknessCard,
  ViolationCard,
  VortexCard,
} from "./OzonePanels";
import { OZONE_ACCENT, OZONE_DATA_PATH } from "./ozoneUi";

/**
 * Ozone: the one we acted on, and what acting looks like from the data.
 *
 * The interaction that matters is the window selector on the hole chart. The
 * whole tab turns on the fact that the answer to "is it recovering" depends on
 * which years you fit a line through, and the only honest way to present that is
 * to let the reader move the start year and watch the slope and its uncertainty
 * move with it. From 1979 the hole is growing at four standard errors. From 2000
 * it is doing nothing at one. Neither line is the physics.
 *
 * The order of the page is the argument: the layer as a thickness, then the
 * chemicals falling, then the hole not following, then five ground stations that
 * explain why the Antarctic and not the Arctic, and last the gases one by one.
 */

/** Windows a reader might reasonably choose, and what each one contains. */
const WINDOWS = [
  { year: 1979, label: "1979", note: "the whole satellite record, onset included" },
  { year: 1990, label: "1990", note: "after the hole was fully established" },
  { year: 2000, label: "2000", note: "from about the halogen peak" },
  { year: 2010, label: "2010", note: "the most recent decade and a half" },
] as const;

/** Before the hole, against the most recent decade and a half. */
const BEFORE: [number, number] = [1963, 1979];
const AFTER: [number, number] = [2010, 2100];

export default function OzoneApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [data, setData] = useState<OzoneData | null>(null);
  const [windowStart, setWindowStart] = useState<number>(2000);

  useEffect(() => {
    let cancelled = false;
    fetch(OZONE_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setData(parseOzone(raw));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const antarctic = data?.odgi.antarctic ?? null;

  const fit = useMemo(
    () => (data ? trend(data.hole.years, data.hole.areaMillionKm2, windowStart) : null),
    [data, windowStart]
  );
  const fullFit = useMemo(
    () => (data ? trend(data.hole.years, data.hole.areaMillionKm2) : null),
    [data]
  );
  const correlation = useMemo(() => (data ? causeVersusEffect(data) : null), [data]);
  const check = useMemo(() => (antarctic ? checkIndex(antarctic) : null), [antarctic]);
  const responses = useMemo(() => (antarctic ? gasResponses(antarctic) : []), [antarctic]);
  const ladder = useMemo(() => (data ? latitudeLadder(data, BEFORE, AFTER) : []), [data]);
  const cross = useMemo(() => (data ? crossCheck(data) : null), [data]);

  // The two polar rows, picked by latitude rather than by name, so a change to
  // the station list cannot leave this panel quietly describing the wrong huts.
  const poles = useMemo(() => {
    const withWorst = ladder.filter((r) => r.worst !== null);
    const south = withWorst.find((r) => r.station.lat < -60) ?? null;
    const north = withWorst.filter((r) => r.station.lat > 60).at(-1) ?? null;
    const shape = (r: typeof south) =>
      r && r.worst
        ? {
            code: r.station.code,
            name: r.station.name,
            month: r.worst.month,
            percent: r.worst.percent,
          }
        : null;
    return { south: shape(south), north: shape(north) };
  }, [ladder]);

  const cfc11 = useMemo(() => {
    if (!antarctic) return { before: null, during: null, after: null };
    return {
      before: meanChange(antarctic, "CFC-11", 2002, 2012),
      during: meanChange(antarctic, "CFC-11", 2013, 2018),
      after: meanChange(antarctic, "CFC-11", 2019, 2100),
    };
  }, [antarctic]);

  const generated = useMemo(() => {
    if (!data?.generated) return null;
    const t = Date.parse(data.generated);
    return Number.isNaN(t) ? null : new Date(t);
  }, [data]);

  if (!data || !antarctic) return <BootScreen label="Reading the ozone record" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: `radial-gradient(120% 80% at 50% -10%, ${OZONE_ACCENT}1f 0%, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-20 sm:px-6">
        <header className="mb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Ozone · three millimetres of gas
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-medium tracking-tight text-ice sm:text-4xl">
            The one we acted on
          </h1>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-dim">
            Every other tab on this site measures something getting worse or something that was
            never anybody&apos;s fault. This one measures the single global environmental problem
            the world agreed to fix, and it is worth being exact about what fixing looks like: the
            chemicals are unambiguously falling, and the hole they cause has not yet shown it in the
            numbers that get reported. Both of those are measurements, and neither is the whole
            story.
          </p>
          <div className="mt-3">
            <HoleSummary hole={data.hole} />
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Fit the hole from
          </span>
          {WINDOWS.map((w) => (
            <button
              key={w.year}
              type="button"
              onClick={() => setWindowStart(w.year)}
              title={w.note}
              aria-pressed={windowStart === w.year}
              className={`pointer-events-auto rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                windowStart === w.year
                  ? "border-transparent text-abyss"
                  : "border-line text-dim hover:text-ice"
              }`}
              style={windowStart === w.year ? { backgroundColor: OZONE_ACCENT } : undefined}
            >
              {w.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <CauseAndEffect
            hole={data.hole}
            index={antarctic}
            fit={fit}
            windowStart={windowStart}
            vortexYears={SUDDEN_WARMING_YEARS}
          />

          <DetectionCard
            fit={fit}
            fullFit={fullFit}
            correlation={correlation}
            windowStart={windowStart}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <ThicknessCard hole={data.hole} />
            <IndexCard
              index={antarctic}
              check={check}
              recovered={percentRecovered(antarctic)}
              straightLine={yearsToBenchmark(antarctic)}
            />
          </div>

          <LatitudeLadder rungs={ladder} before={BEFORE} after={[AFTER[0], data.hole.years.at(-1) ?? AFTER[1]]} />

          <div className="grid gap-4 sm:grid-cols-2">
            <VortexCard south={poles.south} north={poles.north} />
            <CrossCheckCard
              check={cross}
              station={data.stations.find((s) => s.code === cross?.stationCode)}
            />
          </div>

          <GasTable index={antarctic} responses={responses} />

          <ViolationCard before={cfc11.before} during={cfc11.during} after={cfc11.after} />

          <OzoneHonesty data={data} generated={generated} />
        </div>
      </div>

      <NavShell onAbout={() => setAboutOpen(true)} active="ozone" />
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
