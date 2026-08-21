"use client";

import { useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import BootScreen from "@/components/ui/BootScreen";
import ObserverPicker from "@/components/tonight/ObserverPicker";
import { OBSERVER_STORAGE_KEY, PRESET_PLACES } from "@/components/tonight/tonightUi";
import {
  annualChange,
  dipPole,
  dipoleMoment,
  dipoleTilt,
  fieldAt,
  geomagneticPole,
  parseIgrf,
  poleTrack,
  weakestField,
  type IgrfModel,
} from "@/lib/geomagnetism";
import DeclinationMap from "./DeclinationMap";
import PoleWalk from "./PoleWalk";
import {
  AnomalyCard,
  HereCard,
  MagneticHonesty,
  MomentCard,
  ThreePolesCard,
} from "./MagneticPanels";
import { MAGNETIC_DATA_PATH, decimalYear } from "./magneticUi";

/**
 * Magnetic: the field of the core, from 195 numbers.
 *
 * This tab is the one place in the app where a single small file expands into a
 * whole planet. Everything on screen, the declination at your feet, the world
 * map, the three poles, the pole's hundred-year walk, the dipole's decline and
 * the South Atlantic Anomaly, is synthesised in the browser from the IGRF-14
 * Gauss coefficients. No tiles, no images, no lookups.
 *
 * It also joins two tabs that were already here. The aurora is centred on the
 * geomagnetic pole this page computes, and the satellites crossing the South
 * Atlantic Anomaly are the ones the ISS tab is tracking.
 *
 * The year is adjustable because the field moves, and that is the point: a
 * compass correction printed in 1990 is wrong now, in a way you can watch.
 */
export default function MagneticApp() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [model, setModel] = useState<IgrfModel | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [observer, setObserver] = useState({
    latDeg: PRESET_PLACES[0].latDeg,
    lonDeg: PRESET_PLACES[0].lonDeg,
  });
  const [placeLabel, setPlaceLabel] = useState<string>(PRESET_PLACES[0].label);

  // The same remembered place the tonight, aurora and quakes tabs use: picking
  // your own city once should be enough for the whole app.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(OBSERVER_STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { latDeg?: number; lonDeg?: number; label?: string };
        if (
          typeof s?.latDeg === "number" &&
          typeof s?.lonDeg === "number" &&
          Number.isFinite(s.latDeg) &&
          Number.isFinite(s.lonDeg)
        ) {
          setObserver({ latDeg: s.latDeg, lonDeg: s.lonDeg });
          setPlaceLabel(s.label ?? "your location");
        }
      }
    } catch {
      /* private mode: the preset is fine */
    }
  }, []);

  const [year, setYear] = useState<number>(() => decimalYear(new Date()));

  useEffect(() => {
    let cancelled = false;
    fetch(MAGNETIC_DATA_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setModel(parseIgrf(raw));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onPlace = (o: { latDeg: number; lonDeg: number }, label: string) => {
    setObserver(o);
    setPlaceLabel(label);
    try {
      window.localStorage.setItem(
        OBSERVER_STORAGE_KEY,
        JSON.stringify({ ...o, label })
      );
    } catch {
      /* private mode */
    }
  };

  const field = useMemo(
    () => fieldAt(model, observer.latDeg, observer.lonDeg, 0, year),
    [model, observer, year]
  );
  const change = useMemo(
    () => annualChange(model, observer.latDeg, observer.lonDeg, 0, year),
    [model, observer, year]
  );
  const geomagnetic = useMemo(() => geomagneticPole(model, year), [model, year]);
  const tilt = useMemo(() => dipoleTilt(model, year), [model, year]);
  const dipNorth = useMemo(() => dipPole(model, year, "north"), [model, year]);
  const dipSouth = useMemo(() => dipPole(model, year, "south"), [model, year]);
  const track = useMemo(() => poleTrack(model, "north", 5), [model]);

  const moments = useMemo(() => {
    if (!model) return [];
    const out: Array<{ year: number; moment: number }> = [];
    for (const y of model.epochs) {
      const m = dipoleMoment(model, y);
      if (m !== null) out.push({ year: y, moment: m });
    }
    return out;
  }, [model]);

  const anomalyNow = useMemo(() => weakestField(model, year), [model, year]);
  const anomalyThen = useMemo(
    () => (model ? weakestField(model, model.validFrom) : null),
    [model]
  );

  if (!loaded) return <BootScreen label="Reading the field of the core" />;

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-abyss">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% -10%, rgba(255,122,122,0.10) 0%, rgba(5,6,15,0) 60%), linear-gradient(180deg, #05060f 0%, #03040c 100%)",
        }}
      />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
        <NavShell onAbout={() => setAboutOpen(true)} active="magnetic" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-[104px] sm:px-6 sm:pt-[116px]">
        <header className="animate-hud-in">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-faint">
            Magnetic
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-medium tracking-tight text-ice sm:text-3xl">
            Your compass does not point north.
          </h1>
          <p className="mt-1.5 max-w-3xl text-[12px] leading-relaxed text-dim">
            It points along the local field, which in most places is degrees away
            from true north and moves every year. This whole page, the map, the
            poles, the century of drift, is computed in your browser from 195
            numbers: the IGRF-14 spherical harmonic coefficients.
          </p>
        </header>

        {!model ? (
          <section className="hud-panel mt-4 rounded-2xl border border-amber-400/25 p-5">
            <p className="text-[12px] leading-relaxed text-dim">
              The committed IGRF-14 coefficients could not be read, so nothing on
              this page can be computed. Rather than show a plausible-looking
              field, it shows nothing.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-4">
              <ObserverPicker
                observer={observer}
                label={placeLabel}
                onChange={onPlace}
              />
            </div>

            <div className="mt-3">
              <YearSlider
                year={year}
                from={model.validFrom}
                to={model.validTo}
                onChange={setYear}
              />
            </div>

            <div className="mt-3">
              <HereCard field={field} change={change} placeLabel={placeLabel} />
            </div>

            <div className="mt-3">
              <DeclinationMap
                model={model}
                year={year}
                markerLat={observer.latDeg}
                markerLon={observer.lonDeg}
                markerLabel={placeLabel}
              />
            </div>

            <div className="mt-3">
              <ThreePolesCard
                geomagnetic={geomagnetic}
                dipNorth={dipNorth}
                dipSouth={dipSouth}
                tilt={tilt}
              />
            </div>

            <div className="mt-3">
              <PoleWalk track={track} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <MomentCard series={moments} />
              <AnomalyCard now={anomalyNow} then={anomalyThen} />
            </div>

            <div className="mt-3">
              <MagneticHonesty model={model} />
            </div>
          </>
        )}
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

/**
 * The year, because the field moves.
 *
 * Bounded by the model's own validity rather than by taste: drag past 2030 and
 * there is nothing to show, which is the honest end of the data and not a
 * missing feature.
 */
function YearSlider({
  year,
  from,
  to,
  onChange,
}: {
  year: number;
  from: number;
  to: number;
  onChange: (y: number) => void;
}) {
  const now = decimalYear(new Date());
  return (
    <section className="hud-panel rounded-2xl p-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label
          htmlFor="magnetic-year"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint"
        >
          Year
        </label>
        <input
          id="magnetic-year"
          type="range"
          min={from}
          max={to}
          step={0.5}
          value={year}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        />
        <span className="w-16 text-right font-mono text-[12px] text-ice">
          {year.toFixed(1)}
        </span>
        <button
          type="button"
          onClick={() => onChange(now)}
          className="cursor-pointer rounded-full border border-line px-2.5 py-1 font-mono text-[10px] text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
        >
          now
        </button>
      </div>
      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        {from.toFixed(0)} to {to.toFixed(0)}, the model&apos;s whole validity.
        Definitive epochs to 2025, then the published secular variation carried
        forward. Nothing beyond, because there is nothing there.
      </p>
    </section>
  );
}
