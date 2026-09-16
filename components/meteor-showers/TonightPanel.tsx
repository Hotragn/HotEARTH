"use client";

import { useMemo } from "react";
import { CalendarBlank, Question } from "@phosphor-icons/react";
import {
  currentlyActiveShowers,
  daysToPeak,
  fmtCountdown,
  fmtDaysToPeak,
  fmtObservedRate,
  fmtSolarLongitude,
  nextMajorPeak,
  nextShower,
  showerState,
  solarLongitudeDeg,
  strengthStyle,
  type MeteorShowerRecord,
} from "@/lib/meteor-facts";
import { METEOR_ACCENT, type Observer } from "./constants";

/**
 * "Tonight / active now / next up" panel. Lists the showers active right now for
 * the observer's date, each with its altitude-corrected OBSERVED-rate estimate
 * (honestly lower than ZHR, and "below horizon" when the radiant is down), the
 * next shower to peak, and a live countdown to the next MAJOR peak. The current
 * solar longitude λ☉, the stable coordinate meteor peaks are keyed to, is
 * shown up top. Clicking any shower opens its detail.
 */
export default function TonightPanel({
  showers,
  observer,
  date,
  now,
  onSelect,
  onOpenCalendar,
  onOpenWhy,
}: {
  showers: MeteorShowerRecord[];
  observer: Observer;
  date: Date;
  now: Date;
  onSelect: (code: string) => void;
  onOpenCalendar: () => void;
  onOpenWhy: () => void;
}) {
  const dateMs = date.getTime();
  const nowMs = now.getTime();

  const active = useMemo(
    () => currentlyActiveShowers(showers, new Date(dateMs)),
    [showers, dateMs]
  );

  const activeRows = useMemo(
    () =>
      active
        .map((s) => {
          const st = showerState(s, observer.lat, observer.lon, new Date(dateMs));
          return { shower: s, state: st };
        })
        .sort((a, b) => (b.state?.estimatedRate ?? -1) - (a.state?.estimatedRate ?? -1)),
    [active, observer.lat, observer.lon, dateMs]
  );

  const next = useMemo(() => nextShower(showers, new Date(dateMs)), [showers, dateMs]);
  const nextDays = next ? daysToPeak(next, new Date(dateMs)) : null;
  const major = useMemo(() => nextMajorPeak(showers, new Date(nowMs)), [showers, nowMs]);
  const solarLon = solarLongitudeDeg(date);

  return (
    <section
      aria-label="Tonight"
      className="pointer-events-auto absolute right-3 top-20 w-[300px] animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel hud-scroll max-h-[calc(100dvh-13rem)] overflow-y-auto rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
            Tonight
          </p>
          <span
            className="font-mono text-[10px] text-faint"
            title="Solar longitude λ☉: the stable coordinate meteor peaks are keyed to."
          >
            λ☉ {fmtSolarLongitude(solarLon)}
          </span>
        </div>

        {/* active now */}
        <h3 className="mt-2 font-display text-lg font-medium text-ice">
          Active now
        </h3>
        {activeRows.length === 0 ? (
          <p className="mt-1 text-[12px] leading-relaxed text-dim">
            No catalogued showers are active on this date.
          </p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {activeRows.map(({ shower, state }) => {
              const style = strengthStyle(shower.zhr);
              const up = state?.radiantUp === true;
              return (
                <li key={shower.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(shower.code)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: style?.color ?? METEOR_ACCENT }}
                      />
                      <span className="truncate text-[12px] text-dim">
                        {shower.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-faint">
                      {up ? fmtObservedRate(state?.estimatedRate) : "radiant down"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* next up */}
        <h3 className="mt-4 font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
          Next up
        </h3>
        {next ? (
          <button
            type="button"
            onClick={() => onSelect(next.code)}
            className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-colors duration-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <span className="truncate text-[12px] text-dim">{next.name}</span>
            <span className="shrink-0 font-mono text-[10px] text-faint">
              {fmtDaysToPeak(nextDays)}
            </span>
          </button>
        ) : (
          <p className="mt-1 text-[12px] text-dim">–</p>
        )}

        {/* countdown to next major peak */}
        {major && (
          <div className="mt-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Next major peak
            </p>
            <button
              type="button"
              onClick={() => onSelect(major.shower.code)}
              className="mt-0.5 text-left text-[13px] font-medium text-ice transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
            >
              {major.shower.name}
            </button>
            <p
              className="mt-1 font-mono text-[15px] tracking-wide"
              style={{ color: METEOR_ACCENT }}
            >
              {fmtCountdown(major.target, now)}
            </p>
            <p className="mt-0.5 font-mono text-[8.5px] leading-relaxed text-faint">
              approx: peaks drift ~1 day/yr; timing keyed to solar longitude
            </p>
          </div>
        )}

        <p className="mt-3 border-t border-line pt-2.5 text-[10px] leading-relaxed text-faint">
          Rates shown are the altitude-corrected OBSERVED estimate: lower than the
          idealised ZHR. Open a shower for the full breakdown.
        </p>

        {/* actions */}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onOpenCalendar}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-black/20 px-2 py-1.5 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <CalendarBlank size={13} weight="light" aria-hidden />
            Year calendar
          </button>
          <button
            type="button"
            onClick={onOpenWhy}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-black/20 px-2 py-1.5 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <Question size={13} weight="light" aria-hidden />
            Why a radiant?
          </button>
        </div>
      </div>
    </section>
  );
}
