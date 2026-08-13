"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import { useBaseTextures } from "@/components/globe/useBaseTextures";
import {
  groundTrack,
  inclinationDeg,
  isSunlit,
  nextPasses,
  orbitalPeriodMinutes,
  parseTle,
  propagate,
  tleAgeDays,
  tleEpoch,
  type IssPass,
} from "@/lib/iss";
import {
  CELESTRAK_ISS_TLE_URL,
  DEFAULT_OBSERVER,
  ISS_CATALOG_NUMBER,
  ISS_TLE_PATH,
  WHERETHEISS_URL,
  footprintGroundRadiusKm,
  greatCircleKm,
  parseCelestrakTle,
  parseIssTleData,
  parseWhereTheIss,
  type IssTleData,
  type Observer,
  type TleSet,
  type WhereTheIssFix,
} from "@/lib/iss-facts";
import IssCanvas from "./IssCanvas";
import IssHud, { type IssHudData } from "./IssHud";
import IssPassesPanel from "./IssPassesPanel";
import IssAttributionFooter from "./IssAttributionFooter";

/** How many days ahead to search for passes. */
const PASS_DAYS = 5;
/** Ground track recompute cadence (ms) — keeps the line geometry stable between. */
const GROUND_TRACK_INTERVAL_MS = 15000;
/** wheretheiss.at cross-check poll cadence (ms) — polite vs their ~1 req/s. */
const WHERETHEISS_INTERVAL_MS = 10000;

