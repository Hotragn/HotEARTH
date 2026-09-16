"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SNAPSHOT_PATH,
  SWPC_ENDPOINTS,
  buildSnapshotView,
  parseAurora,
  parseFlares,
  parseKp,
  parseWindMag,
  parseWindSpeed,
  parseXray,
  type SpaceWeatherView,
} from "@/lib/sun-facts";

export interface SpaceWeatherState {
  view: SpaceWeatherView | null;
  status: "loading" | "ready";
  /** true once at least one live SWPC feed has overlaid the snapshot. */
  anyLive: boolean;
  /** set when no live feed could be reached (we then show the snapshot). */
  liveError: string | null;
  /** re-run the snapshot load + live fetches. */
  refresh: () => void;
}

/**
 * Loads the committed snapshot first (instant, defensive baseline), then
 * overlays each fast-changing SWPC feed that fetches + parses successfully,
 * tagging those fields source="live". On total live failure the snapshot stands
 * and `liveError` is set: the panel never blanks or crashes. Monthly F10.7 and
 * sunspot number stay on the snapshot (slow signals; no live override).
 */
export function useSpaceWeather(): SpaceWeatherState {
  const [view, setView] = useState<SpaceWeatherView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [anyLive, setAnyLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    setStatus("loading");
    setAnyLive(false);
    setLiveError(null);

    const getJson = async (url: string) => {
      const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };

    (async () => {
      // 1. committed snapshot baseline (always attempted; tolerate absence).
      let base: SpaceWeatherView;
      try {
        const res = await fetch(SNAPSHOT_PATH, { signal: ctrl.signal });
        base = buildSnapshotView(res.ok ? await res.json() : {});
      } catch {
        base = buildSnapshotView({});
      }
      if (cancelled) return;
      setView(base);
      setStatus("ready");

      // 2. overlay live SWPC feeds: each independent + defensive.
      const [ws, wm, kp, xr, fl, au] = await Promise.allSettled([
        getJson(SWPC_ENDPOINTS.windSpeed),
        getJson(SWPC_ENDPOINTS.windMag),
        getJson(SWPC_ENDPOINTS.kp),
        getJson(SWPC_ENDPOINTS.xray),
        getJson(SWPC_ENDPOINTS.flares),
        getJson(SWPC_ENDPOINTS.aurora),
      ]);
      if (cancelled) return;

      const live: SpaceWeatherView = { ...base };
      let live_ = false;

      if (ws.status === "fulfilled") {
        const p = parseWindSpeed(ws.value);
        if (p.speed !== null) {
          live.windSpeed = { value: p.speed, time: p.time, source: "live" };
          live_ = true;
        }
      }
      if (wm.status === "fulfilled") {
        const p = parseWindMag(wm.value);
        if (p.bt !== null) {
          live.bt = { value: p.bt, time: p.time, source: "live" };
          live_ = true;
        }
        if (p.bz !== null) {
          live.bz = { value: p.bz, time: p.time, source: "live" };
          live_ = true;
        }
      }
      if (kp.status === "fulfilled") {
        const p = parseKp(kp.value);
        if (p.kp !== null) {
          live.kp = { value: p.kp, time: p.time, source: "live" };
          live_ = true;
        }
      }
      if (xr.status === "fulfilled") {
        const p = parseXray(xr.value);
        if (p.flux !== null) {
          live.xrayFlux = { value: p.flux, time: p.time, source: "live" };
          live_ = true;
        }
      }
      if (fl.status === "fulfilled") {
        const p = parseFlares(fl.value);
        if (p.current || p.largest) {
          live.currentFlareClass = p.current ?? live.currentFlareClass;
          live.largestFlareClass = p.largest ?? live.largestFlareClass;
          live.largestFlareTime = p.largestTime ?? live.largestFlareTime;
          live.flareSource = "live";
          live_ = true;
        }
      }
      if (au.status === "fulfilled") {
        const p = parseAurora(au.value);
        if (p.maxProb !== null) {
          live.auroraMaxProbPct = {
            value: p.maxProb,
            time: p.forecastTime,
            source: "live",
          };
          live.auroraObsTime = p.obsTime ?? live.auroraObsTime;
          live.auroraForecastTime = p.forecastTime ?? live.auroraForecastTime;
          live_ = true;
        }
      }

      setView(live);
      setAnyLive(live_);
      setLiveError(live_ ? null : "live SWPC feeds unreachable, showing snapshot");
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [reloadKey]);

  return { view, status, anyLive, liveError, refresh };
}
