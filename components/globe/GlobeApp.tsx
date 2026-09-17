"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { LatLon } from "@/lib/geo";
import {
  defaultImageryDate,
  getLayerBySlug,
  gibsProxyUrl,
  type GibsLayerSlug,
  type LayerKind,
} from "@/lib/gibs";
import {
  fetchWindField,
  formatCycle,
  type WindField,
  type WindSource,
} from "@/lib/wind";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import LayerSwitcher from "@/components/ui/LayerSwitcher";
import TimeControl from "@/components/ui/TimeControl";
import ForecastPanel from "@/components/ui/ForecastPanel";
import AboutModal from "@/components/ui/AboutModal";
import AttributionFooter from "@/components/ui/AttributionFooter";
import GlobeCanvas from "./GlobeCanvas";
import { prepTexture, useBaseTextures } from "./useBaseTextures";

export type ActiveLayer = "blue-marble" | GibsLayerSlug;

interface LayerState {
  slug: ActiveLayer;
  texture: THREE.Texture | null;
  kind: LayerKind | null;
  /** resolved imagery date from the proxy (X-Gibs-Date) */
  date: string | null;
  loading: boolean;
  error: string | null;
}

export default function GlobeApp() {
  // --- static base textures (NASA Blue Marble day + Black Marble night) ---
  const { base, bootError } = useBaseTextures();

  // --- active GIBS data layer -------------------------------------------
  const [activeLayer, setActiveLayer] = useState<ActiveLayer>("true-color");
  const [layerState, setLayerState] = useState<LayerState>({
    slug: "true-color",
    texture: null,
    kind: null,
    date: null,
    loading: true,
    error: null,
  });
  // Track the live texture so we can dispose the previous one on swap.
  const layerTextureRef = useRef<THREE.Texture | null>(null);
  // Bumped by the "Retry" button so the effect refetches the same layer.
  const [layerRetryNonce, setLayerRetryNonce] = useState(0);

  useEffect(() => {
    if (activeLayer === "blue-marble") {
      layerTextureRef.current?.dispose();
      layerTextureRef.current = null;
      setLayerState({
        slug: "blue-marble",
        texture: null,
        kind: null,
        date: null,
        loading: false,
        error: null,
      });
      return;
    }

    const def = getLayerBySlug(activeLayer);
    if (!def) return;

    const controller = new AbortController();
    // keep the previous texture on screen while the next one loads
    setLayerState((s) => ({ ...s, slug: activeLayer, loading: true, error: null }));

    (async () => {
      const res = await fetch(gibsProxyUrl(def.slug, defaultImageryDate()), {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`imagery proxy responded ${res.status}`);
      const date = res.headers.get("X-Gibs-Date");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      try {
        const tex = await new THREE.TextureLoader().loadAsync(objectUrl);
        if (controller.signal.aborted) {
          tex.dispose();
          return;
        }
        prepTexture(tex);
        layerTextureRef.current?.dispose();
        layerTextureRef.current = tex;
        setLayerState({
          slug: activeLayer,
          texture: tex,
          kind: def.kind,
          date,
          loading: false,
          error: null,
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    })().catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setLayerState({
        slug: activeLayer,
        texture: null,
        kind: null,
        date: null,
        loading: false,
        error: err instanceof Error ? err.message : "layer failed to load",
      });
    });

    return () => controller.abort();
  }, [activeLayer, layerRetryNonce]);

  // --- wind particle layer (NOAA GFS 10 m, static asset, fetched once) ----
  const [windEnabled, setWindEnabled] = useState(false);
  const [windField, setWindField] = useState<WindField | null>(null);
  const [windLoading, setWindLoading] = useState(false);
  const [windError, setWindError] = useState<string | null>(null);
  // Which copy the field came from, so the HUD can say when it is the fallback.
  const [windSource, setWindSource] = useState<WindSource | null>(null);

  useEffect(() => {
    if (!windEnabled || windField) return;
    const controller = new AbortController();
    setWindLoading(true);
    setWindError(null);
    (async () => {
      // Remote first, committed copy second. The remote mirror lives on the
      // `data` branch rather than inside the deployment, because a file that
      // changes four times a day was storing four deployments a day.
      const got = await fetchWindField(controller.signal);
      if (!got) throw new Error("wind data unavailable");
      setWindField(got.field);
      setWindSource(got.source);
      setWindLoading(false);
    })().catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setWindError(err instanceof Error ? err.message : "wind data failed");
      setWindLoading(false);
    });
    return () => controller.abort();
  }, [windEnabled, windField]);

  const toggleWind = useCallback(() => {
    setWindEnabled((on) => !on);
    setWindError(null);
  }, []);

  // --- simulated time (live = offset 0) ----------------------------------
  const timeOffsetHoursRef = useRef(0);
  const [timeOffsetHours, setTimeOffsetHoursState] = useState(0);
  const setTimeOffsetHours = useCallback((hours: number) => {
    timeOffsetHoursRef.current = hours;
    setTimeOffsetHoursState(hours);
  }, []);

  // --- picking + forecast panel ------------------------------------------
  const [picked, setPicked] = useState<LatLon | null>(null);
  const handlePick = useCallback((latLon: LatLon | null) => {
    setPicked(latLon);
  }, []);

  // --- about modal ---------------------------------------------------------
  const [aboutOpen, setAboutOpen] = useState(false);

  if (bootError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-abyss px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-solar">
          Boot failure
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">
          Base textures failed to load ({bootError}). Check that
          public/textures is deployed, then reload.
        </p>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {base ? (
        <GlobeCanvas
          dayTexture={base.day}
          nightTexture={base.night}
          layerTexture={layerState.texture}
          layerKind={layerState.kind}
          timeOffsetHoursRef={timeOffsetHoursRef}
          picked={picked}
          onPick={handlePick}
          windField={windEnabled ? windField : null}
        />
      ) : (
        <BootScreen label="Loading base imagery" />
      )}

      {/* HUD — pointer events only on the controls themselves */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} />
        <LayerSwitcher
          active={activeLayer}
          onSelect={setActiveLayer}
          onRetry={() => setLayerRetryNonce((n) => n + 1)}
          loading={layerState.loading}
          error={layerState.error}
          imageryDate={layerState.date}
          windActive={windEnabled}
          onToggleWind={toggleWind}
          windLoading={windLoading}
          windError={windError}
          windCycle={windField ? formatCycle(windField.meta.cycle) : null}
          windIsFallback={windSource === "committed"}
        />
        <TimeControl
          offsetHours={timeOffsetHours}
          onChange={setTimeOffsetHours}
        />
        <ForecastPanel picked={picked} onClose={() => setPicked(null)} />
        <AttributionFooter windActive={windEnabled} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