export default function IssApp() {
  const { base, bootError } = useBaseTextures();

  // --- committed TLE mirror (defensive baseline) --------------------------
  const [issData, setIssData] = useState<IssTleData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(ISS_TLE_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        setIssData(parseIssTleData(raw));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // --- optional live TLE refresh (CelesTrak, CORS *) ----------------------
  const [liveTle, setLiveTle] = useState<{ tle: TleSet; fetchedAt: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refreshTle = useCallback(async (silent = false) => {
    setRefreshing(true);
    if (!silent) setRefreshError(null);
    try {
      const res = await fetch(CELESTRAK_ISS_TLE_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const set = parseCelestrakTle(await res.text());
      if (!set || !parseTle(set.line1, set.line2)) throw new Error("unparseable TLE");
      setLiveTle({ tle: set, fetchedAt: Date.now() });
      setRefreshError(null);
    } catch {
      setRefreshError(silent ? null : "CelesTrak refresh failed — using committed TLE");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Attempt one silent live refresh per session (defensive; committed TLE stands
  // on any failure). CelesTrak updates GP data ~every 2 h, so once is plenty.
  const autoRefreshed = useRef(false);
  useEffect(() => {
    if (autoRefreshed.current) return;
    autoRefreshed.current = true;
    void refreshTle(true);
  }, [refreshTle]);

  const activeTle: TleSet | null = liveTle?.tle ?? issData?.tle ?? null;
  const tleSource: "committed" | "live" = liveTle ? "live" : "committed";

  // --- 1 Hz live clock -----------------------------------------------------
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // --- live sub-point + telemetry (SGP4) ----------------------------------
  const issState = useMemo(
    () => (activeTle ? propagate(activeTle.line1, activeTle.line2, new Date(nowMs)) : null),
    [activeTle, nowMs]
  );
  const sunlit = useMemo(
    () => (issState ? isSunlit(issState.eci.position, new Date(nowMs)) : null),
    [issState, nowMs]
  );

  const periodMin = activeTle ? orbitalPeriodMinutes(activeTle.line2) : null;
  const inclination = activeTle ? inclinationDeg(activeTle.line2) : null;
  const orbitsPerDay = periodMin ? 1440 / periodMin : null;
  const epoch = activeTle ? tleEpoch(activeTle.line1) : null;
  const ageDays = activeTle ? tleAgeDays(activeTle.line1, new Date(nowMs)) : null;
  const footprintRadiusKm = issState ? footprintGroundRadiusKm(issState.altitudeKm) : null;

  // --- ground track (one orbit), recomputed on a coarse cadence -----------
  const gtKey = Math.floor(nowMs / GROUND_TRACK_INTERVAL_MS);
  const groundTrackPts = useMemo(() => {
    if (!activeTle) return [];
    return groundTrack(activeTle.line1, activeTle.line2, new Date(gtKey * GROUND_TRACK_INTERVAL_MS), {
      centered: true,
    });
  }, [activeTle, gtKey]);

  // --- wheretheiss.at cross-check -----------------------------------------
  const [whereFix, setWhereFix] = useState<WhereTheIssFix | null>(null);
  const [whereError, setWhereError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(WHERETHEISS_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const fix = parseWhereTheIss(await res.json());
        if (cancelled) return;
        if (fix) {
          setWhereFix(fix);
          setWhereError(null);
        } else {
          setWhereError("cross-check returned no usable fix");
        }
      } catch {
        if (!cancelled) setWhereError("cross-check unavailable");
      }
    };
    void load();
    const id = setInterval(load, WHERETHEISS_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const crossCheck = useMemo(() => {
    if (!activeTle || !whereFix) return null;
    const ours = propagate(activeTle.line1, activeTle.line2, new Date(whereFix.timestampMs));
    if (!ours) return null;
    // greatCircleKm is null-safe, and this whole cross-check is a diagnostic:
    // if the distance cannot be computed there is nothing honest to show.
    const divergenceKm = greatCircleKm(
      ours.latitude,
      ours.longitude,
      whereFix.latitude,
      whereFix.longitude
    );
    if (divergenceKm === null) return null;
    return { divergenceKm, theirs: whereFix };
  }, [activeTle, whereFix]);

  // --- passes over the observer's location --------------------------------
  const [observer, setObserver] = useState<Observer>(DEFAULT_OBSERVER);
  const [passes, setPasses] = useState<IssPass[] | null>(null);
  const [passesComputing, setPassesComputing] = useState(false);
  useEffect(() => {
    if (!activeTle) {
      setPasses(null);
      return;
    }
    let cancelled = false;
    setPassesComputing(true);
    // Defer so the "Computing…" state paints before the (heavier) 5-day scan.
    const id = setTimeout(() => {
      const result = nextPasses(
        activeTle.line1,
        activeTle.line2,
        observer.lat,
        observer.lon,
        observer.altitudeM,
        new Date(),
        { days: PASS_DAYS, minElevationDeg: 10 }
      );
      if (!cancelled) {
        setPasses(result);
        setPassesComputing(false);
      }
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [activeTle, observer]);

  // --- view state ----------------------------------------------------------
  const [altExaggeration, setAltExaggeration] = useState(1);
  const [aboutOpen, setAboutOpen] = useState(false);

  const issSample = issState
    ? { lat: issState.latitude, lon: issState.longitude, altKm: issState.altitudeKm }
    : null;

  const hudData: IssHudData = {
    name: activeTle?.name ?? issData?.name ?? "ISS (ZARYA)",
    catalogNumber: issData?.catalogNumber ?? ISS_CATALOG_NUMBER,
    lat: issState?.latitude ?? null,
    lon: issState?.longitude ?? null,
    altitudeKm: issState?.altitudeKm ?? null,
    velocityKmS: issState?.velocityKmS ?? null,
    sunlit,
    periodMin,
    inclinationDeg: inclination,
    orbitsPerDay,
    footprintRadiusKm,
    epoch,
    ageDays,
    tleSource,
    fetchedAtLabel: liveTle
      ? new Date(liveTle.fetchedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null,
    crossCheck,
    crossError: whereError,
  };

  if (bootError) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-abyss px-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-solar">Boot failure</p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-dim">
          Base textures failed to load ({bootError}). Check that public/textures is
          deployed, then reload.
        </p>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {base ? (
        <IssCanvas
          dayTexture={base.day}
          nightTexture={base.night}
          iss={issSample}
          altExaggeration={altExaggeration}
          groundTrack={groundTrackPts}
          observer={observer}
        />
      ) : (
        <BootScreen label="Loading base imagery" />
      )}

      {/* HUD — content first, NavShell last so its dropdowns paint above panels */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <IssHud
          data={hudData}
          altExaggeration={altExaggeration}
          onAltExaggeration={setAltExaggeration}
          onRefreshTle={() => void refreshTle(false)}
          refreshing={refreshing}
          refreshError={refreshError}
        />
        <IssPassesPanel
          observer={observer}
          onObserverChange={setObserver}
          passes={passes}
          computing={passesComputing}
          days={PASS_DAYS}
        />
        <IssAttributionFooter />

        {loaded && !activeTle && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6">
            <p className="hud-panel max-w-sm rounded-2xl px-5 py-4 text-center text-sm leading-relaxed text-dim">
              Orbital data is unavailable right now. The globe and terminator are live;
              the ISS position needs the committed TLE mirror at{" "}
              <span className="font-mono text-xs text-faint">public/data/iss/tle.json</span>.
            </p>
          </div>
        )}

        <NavShell onAbout={() => setAboutOpen(true)} active="iss" />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
