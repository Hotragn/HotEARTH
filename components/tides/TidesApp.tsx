"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import {
  CUBE_LAW_NOTE,
  DATUM_NOTE,
  DOUBLE_BULGE_NOTE,
  EQUILIBRIUM_LIMIT_NOTE,
  M2_PERIOD_HOURS,
  NO_PREDICTION_NOTE,
  PHASE_LAG_NOTE,
  RHYTHM_NOTE,
  amplification,
  equilibriumCurve,
  equilibriumTide,
  parseCoOps,
  springNeap,
  type GaugeSeries,
} from "@/lib/tides";
import TideChart from "./TideChart";
import {
  COOPS_CREDIT,
  COOPS_PAGE,
  DOCS_BASE,
  PHASE_LABEL,
  PHASE_NOTE,
  STATIONS,
  TIDES_ACCENT,
  coopsUrl,
  fmtFactor,
  fmtMetres,
  fmtPercent,
} from "./tidesUi";

/** How much history to pull and compute. Three days shows two spring-neap steps. */
const WINDOW_DAYS = 3;

/**
 * Tides: a 300-year-old theory, next to a tide gauge.
 *
 * This tab exists to show one thing honestly. Newton's equilibrium tide is
 * correct physics and it is in every textbook, and it is wrong about the sea
 * level at every coast on Earth, usually by a factor of several. Rather than
 * describe that, the tab computes the theory from the real Moon and Sun
 * positions and plots it against a live NOAA gauge, so the agreement in TIMING
 * and the disagreement in SIZE are both visible in one picture.
 *
 * Everything on the left is computed by lib/tides from positions this app
 * already had. The only thing fetched is the gauge itself.
 */
