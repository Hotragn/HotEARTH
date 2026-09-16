"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import {
  SHOWERS_PATH,
  STARS_BACKDROP_PATH,
  parseShowerCatalog,
  parseStarBackdrop,
  type MeteorShowerRecord,
  type ShowerCatalog,
} from "@/lib/meteor-facts";
import RadiantCanvas from "./RadiantCanvas";
import TonightPanel from "./TonightPanel";
import ShowerDetail from "./ShowerDetail";
import ShowerCalendar from "./ShowerCalendar";
import WhyRadiantModal from "./WhyRadiantModal";
import LocationTimeControl from "./LocationTimeControl";
import MeteorAttributionFooter from "./MeteorAttributionFooter";
import {
  BACKDROP_SPHERE_RADIUS,
  DEFAULT_OBSERVER,
  type Observer,
} from "./constants";

/**
 * Meteor Showers tab shell (a "Solar System" world, beside Comets & Asteroids:
 * showers are the debris of those same parent bodies). Loads the shower catalogue
 * (IAU MDC + IMO) and a dim real-star backdrop once, each parsed defensively so a
 * missing/broken file degrades to a graceful empty state rather than a crash.
 * Holds the view state (selection, observer + time, calendar/why overlays) and
 * composes the 3D radiant sphere with the DOM HUD. Heavy per-frame work lives in
 * the scene; React state here only drives the HUD.
 */
export default function MeteorShowersApp() {
  const [catalog, setCatalog] = useState<ShowerCatalog | null>(null);
  const [backdrop, setBackdrop] = useState<Float32Array | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [observer, setObserver] = useState<Observer>(DEFAULT_OBSERVER);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  // Time model: a fixed base captured on load + a scrub offset in hours drives the
  // observer geometry; a separate 1 Hz "now" ticks the live countdown.
  const [baseNow, setBaseNow] = useState(() => Date.now());
  const [offsetHours, setOffsetHours] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const date = useMemo(
    () => new Date(baseNow + offsetHours * 3_600_000),
    [baseNow, offsetHours]
  );
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  // ── Defensive data load (never blocks / crashes the route) ─────────────────
  useEffect(() => {
    let cancelled = false;
    const get = (path: string) =>
      fetch(path)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([get(SHOWERS_PATH), get(STARS_BACKDROP_PATH)]).then(([s, stars]) => {
      if (cancelled) return;
      setCatalog(parseShowerCatalog(s));
      const bd = parseStarBackdrop(stars, BACKDROP_SPHERE_RADIUS, 4.6);
      setBackdrop(bd?.positions ?? null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const showers: MeteorShowerRecord[] = useMemo(
    () => catalog?.showers ?? [],
    [catalog]
  );
  const hasShowers = showers.length > 0;
  const selected = useMemo(
    () => showers.find((s) => s.code === selectedCode) ?? null,
    [showers, selectedCode]
  );

  const handleSelect = useCallback((code: string | null) => {
    setSelectedCode(code);
    setCalendarOpen(false);
  }, []);

  const onNow = useCallback(() => {
    setBaseNow(Date.now());
    setOffsetHours(0);
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {/* ── Scene layer ── */}
      {hasShowers && (
        <RadiantCanvas
          showers={showers}
          backdrop={backdrop}
          date={date}
          selectedCode={selectedCode}
          onSelect={handleSelect}
        />
      )}

      {/* ── HUD layer ── (content first, NavShell last so its dropdowns paint
          above everything) */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {!loaded && <CenteredNote>Tracking the streams…</CenteredNote>}
        {loaded && !hasShowers && (
          <CenteredNote>
            Meteor-shower catalogue unavailable: the data failed to load.
          </CenteredNote>
        )}

        {hasShowers && (
          <>
            {/* honest framing banner (md+, non-interactive; panels paint over it) */}
            <p className="pointer-events-none absolute inset-x-0 bottom-40 hidden px-6 text-center font-mono text-[10px] leading-relaxed tracking-wide text-faint md:block">
              Radiants, dates, velocities &amp; parents are real catalog data (IAU
              MDC + IMO) · ZHR is an idealised peak rate: observed rates are lower ·
              meteor streaks are illustrative
            </p>

            <TonightPanel
              showers={showers}
              observer={observer}
              date={date}
              now={now}
              onSelect={handleSelect}
              onOpenCalendar={() => setCalendarOpen(true)}
              onOpenWhy={() => setWhyOpen(true)}
            />

            {selected && (
              <ShowerDetail
                shower={selected}
                observer={observer}
                date={date}
                onClose={() => setSelectedCode(null)}
              />
            )}

            <LocationTimeControl
              observer={observer}
              onObserverChange={setObserver}
              offsetHours={offsetHours}
              onOffsetChange={setOffsetHours}
              onNow={onNow}
              date={date}
            />

            {calendarOpen && (
              <ShowerCalendar
                showers={showers}
                date={date}
                selectedCode={selectedCode}
                onSelect={handleSelect}
                onClose={() => setCalendarOpen(false)}
              />
            )}
          </>
        )}

        <MeteorAttributionFooter />

        <NavShell onAbout={() => setAboutOpen(true)} active="meteor-showers" />
      </div>

      {whyOpen && <WhyRadiantModal onClose={() => setWhyOpen(false)} />}
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6">
      <p className="max-w-sm text-center font-mono text-xs leading-relaxed text-faint">
        {children}
      </p>
    </div>
  );
}
