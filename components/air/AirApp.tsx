"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import { parseAirQuality, subIndices, verdict, type AirSeries } from "@/lib/air";
import ObserverPicker from "@/components/tonight/ObserverPicker";
import { OBSERVER_STORAGE_KEY, PRESET_PLACES } from "@/components/tonight/tonightUi";
import type { Observer } from "@/lib/tonight";
import AirChart from "./AirChart";
import { AirHonesty, PollutantTable, VerdictCard, WhoCard } from "./AirPanels";
import { airFeedUrl, OPEN_METEO_PAGE } from "./airUi";

/**
 * Air: what you are breathing, and why two countries would score it
 * differently.
 *
 * The Earth group already covers the sky over the planet, the solid planet, the
 * oceans and deep time. This is the thin layer people actually live in.
 *
 * It reuses the Tonight tab's observer and its picker, through the same
 * localStorage key: telling this app where you are once should be enough. The
 * page is a scroll layout rather than a HUD over a canvas, because the point
 * here is a comparison between two scales, and a comparison wants to be read.
 */
export default function AirApp() {
  const [aboutOpen, setAboutOpen] = useState(false);

  const [observer, setObserver] = useState<Observer>({
    latDeg: PRESET_PLACES[0].latDeg,
    lonDeg: PRESET_PLACES[0].lonDeg,
  });
  const [placeLabel, setPlaceLabel] = useState<string>(PRESET_PLACES[0].label);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OBSERVER_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { latDeg?: number; lonDeg?: number; label?: string };
        if (
          typeof saved?.latDeg === "number" &&
          typeof saved?.lonDeg === "number" &&
          Number.isFinite(saved.latDeg) &&
          Number.isFinite(saved.lonDeg)
        ) {
          setObserver({ latDeg: saved.latDeg, lonDeg: saved.lonDeg });
          setPlaceLabel(saved.label ?? "Custom");
        }
      }
    } catch {
      /* private mode: the preset stands */
    }
    setRestored(true);
  }, []);

  const changePlace = (next: Observer, label: string) => {
    setObserver(next);
    setPlaceLabel(label);
    try {
      window.localStorage.setItem(OBSERVER_STORAGE_KEY, JSON.stringify({ ...next, label }));
    } catch {
      /* ignore */
    }
  };

  const [series, setSeries] = useState<AirSeries | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);

  // Refetch whenever the place changes, but not before the remembered place has
  // been restored, or the first request is for the wrong city.
  useEffect(() => {
    if (!restored) return;
    let cancelled = false;
    setLoading(true);
    fetch(airFeedUrl(observer.latDeg, observer.lonDeg), { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseAirQuality(raw);
        setSeries(parsed);
        setFailed(parsed.current === null && parsed.hourly.length === 0);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [restored, observer.latDeg, observer.lonDeg]);

  const subs = useMemo(() => subIndices(series?.current ?? null), [series]);
  const v = useMemo(() => verdict(subs), [subs]);

  if (loading && !series) {
    return <BootScreen label="Reading the air where you are" />;
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(143,208,232,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      {/* nav at z-40: tab content below 40, nav at 40, modals at 55+ */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="air" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">Air</p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            What you are breathing in {placeLabel}
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            The same concentrations, scored by two different countries, with the
            pollutant responsible named and the WHO guideline alongside. An index
            number on its own tells you how bad the air is and nothing about what
            is in it or what to do.
          </p>
        </header>

        <div className="mt-4">
          <ObserverPicker observer={observer} label={placeLabel} onChange={changePlace} />
        </div>

        {failed ? (
          <section className="hud-panel mt-3 rounded-2xl border border-amber-400/25 p-5 text-center">
            <h2 className="font-display text-lg font-medium tracking-tight text-ice">
              The air quality feed could not be reached
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-dim">
              This tab reads live and keeps no mirror: a stale concentration is
              worse than none, because air changes hour to hour and an old
              reading looks exactly like a current one.
            </p>
            <a
              href={OPEN_METEO_PAGE}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block font-mono text-[11px] text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
            >
              the feed, direct
            </a>
          </section>
        ) : (
          <>
            <div className="mt-3">
              <VerdictCard reading={series?.current ?? null} verdict={v} />
            </div>

            <div className="mt-3">
              <AirChart hourly={series?.hourly ?? []} now={now} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <PollutantTable subs={subs} />
              <div className="flex flex-col gap-3">
                <WhoCard subs={subs} />
                <AirHonesty reading={series?.current ?? null} />
              </div>
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
