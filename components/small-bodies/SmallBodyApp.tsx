"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import { orbitPath } from "@/lib/small-bodies";
import {
  SMALL_BODIES_PATH,
  approachesForObject,
  catalogStats,
  filterObjects,
  parseSmallBodyCatalog,
  type FilterId,
  type SmallBodyCatalog,
  type SmallBodyObject,
} from "@/lib/small-body-facts";
import SmallBodyOrbitCanvas from "./SmallBodyOrbitCanvas";
import SmallBodyOrbitTimeControl, {
  SMALL_BODY_ORRERY_SPEEDS,
} from "./SmallBodyOrbitTimeControl";
import SmallBodyOverview from "./SmallBodyOverview";
import SmallBodyBrowser from "./SmallBodyBrowser";
import SmallBodyCloseApproaches from "./SmallBodyCloseApproaches";
import SmallBodyDetailCanvas from "./SmallBodyDetailCanvas";
import SmallBodyHud from "./SmallBodyHud";
import SmallBodyAttributionFooter from "./SmallBodyAttributionFooter";

/**
 * Comets & Asteroids tab shell. One client bundle serves three views:
 *   • the ORBIT VIEW (default), the inner-Solar-System 3D centerpiece: the Sun,
 *     the planet reference orbits (Mercury→Jupiter), and every (filtered) small
 *     body's real orbit, closed ellipses for bound bodies, open arcs for the
 *     hyperbolic / interstellar ones, with illustrative comet tails;
 *   • two full overlays: the OBJECT BROWSER (searchable/filterable grid) and the
 *     CLOSE-APPROACHES panel (the real CNEOS list, Apophis highlighted);
 *   • a per-object DETAIL view: an illustrative lump or real map/photo plus the
 *     measured elements, physical parameters and computed classification.
 *
 * The catalogue is fetched once and parsed defensively: a missing/broken file
 * degrades to a graceful empty state, never a crash. Each body's time anchor
 * (mean anomaly + epoch, or time-of-perihelion) is spliced back on from the raw
 * JSON so the orrery shows LIVE, propagated positions on a shared sim clock that
 * a play/pause + speed + scrub time control drives; a body that still can't
 * resolve a position degrades to its perihelion marker rather than crashing.
 */

/** The honest framing shown under the orrery time control. */
const ORRERY_NOTE =
  "Positions are real: JPL osculating elements at their epoch, propagated with " +
  "two-body mechanics (not a perturbed Horizons ephemeris). Angular positions are " +
  "real heliocentric longitudes; radial distances are log-compressed for visibility " +
  "(aphelia reach tens–thousands of AU). Hyperbolic / interstellar bodies pass " +
  "through once and keep receding. Comet tails are illustrative.";

/**
 * The catalogue's `elements` carry the time anchors (`ma`, `tp`) and `epoch_jd`,
 * but the defensive lib parser only lifts the fields the orbit SHAPE needs; so
 * we splice the anchors back on from the raw JSON here, mapping `epoch_jd` → the
 * `epoch` name the physics module reads. With these attached, lib/small-bodies
 * `heliocentricPosition` resolves a LIVE position for every body (bound orbits via
 * ma+epoch, open/hyperbolic via tp). Matching is by SBDB designation with an
 * order-preserved index fallback; anything unmatched keeps no anchor and simply
 * degrades to its perihelion marker.
 */
function attachTimeAnchors(objects: SmallBodyObject[], raw: unknown): void {
  const rawObjects =
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as { objects?: unknown }).objects)
      ? (raw as { objects: unknown[] }).objects
      : [];
  const byDesignation = new Map<string, Record<string, unknown>>();
  for (const ro of rawObjects) {
    if (ro && typeof ro === "object") {
      const des = (ro as Record<string, unknown>).designation;
      if (typeof des === "string") byDesignation.set(des, ro as Record<string, unknown>);
    }
  }
  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  objects.forEach((o, i) => {
    let ro = o.designation ? byDesignation.get(o.designation) : undefined;
    const fallback = rawObjects[i];
    if (!ro && fallback && typeof fallback === "object")
      ro = fallback as Record<string, unknown>;
    const el =
      ro && typeof ro.elements === "object" && ro.elements
        ? (ro.elements as Record<string, unknown>)
        : null;
    if (!el) return;
    o.elements.ma = numOrNull(el.ma);
    o.elements.tp = numOrNull(el.tp);
    o.elements.epoch = numOrNull(el.epoch_jd) ?? o.elements.epoch_jd;
  });
}

