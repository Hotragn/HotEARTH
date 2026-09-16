"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, EyeSlash, Moon } from "@phosphor-icons/react";
import {
  currentPhenomena,
  galileanEvents,
  type GalileanEvent,
  type GalileanMoon,
  type PhenomenonType,
} from "@/lib/jupiter-moons";
import {
  MOON_COLORS,
  MOON_ROMAN,
  PHENOMENON_META,
  dayLabel,
  hhmm,
} from "./galileanUi";

/** One reconstructed phenomenon (its ingress / mid / egress phases paired up). */
interface Phenomenon {
  moon: GalileanMoon;
  type: PhenomenonType;
  ingress: Date | null;
  mid: Date | null;
  egress: Date | null;
  /** representative instant, for sorting and click-to-scrub */
  at: Date;
}

/** Window-length options (days ahead to scan). */
const WINDOW_OPTIONS = [7, 10, 14] as const;

interface JupiterMoonsEventsPanelProps {
  nowMs: number;
  /** scrub the scene to this instant (and the parent zooms to the disk) */
  onPickEvent: (ms: number) => void;
}

/**
 * Upcoming Galilean events, grouped by local day. Every row is COMPUTED by
 * lib/jupiter-moons.galileanEvents (Meeus Ch. 44) over the next N days, then the
 * flat ingress/mid/egress stream is paired back into phenomena. Shadow transits
 * are emphasized (the crisp black dot amateurs chase). Anything in progress now
 * is badged "now". Clicking a row scrubs the scene to that moment. The accuracy
 * bound (a few minutes) and the JPL Horizons pointer are stated at the foot.
 */
