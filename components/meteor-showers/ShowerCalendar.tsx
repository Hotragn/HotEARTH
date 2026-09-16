"use client";

import { useMemo } from "react";
import { X } from "@phosphor-icons/react";
import {
  isActive,
  monthDayToDayOfYear,
  strengthStyle,
  type MeteorShowerRecord,
} from "@/lib/meteor-facts";
import { METEOR_ACCENT } from "./constants";

const YEAR_DAYS = 365;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Cumulative days before each month (non-leap), for month gridlines. */
const CUM = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

function pct(doy: number): number {
  return ((doy - 1) / YEAR_DAYS) * 100;
}

/** Day-of-year percent for a UTC date, on the same non-leap reference calendar. */
function datePct(date: Date): number | null {
  const doy = monthDayToDayOfYear(
    `${date.getUTCMonth() + 1}-${date.getUTCDate()}`
  );
  return doy === null ? null : pct(doy);
}

interface Segment {
  left: number;
  width: number;
}

/** Activity window as one or two segments (two when it wraps past New Year). */
function windowSegments(s: MeteorShowerRecord): Segment[] {
  const start = monthDayToDayOfYear(s.active_start);
  const end = monthDayToDayOfYear(s.active_end);
  if (start === null || end === null) return [];
  if (start <= end) return [{ left: pct(start), width: pct(end) - pct(start) }];
  // wraps: [start..365] and [1..end]
  return [
    { left: pct(start), width: 100 - pct(start) },
    { left: 0, width: pct(end) },
  ];
}

/**
 * Year calendar / timeline. A Jan–Dec strip with every shower's activity window
 * (split when it wraps past New Year), its peak marked, the current date drawn as
 * a vertical line, and active showers highlighted. Rows are ordered by peak so the
 * year reads left-to-right. Click a row to open that shower's detail. Pure DOM:
 * fast and crisp at any zoom.
 */
export default function ShowerCalendar({
  showers,
  date,
  selectedCode,
  onSelect,
  onClose,
}: {
  showers: MeteorShowerRecord[];
  date: Date;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const nowPct = datePct(date);
  const dateMs = date.getTime();

  const rows = useMemo(() => {
    return showers
      .map((s) => ({
        shower: s,
        peakDoy: monthDayToDayOfYear(s.peak_date) ?? 999,
        active: isActive(s, new Date(dateMs)) === true,
        segments: windowSegments(s),
      }))
      .sort((a, b) => a.peakDoy - b.peakDoy);
  }, [showers, dateMs]);

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-abyss/70 p-3 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Meteor shower year calendar"
        onClick={(e) => e.stopPropagation()}
        className="hud-panel flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl animate-hud-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-4 sm:p-5">
          <div>
            <h2 className="font-display text-lg font-medium tracking-tight text-ice">
              Meteor shower calendar · {date.getUTCFullYear()}
            </h2>
            <p className="mt-1 text-[12px] text-dim">
              Activity windows and peaks. Bar colour = strength (ZHR). Peaks drift
              ~1 day/yr: timing is keyed to solar longitude.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={17} weight="light" aria-hidden />
          </button>
        </div>

        {/* month header */}
        <div className="flex items-center border-b border-line px-3 py-1.5 sm:px-4">
          <div className="w-24 shrink-0 sm:w-32" />
          <div className="relative h-4 flex-1">
            {MONTHS.map((mo, i) => (
              <span
                key={mo}
                className="absolute font-mono text-[8.5px] uppercase tracking-wide text-faint"
                style={{ left: `${pct(CUM[i] + 1)}%` }}
              >
                {mo}
              </span>
            ))}
          </div>
        </div>

        {/* rows */}
        <div className="hud-scroll overflow-y-auto p-3 sm:p-4">
          <ul className="space-y-0.5">
            {rows.map(({ shower, peakDoy, active, segments }) => {
              const style = strengthStyle(shower.zhr);
              const color = style?.color ?? METEOR_ACCENT;
              const selected = shower.code === selectedCode;
              return (
                <li key={shower.code}>
                  <button
                    type="button"
                    onClick={() => onSelect(shower.code)}
                    className={`flex w-full items-center rounded-lg px-1.5 py-1 text-left transition-colors duration-200 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 ${
                      selected ? "bg-white/[0.07]" : ""
                    }`}
                  >
                    <span className="flex w-24 shrink-0 items-center gap-1.5 pr-2 sm:w-32">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: color,
                          opacity: active ? 1 : 0.55,
                        }}
                      />
                      <span
                        className={`truncate text-[11px] ${active ? "text-ice" : "text-dim"}`}
                      >
                        {shower.name}
                      </span>
                    </span>

                    <span className="relative h-4 flex-1">
                      {/* month gridlines */}
                      {CUM.map((c, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className="absolute top-0 h-full w-px bg-white/[0.05]"
                          style={{ left: `${pct(c + 1)}%` }}
                        />
                      ))}
                      {/* activity segments */}
                      {segments.map((seg, i) => (
                        <span
                          key={i}
                          aria-hidden
                          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                          style={{
                            left: `${seg.left}%`,
                            width: `${Math.max(seg.width, 0.6)}%`,
                            backgroundColor: color,
                            opacity: active ? 0.85 : 0.4,
                          }}
                        />
                      ))}
                      {/* peak marker */}
                      {peakDoy <= YEAR_DAYS && (
                        <span
                          aria-hidden
                          className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border"
                          style={{
                            left: `${pct(peakDoy)}%`,
                            backgroundColor: color,
                            borderColor: "#05060a",
                          }}
                        />
                      )}
                      {/* current date */}
                      {nowPct !== null && (
                        <span
                          aria-hidden
                          className="absolute top-0 h-full w-px"
                          style={{
                            left: `${nowPct}%`,
                            backgroundColor: "#edf0f5",
                            opacity: 0.55,
                          }}
                        />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-line px-4 py-2 font-mono text-[9px] leading-relaxed text-faint">
          White line = current date. Diamond = peak. Data: IAU MDC + IMO Working
          List (2026); ZHR is an idealised peak rate.
        </div>
      </div>
    </div>
  );
}