export default function TidesApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [stationIdx, setStationIdx] = useState(1); // Boston: a big, clean tide
  const [gauge, setGauge] = useState<GaugeSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const station = STATIONS[stationIdx] ?? STATIONS[0];

  const [now] = useState(() => new Date());

  // ── the gauge ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);

    fetch(coopsUrl(station.id, WINDOW_DAYS), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseCoOps(raw);
        setGauge(parsed);
        setFailed(parsed.samples.length < 3);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [station.id]);

  // ── the theory, over exactly the gauge's window ───────────────────────────
  const theory = useMemo(() => {
    if (!gauge || gauge.samples.length < 3) return [];
    const from = gauge.samples[0].time;
    const to = gauge.samples[gauge.samples.length - 1].time;
    // The gauge's own coordinates when it gave them, so the two curves describe
    // the same patch of ocean.
    const lat = gauge.latDeg ?? station.latDeg;
    const lon = gauge.lonDeg ?? station.lonDeg;
    return equilibriumCurve(from, to, lat, lon, 6);
  }, [gauge, station]);

  const gap = useMemo(
    () => amplification(gauge?.samples, theory),
    [gauge, theory]
  );

  const nowTide = useMemo(
    () => equilibriumTide(now, station.latDeg, station.lonDeg),
    [now, station]
  );
  const phase = useMemo(() => springNeap(now), [now]);

  if (loading && !gauge) {
    return <BootScreen label="Reading a real tide gauge" />;
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(79,195,247,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      {/* Chrome at z-40: tab content below 40, nav at 40, modals at 55+. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="tides" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Tides
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            A beautiful theory, and the sea
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            Newton&apos;s equilibrium tide is correct physics, it is in every
            textbook, and it is wrong about the sea level at every coast on
            Earth. This page computes it from the real Moon and Sun, plots it
            against a live NOAA tide gauge, and shows you exactly how wrong, and
            exactly what it still gets right.
          </p>
        </header>

        {/* station picker */}
        <section className="hud-panel mt-4 rounded-2xl p-3.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATIONS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStationIdx(i)}
                className={`cursor-pointer rounded-xl px-3 py-1.5 font-mono text-[11px] tracking-wide transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                  i === stationIdx ? "bg-white/10 text-ice" : "text-faint hover:text-dim"
                }`}
              >
                {s.name.split(",")[0]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-snug text-dim">{station.note}</p>
        </section>

        {failed ? (
          <section className="hud-panel mt-3 rounded-2xl border border-amber-400/25 p-5">
            <h2 className="font-display text-lg font-medium tracking-tight text-ice">
              That gauge could not be read
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-dim">
              The theory half of this page is computed and would render happily
              on its own, but a page whose whole point is the comparison should
              not show you half of it and imply the rest. Try another station, or
              check the NOAA service.
            </p>
            <a
              href={COOPS_PAGE}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-mono text-[11px] text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
            >
              NOAA Tides and Currents
            </a>
          </section>
        ) : (
          <>
            {/* the headline number */}
            <section className="hud-panel mt-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                    The sea beats the theory by
                  </p>
                  <p
                    className="mt-1 font-display text-4xl font-medium tracking-tight"
                    style={{ color: TIDES_ACCENT }}
                  >
                    {gap ? fmtFactor(gap.factor) : "--"}
                  </p>
                </div>
                <dl className="flex flex-wrap gap-x-6 gap-y-2">
                  <Stat label="Measured range" value={gap ? fmtMetres(gap.measuredRangeM) : "--"} />
                  <Stat label="Theory predicts" value={gap ? fmtMetres(gap.predictedRangeM) : "--"} />
                  <Stat
                    label="Right now"
                    value={phase ? PHASE_LABEL[phase.phase] : "unknown"}
                  />
                </dl>
              </div>

              <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
                {EQUILIBRIUM_LIMIT_NOTE}
              </p>
            </section>

            <div className="mt-3">
              <TideChart
                gauge={gauge?.samples ?? []}
                theory={theory}
                stationName={gauge?.stationName ?? station.name}
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {/* what the theory gets right */}
              <section className="hud-panel rounded-2xl p-4">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
                  What the theory gets right
                </h2>
                <p className="mt-2 text-[11px] leading-relaxed text-dim">{RHYTHM_NOTE}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-dim">{PHASE_LAG_NOTE}</p>
                <dl className="mt-3">
                  <Row
                    label="Lunar semi-diurnal beat"
                    value={`${Math.floor(M2_PERIOD_HOURS)} h ${Math.round((M2_PERIOD_HOURS % 1) * 60)} m`}
                    note="M2, the largest constituent almost everywhere. Half a LUNAR day, which is why high tide slides about 50 minutes later each day."
                  />
                  {phase && (
                    <Row
                      label="Spring / neap"
                      value={`${PHASE_LABEL[phase.phase]}, alignment ${fmtPercent(phase.alignment)}`}
                      note={PHASE_NOTE[phase.phase]}
                    />
                  )}
                  {nowTide && (
                    <Row
                      label="Equilibrium height here, now"
                      value={fmtMetres(nowTide.totalM)}
                      note={`Moon ${nowTide.moonM >= 0 ? "+" : ""}${nowTide.moonM.toFixed(3)} m, Sun ${nowTide.sunM >= 0 ? "+" : ""}${nowTide.sunM.toFixed(3)} m. The Moon wins about two to one.`}
                    />
                  )}
                </dl>
              </section>

              {/* what it gets wrong, and why */}
              <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
                  What is real, what is computed
                </h2>
                <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-dim">
                  <Item tag="Two bulges:" tagClass="text-amber-200/90" body={DOUBLE_BULGE_NOTE} />
                  <Item tag="The cube law:" tagClass="text-sky-300/90" body={CUBE_LAW_NOTE} />
                  <Item tag="Different scales:" tagClass="text-emerald-300/90" body={DATUM_NOTE} />
                  <Item tag="For real predictions:" tagClass="text-fuchsia-300/90" body={NO_PREDICTION_NOTE} />
                </ul>
                <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
                  {COOPS_CREDIT} The gauge is the only thing fetched; the tide
                  curve, the spring-neap state and the amplification factor are
                  computed by lib/tides from the Moon and Sun positions this app
                  already had.{" "}
                  <a
                    href={`${DOCS_BASE}/TIDES_PHYSICS.md`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
                  >
                    the physics
                  </a>
                  {gauge && gauge.dropped > 0 && (
                    <>
                      {" "}
                      {gauge.dropped} gauge readings were dropped as missing or
                      unparseable rather than plotted as zero.
                    </>
                  )}
                </p>
              </section>
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[13px] text-ice">{value}</dd>
    </div>
  );
}

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="border-t border-line/60 py-1.5 first:border-t-0 first:pt-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-[12px] text-ice">{value}</dd>
      {note && <p className="mt-0.5 text-[10px] leading-snug text-faint">{note}</p>}
    </div>
  );
}

function Item({
  tag,
  tagClass,
  body,
}: {
  tag: string;
  tagClass: string;
  body: string;
}) {
  return (
    <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
      <span className={tagClass}>{tag} </span>
      {body}
    </li>
  );
}