export default function JupiterMoonsEventsPanel({
  nowMs,
  onPickEvent,
}: JupiterMoonsEventsPanelProps) {
  const [windowDays, setWindowDays] = useState<number>(10);
  const [phenomena, setPhenomena] = useState<Phenomenon[] | null>(null);
  const [computing, setComputing] = useState(false);

  // Recompute at most every 5 minutes of wall-clock (the scan is the heavy call).
  const windowKey = Math.floor(nowMs / (5 * 60 * 1000));

  useEffect(() => {
    let cancelled = false;
    setComputing(true);
    // Defer so the "Computing…" state paints before the multi-day scan runs.
    const id = setTimeout(() => {
      const start = new Date(windowKey * 5 * 60 * 1000);
      const end = new Date(start.getTime() + windowDays * 86_400_000);
      const events = galileanEvents(start, end);
      if (!cancelled) {
        setPhenomena(pairPhenomena(events));
        setComputing(false);
      }
    }, 30);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [windowKey, windowDays]);

  // Which (moon, type) pairs are active right now, for the "now" badge.
  const nowSecondKey = Math.floor(nowMs / 20000);
  const currentKeys = useMemo(() => {
    const cur = currentPhenomena(new Date(nowMs));
    const set = new Set<string>();
    if (cur) for (const e of cur) set.add(`${e.moon}|${e.type}`);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowSecondKey]);

  const groups = useMemo(
    () => (phenomena ? groupByDay(phenomena) : []),
    [phenomena]
  );

  const shadowCount =
    phenomena?.filter((p) => p.type === "shadow_transit").length ?? 0;

  return (
    <section
      aria-label="Upcoming Galilean moon events"
      className="hud-scroll pointer-events-auto absolute right-3 top-20 z-10 max-h-[calc(100dvh-11rem)] w-[320px] overflow-y-auto animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-medium text-ice">
            Upcoming events
          </h2>
          <select
            aria-label="Days ahead to scan"
            value={windowDays}
            onChange={(e) => setWindowDays(Number(e.target.value))}
            className="cursor-pointer rounded-lg border border-line bg-black/30 px-2 py-1 font-mono text-[10px] text-dim focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            {WINDOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                next {d} days
              </option>
            ))}
          </select>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          Transits, shadow transits, eclipses and occultations of Io, Europa,
          Ganymede and Callisto. Times are local. Tap a row to jump the view there.
        </p>

        <div className="mt-3 border-t border-line pt-3">
          {computing || phenomena === null ? (
            <p className="py-6 text-center font-mono text-[11px] text-faint">
              Computing events…
            </p>
          ) : phenomena.length === 0 ? (
            <p className="py-6 text-center text-[11px] leading-relaxed text-faint">
              No events in the next {windowDays} days.
            </p>
          ) : (
            <>
              <p className="mb-2 font-mono text-[10px] text-faint">
                {phenomena.length} events · {shadowCount} shadow transit
                {shadowCount === 1 ? "" : "s"}
              </p>
              <div className="space-y-3">
                {groups.map((g) => (
                  <div key={g.day}>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                      {g.day}
                    </p>
                    <ul className="space-y-1.5">
                      {g.items.map((p, i) => (
                        <EventRow
                          key={`${p.moon}-${p.type}-${p.at.getTime()}-${i}`}
                          p={p}
                          active={isActiveNow(p, currentKeys, nowMs)}
                          onClick={() => onPickEvent(p.at.getTime())}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* honesty: accuracy bound + authoritative cross-check */}
        <p className="mt-3 border-t border-line pt-3 text-[10px] leading-relaxed text-faint">
          Computed from Meeus (low-accuracy method). Transit and occultation times
          are good to about a minute; eclipse and shadow-transit times can differ
          by a few minutes near quadrature. For critical or observing-grade timing,
          cross-check{" "}
          <a
            href="https://ssd.jpl.nasa.gov/horizons/"
            target="_blank"
            rel="noreferrer"
            className="text-dim transition-colors duration-200 hover:text-ice"
          >
            JPL Horizons
          </a>
          .
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────── event row ─────────────────────────────────

function EventRow({
  p,
  active,
  onClick,
}: {
  p: Phenomenon;
  active: boolean;
  onClick: () => void;
}) {
  const meta = PHENOMENON_META[p.type];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
          meta.emphasize
            ? "border-solar/40 bg-solar/[0.06] hover:bg-solar/[0.1]"
            : "border-line bg-white/[0.02] hover:bg-white/[0.05]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: MOON_COLORS[p.moon] }}
          />
          <span className="text-[12px] text-ice">
            {MOON_ROMAN[p.moon]} {p.moon}
          </span>
          <span className="flex items-center gap-1.5">
            <PhenomenonIcon type={p.type} />
            <span
              className="font-mono text-[10px]"
              style={{ color: meta.accent }}
            >
              {meta.label}
            </span>
          </span>
          {active && (
            <span className="ml-auto rounded-full bg-solar/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-solar">
              now
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 pl-3.5 font-mono text-[11px] text-dim">
          <PhaseTime label="in" d={p.ingress} />
          <span className="text-faint">▸</span>
          <PhaseTime label="mid" d={p.mid} strong />
          <span className="text-faint">▸</span>
          <PhaseTime label="out" d={p.egress} />
        </div>
      </button>
    </li>
  );
}

function PhaseTime({
  label,
  d,
  strong,
}: {
  label: string;
  d: Date | null;
  strong?: boolean;
}) {
  return (
    <span className="flex items-baseline gap-1" title={`${label} (${label === "in" ? "ingress" : label === "out" ? "egress" : "mid"})`}>
      <span className="text-[8.5px] uppercase text-faint">{label}</span>
      <span className={strong ? "text-ice" : ""}>{d ? hhmm(d) : "–"}</span>
    </span>
  );
}

function PhenomenonIcon({ type }: { type: PhenomenonType }) {
  const meta = PHENOMENON_META[type];
  const color = meta.accent;
  if (type === "shadow_transit") {
    return <Circle size={11} weight="fill" color="#0b0e16" aria-hidden />;
  }
  if (type === "occultation") {
    return <EyeSlash size={11} weight="regular" color={color} aria-hidden />;
  }
  if (type === "eclipse") {
    return <Moon size={11} weight="fill" color={color} aria-hidden />;
  }
  return <Circle size={11} weight="bold" color={color} aria-hidden />;
}

// ─────────────────────────── event reconstruction ──────────────────────────

/**
 * Pair the flat, time-sorted ingress/mid/egress stream from galileanEvents back
 * into phenomena, per (moon, type). A phenomenon already in progress at the
 * window start has no ingress; one still going at the end has no egress; both are
 * handled by only setting the phases that are present.
 */
function pairPhenomena(events: GalileanEvent[]): Phenomenon[] {
  const open = new Map<string, Phenomenon>();
  const out: Phenomenon[] = [];
  const key = (e: GalileanEvent) => `${e.moon}|${e.type}`;

  const rep = (p: Phenomenon): Date =>
    p.mid ?? p.ingress ?? p.egress ?? new Date(0);

  const close = (k: string) => {
    const p = open.get(k);
    if (p) {
      p.at = rep(p);
      out.push(p);
      open.delete(k);
    }
  };

  for (const e of events) {
    const k = key(e);
    if (e.phase === "ingress") {
      close(k); // a fresh ingress starts a new phenomenon
      open.set(k, {
        moon: e.moon,
        type: e.type,
        ingress: e.time,
        mid: null,
        egress: null,
        at: e.time,
      });
    } else if (e.phase === "mid") {
      const p = open.get(k);
      if (p && p.mid === null) {
        p.mid = e.time;
      } else {
        close(k);
        open.set(k, {
          moon: e.moon,
          type: e.type,
          ingress: null,
          mid: e.time,
          egress: null,
          at: e.time,
        });
      }
    } else {
      // egress closes the open phenomenon (or stands alone if none is open)
      const p = open.get(k);
      if (p) {
        p.egress = e.time;
        close(k);
      } else {
        out.push({
          moon: e.moon,
          type: e.type,
          ingress: null,
          mid: null,
          egress: e.time,
          at: e.time,
        });
      }
    }
  }
  for (const k of Array.from(open.keys())) close(k);

  out.sort((a, b) => a.at.getTime() - b.at.getTime());
  return out;
}

/** Group phenomena by local calendar day, preserving time order. */
function groupByDay(
  phenomena: Phenomenon[]
): Array<{ day: string; items: Phenomenon[] }> {
  const groups: Array<{ day: string; items: Phenomenon[] }> = [];
  for (const p of phenomena) {
    const day = dayLabel(p.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(p);
    else groups.push({ day, items: [p] });
  }
  return groups;
}

/** Is this phenomenon the one active at `nowMs` (badged "now")? */
function isActiveNow(
  p: Phenomenon,
  currentKeys: Set<string>,
  nowMs: number
): boolean {
  if (!currentKeys.has(`${p.moon}|${p.type}`)) return false;
  const afterStart = p.ingress === null || p.ingress.getTime() <= nowMs;
  const beforeEnd = p.egress === null || p.egress.getTime() >= nowMs;
  return afterStart && beforeEnd;
}