export default function SmallBodyApp() {
  const [catalog, setCatalog] = useState<SmallBodyCatalog | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const [focus, setFocus] = useState<SmallBodyObject | null>(null);
  const [panel, setPanel] = useState<"none" | "browse" | "approaches">("none");
  const [filter, setFilter] = useState<FilterId>("all");

  // ── Orrery time (mirrors the Solar-System / dwarf-planet orreries) ─────────
  // Held in a ref read per-frame by the canvas (no per-frame React work); state
  // mirrors it a few Hz only for the time-control readout. Paused on load so the
  // wide period range (inner NEAs ~1 yr, long-period comets millennia) doesn't
  // blur before the viewer presses play.
  const simMsRef = useRef<number>(Date.now());
  const [simMs, setSimMs] = useState<number>(() => Date.now());
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1 mo/s
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setSimMs(simMsRef.current), 330);
    return () => clearInterval(id);
  }, []);
  const seekOrrery = useCallback((ms: number) => {
    simMsRef.current = ms;
    setSimMs(ms);
  }, []);

  // ── Defensive data load (never blocks / crashes the route) ─────────────────
  useEffect(() => {
    let cancelled = false;
    fetch(SMALL_BODIES_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parseSmallBodyCatalog(raw);
        if (parsed) attachTimeAnchors(parsed.objects, raw);
        setCatalog(parsed);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const objects = useMemo(() => catalog?.objects ?? [], [catalog]);
  const closeApproaches = catalog?.close_approaches ?? [];
  const stats = useMemo(() => catalogStats(objects), [objects]);
  const filtered = useMemo(() => filterObjects(objects, filter), [objects, filter]);

  // How many of the (filtered) bodies have elements too sparse to draw an orbit.
  const omittedCount = useMemo(
    () => filtered.filter((o) => orbitPath(o.elements) === null).length,
    [filtered]
  );

  const openObject = useCallback((o: SmallBodyObject) => {
    setPanel("none");
    setFocus(o);
  }, []);

  const backToOrbit = useCallback(() => setFocus(null), []);

  const focusApproaches = useMemo(
    () => (focus ? approachesForObject(closeApproaches, focus) : []),
    [focus, closeApproaches]
  );

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {/* ── Scene layer ── */}
      {focus ? (
        <SmallBodyDetailCanvas key={focus.designation ?? focus.name} object={focus} />
      ) : (
        <SmallBodyOrbitCanvas
          objects={filtered}
          onFocus={openObject}
          simMsRef={simMsRef}
          playing={playing}
          speedDaysPerSec={SMALL_BODY_ORRERY_SPEEDS[speedIdx].daysPerSec}
        />
      )}

      {/* ── HUD layer ── (content first, NavShell last so its dropdowns paint
          above the full-height overlays) */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {focus ? (
          <SmallBodyHud object={focus} approaches={focusApproaches} onBack={backToOrbit} />
        ) : panel === "browse" ? (
          <SmallBodyBrowser
            objects={objects}
            loaded={loaded}
            filter={filter}
            onFilter={setFilter}
            onOpen={openObject}
            onClose={() => setPanel("none")}
          />
        ) : panel === "approaches" ? (
          <SmallBodyCloseApproaches
            approaches={closeApproaches}
            objects={objects}
            onOpen={openObject}
            onClose={() => setPanel("none")}
          />
        ) : (
          <>
            <SmallBodyOverview
              stats={stats}
              filter={filter}
              onFilter={setFilter}
              onOpenBrowser={() => setPanel("browse")}
              onOpenApproaches={() => setPanel("approaches")}
              closeApproachCount={closeApproaches.length}
              omittedCount={omittedCount}
            />
            <SmallBodyOrbitTimeControl
              simMs={simMs}
              nowMs={nowMs}
              playing={playing}
              onPlayToggle={() => setPlaying((p) => !p)}
              speedIdx={speedIdx}
              onSpeedChange={setSpeedIdx}
              onSeek={seekOrrery}
              note={ORRERY_NOTE}
            />
          </>
        )}

        <SmallBodyAttributionFooter focus={focus} />

        <NavShell onAbout={() => setAboutOpen(true)} active="small-bodies" />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
