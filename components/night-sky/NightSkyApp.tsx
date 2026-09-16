"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import {
  CONSTELLATIONS_PATH,
  MESSIER_PATH,
  STARS_PATH,
  constellationNameMap,
  parseConstellationCatalog,
  parseMessierCatalog,
  parseStarCatalog,
  type ConstellationCatalog,
  type MessierCatalog,
  type StarCatalog,
} from "@/lib/star-facts";
import NightSkyCanvas from "./NightSkyCanvas";
import LayerToggles from "./LayerToggles";
import LocationTimeControl from "./LocationTimeControl";
import DetailCard from "./DetailCard";
import NightSkyAttributionFooter from "./NightSkyAttributionFooter";
import {
  DEFAULT_LAYERS,
  DEFAULT_OBSERVER,
  type LayerState,
  type Observer,
  type Selection,
  type ViewMode,
} from "./constants";

/**
 * Night Sky tab shell (the second "Beyond" world). Loads the three shipped
 * catalogues once, stars (HYG), constellation figures, Messier deep-sky, each
 * parsed defensively so a missing/broken file degrades to a graceful empty state
 * rather than a crash. Holds the view state (layer toggles, sky vs local mode,
 * observer + time) and composes the 3D planetarium with the DOM HUD. The heavy
 * per-frame work lives in the scene; React state here only drives the HUD.
 */
export default function NightSkyApp() {
  const [starCat, setStarCat] = useState<StarCatalog | null>(null);
  const [conCat, setConCat] = useState<ConstellationCatalog | null>(null);
  const [messierCat, setMessierCat] = useState<MessierCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS);
  const [mode, setMode] = useState<ViewMode>("sky");
  const [observer, setObserver] = useState<Observer>(DEFAULT_OBSERVER);
  const [selected, setSelected] = useState<Selection>(null);

  // Time model: a fixed base captured on load + a scrub offset in hours.
  const [baseNow, setBaseNow] = useState(() => Date.now());
  const [offsetHours, setOffsetHours] = useState(0);
  const date = useMemo(
    () => new Date(baseNow + offsetHours * 3_600_000),
    [baseNow, offsetHours]
  );

  // ── Defensive data load (never blocks / crashes the route) ─────────────────
  useEffect(() => {
    let cancelled = false;
    const get = (path: string) =>
      fetch(path)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    Promise.all([get(STARS_PATH), get(CONSTELLATIONS_PATH), get(MESSIER_PATH)]).then(
      ([s, c, m]) => {
        if (cancelled) return;
        setStarCat(parseStarCatalog(s));
        setConCat(parseConstellationCatalog(c));
        setMessierCat(parseMessierCatalog(m));
        setLoaded(true);
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const stars = starCat?.stars ?? [];
  const byId = starCat?.byId ?? new Map();
  const constellations = conCat?.constellations ?? [];
  const messier = messierCat?.objects ?? [];

  const conNameMap = useMemo(() => constellationNameMap(conCat), [conCat]);
  const conName = useCallback(
    (abbr: string | null) => (abbr ? conNameMap.get(abbr) ?? abbr : "–"),
    [conNameMap]
  );

  const toggleLayer = useCallback((key: keyof LayerState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const onNow = useCallback(() => {
    setBaseNow(Date.now());
    setOffsetHours(0);
  }, []);

  const hasStars = stars.length > 0;

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {/* ── Scene layer ── */}
      {hasStars && (
        <NightSkyCanvas
          stars={stars}
          messier={messier}
          constellations={constellations}
          byId={byId}
          layers={layers}
          mode={mode}
          observer={observer}
          date={date}
          selected={selected}
          onSelect={setSelected}
        />
      )}

      {/* ── HUD layer ── (view content first, NavShell last so its dropdowns
          paint above everything) */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {!loaded && <CenteredNote>Charting the sky…</CenteredNote>}
        {loaded && !hasStars && (
          <CenteredNote>
            Star catalogue unavailable: the sky data failed to load.
          </CenteredNote>
        )}

        {hasStars && (
          <>
            <LayerToggles
              mode={mode}
              onModeChange={setMode}
              layers={layers}
              onToggleLayer={toggleLayer}
            />

            {mode === "local" && (
              <LocationTimeControl
                observer={observer}
                onObserverChange={setObserver}
                offsetHours={offsetHours}
                onOffsetChange={setOffsetHours}
                onNow={onNow}
                date={date}
              />
            )}

            <DetailCard
              selection={selected}
              conName={conName}
              onClose={() => setSelected(null)}
            />

            {mode === "sky" && (
              <p className="pointer-events-none absolute inset-x-0 bottom-6 hidden text-center font-mono text-[10px] tracking-wide text-faint md:block">
                Drag to look around · scroll to zoom · click a star or deep-sky
                object · stars are real, constellation lines are a cultural overlay
              </p>
            )}
          </>
        )}

        <NightSkyAttributionFooter />

        <NavShell onAbout={() => setAboutOpen(true)} active="night-sky" />
      </div>

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
