"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BUILD_AGE_NOTE,
  CADENCE_IS_A_CHOICE_NOTE,
  KINDS_NOTE,
  MIRRORS,
  UNDATED_NOTE,
  WHY_NO_CHANGE_IS_HEALTHY_NOTE,
  freshness,
  type FreshnessState,
  type MirrorKind,
} from "@/lib/mirrors";
import { WORLDS } from "@/lib/worlds";

/**
 * Every mirror, its age, and what that age means.
 *
 * THE AGE IS COMPUTED AGAINST THE READER'S CLOCK, not against the build. The
 * page is statically prerendered, so a build-time age would freeze at deploy and
 * a site left up for a month would confidently report month-old numbers as
 * fresh. The server passes down the timestamps it read out of the files; the
 * arithmetic happens here.
 *
 * That means the first paint has no ages at all, which is correct rather than
 * unfortunate: before the clock is available the honest output is a dash.
 */

export interface MirrorStamp {
  path: string;
  /** The timestamp read out of the committed file at build time, or null. */
  stamp: string | null;
  bytes: number;
}

const STATE_LABEL: Record<FreshnessState, string> = {
  current: "current",
  due: "due",
  stale: "stale",
  published: "published",
  derived: "built here",
  undated: "undated",
};

const STATE_COLOR: Record<FreshnessState, string> = {
  current: "#5ce6a5",
  due: "#ffd27a",
  stale: "#ff7a7a",
  published: "#8fd3ff",
  derived: "#b98bff",
  undated: "#9ba1a6",
};

const KIND_HEADING: Record<MirrorKind, string> = {
  live: "Live: an upstream that keeps moving",
  published: "Published: one released version of a catalogue",
  derived: "Derived: computed in this repository",
};

const KIND_BLURB: Record<MirrorKind, string> = {
  live: "Age is a verdict here. Past the cadence means a run is late; well past it means something is broken.",
  published:
    "Age is information, not a verdict. These change when their publisher releases a new version and not before, so a number in the thousands of days is the normal case.",
  derived:
    "Age is the age of the code that produced the file. Nothing upstream is being waited on.",
};

function fmtAge(days: number | null): string {
  if (days === null) return "–";
  if (days < 1 / 24) return "under an hour";
  if (days < 1) return `${Math.round(days * 24)} hours`;
  if (days < 2) return "a day";
  if (days < 90) return `${Math.round(days)} days`;
  if (days < 730) return `${Math.round(days / 30.44)} months`;
  return `${(days / 365.25).toFixed(1)} years`;
}

function fmtCadence(days: number | null): string {
  if (days === null) return "–";
  if (days < 1) return `${Math.round(24 * days)} hours`;
  if (days === 7) return "weekly";
  if (days >= 28 && days <= 31) return "monthly";
  return `${days} days`;
}

function fmtBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} kB`;
}

export default function MirrorTable({ stamps }: { stamps: readonly MirrorStamp[] }) {
  // Deliberately not Date.now() during render: the server and the first client
  // paint would disagree and React would complain about it, correctly.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const byPath = useMemo(() => new Map(stamps.map((s) => [s.path, s])), [stamps]);
  const worldHref = useMemo(() => new Map(WORLDS.map((w) => [w.id, w.href])), []);

  const rows = useMemo(
    () =>
      MIRRORS.map((mirror) => {
        const found = byPath.get(mirror.path);
        return {
          bytes: found?.bytes ?? 0,
          ...freshness(mirror, found?.stamp ?? null, now ?? 0),
        };
      }),
    [byPath, now]
  );

  const attention = now === null ? [] : rows.filter((r) => r.needsAttention);
  const totalBytes = rows.reduce((n, r) => n + r.bytes, 0);

  // Distinguish an old build from a dead job, from the shape of the evidence
  // rather than from a guess. Every sub-daily mirror going stale together, by
  // roughly the same number of days, is one build that has not caught up. A
  // single mirror, or a monthly one, is a job that has stopped.
  const subDaily = rows.filter((r) => r.mirror.kind === "live" && (r.mirror.cadenceDays ?? 99) < 1);
  const looksLikeAnOldBuild =
    attention.length > 0 &&
    subDaily.length > 1 &&
    subDaily.every((r) => r.needsAttention) &&
    attention.every((r) => (r.mirror.cadenceDays ?? 99) < 1);

  return (
    <div className="space-y-4">
      <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
          {now === null
            ? "Checking against your clock"
            : attention.length === 0
              ? "Every live mirror is inside its cadence"
              : looksLikeAnOldBuild
                ? "This build is behind: every sub-daily mirror is stale together"
                : `${attention.length} live ${attention.length === 1 ? "mirror is" : "mirrors are"} past cadence`}
        </h2>
        {attention.length > 0 && (
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-rose-200/90">
            {attention.map((r) => (
              <li key={r.mirror.path}>
                {r.mirror.label}: {fmtAge(r.ageDays)} old, expected {fmtCadence(r.mirror.cadenceDays)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12px] leading-relaxed text-dim">
          {WHY_NO_CHANGE_IS_HEALTHY_NOTE}
        </p>
        {attention.length > 0 && (
          <p className="mt-2 border-t border-line/60 pt-2 text-[12px] leading-relaxed text-dim">
            {BUILD_AGE_NOTE}
          </p>
        )}
      </section>

      {(["live", "published", "derived"] as const).map((kind) => {
        const group = rows.filter((r) => r.mirror.kind === kind);
        if (group.length === 0) return null;
        return (
          <section key={kind} className="hud-panel rounded-2xl p-4">
            <header className="mb-2">
              <h2 className="font-display text-base font-medium tracking-tight text-ice">
                {KIND_HEADING[kind]}
              </h2>
              <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-dim">
                {KIND_BLURB[kind]}
              </p>
            </header>

            <div className="hud-scroll -mx-1 overflow-x-auto px-1">
              <table className="w-full min-w-[680px] border-collapse text-left font-mono text-[11px]">
                <thead>
                  <tr className="text-faint">
                    <th className="py-1 pr-3 font-normal">mirror</th>
                    <th className="py-1 pr-3 font-normal">tab</th>
                    <th className="py-1 pr-3 text-right font-normal">age</th>
                    {kind === "live" && (
                      <th className="py-1 pr-3 text-right font-normal">cadence</th>
                    )}
                    <th className="py-1 pr-3 text-right font-normal">size</th>
                    <th className="py-1 font-normal">state</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((r) => {
                    const href = r.mirror.world ? worldHref.get(r.mirror.world) : undefined;
                    return (
                      <tr key={r.mirror.path} className="border-t border-line align-top">
                        <td className="py-1.5 pr-3">
                          <a
                            href={r.mirror.path}
                            className="text-ice transition-colors duration-200 hover:text-white"
                          >
                            {r.mirror.label}
                          </a>
                          <div className="text-[10px] text-faint">{r.mirror.path}</div>
                          {r.mirror.note && (
                            <p className="mt-1 max-w-xl text-[10.5px] leading-snug text-faint">
                              {r.mirror.note}
                            </p>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-dim">
                          {href ? (
                            <a
                              href={href}
                              className="transition-colors duration-200 hover:text-ice"
                            >
                              {r.mirror.world}
                            </a>
                          ) : (
                            <span className="text-faint">shared</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-right text-dim">
                          {now === null ? "–" : fmtAge(r.ageDays)}
                          {r.stamp && (
                            <div className="text-[10px] text-faint">{r.stamp.slice(0, 10)}</div>
                          )}
                        </td>
                        {kind === "live" && (
                          <td className="py-1.5 pr-3 text-right text-faint">
                            {fmtCadence(r.mirror.cadenceDays)}
                          </td>
                        )}
                        <td className="py-1.5 pr-3 text-right text-faint">{fmtBytes(r.bytes)}</td>
                        <td className="py-1.5" style={{ color: STATE_COLOR[r.state] }}>
                          {now === null ? "–" : STATE_LABEL[r.state]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
          What this page does and does not tell you
        </h2>
        <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
          <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
            <span className="text-sky-300/90">Three kinds of age: </span>
            {KINDS_NOTE}
          </li>
          <li className="border-t border-line/60 pt-2">
            <span className="text-amber-200/90">The cadences are ours: </span>
            {CADENCE_IS_A_CHOICE_NOTE}
          </li>
          <li className="border-t border-line/60 pt-2">
            <span className="text-violet-300/90">Two undated live mirrors: </span>
            {UNDATED_NOTE}
          </li>
          <li className="border-t border-line/60 pt-2">
            <span className="text-emerald-300/90">Not a source list: </span>
            Every tab carries its own attribution footer naming the instrument, the agency and the
            terms. This page is about age and completeness only, so that those credits stay in one
            place instead of two that can disagree.
          </li>
        </ul>
        <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
          {MIRRORS.length} mirrors, {fmtBytes(totalBytes)} committed. Every file is linked above and
          served as it sits in the repository, so any number on any tab can be traced back to the
          bytes it came from. The registry behind this page is lib/mirrors.ts, and a test fails if a
          file appears under public/data without being declared there.
        </p>
      </section>
    </div>
  );
}
