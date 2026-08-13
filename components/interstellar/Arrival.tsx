"use client";

import { useEffect, useState } from "react";
import { ArrowRight, SkipForward } from "@phosphor-icons/react";
import {
  HOMAGE_NOTE,
  INTERSTELLAR_ACCENT,
  OBJECT_COLOR,
  REAL_IMAGERY,
} from "./interstellarUi";

/**
 * Section A: a cinematic, SKIPPABLE onboarding intro, now built on REAL footage.
 * A slow cross-fading montage of the three public-domain NASA/ESA stills (galactic
 * center, the Voyager Pale Blue Dot, the Hubble eXtreme Deep Field) drifts behind
 * staged, original intro captions (never film dialogue), and the three real
 * visitors are introduced. A Skip control and an Enter control both leave the intro
 * (the parent remembers the choice in localStorage so it does not gate every visit).
 *
 * No copyrighted film assets: the imagery is genuine public-domain NASA/ESA
 * photography (credited), there is no film score, no scenes, no logos, no dialogue.
 * The guide robot is intentionally NOT foregrounded here; it lives as a small
 * corner companion on the other sections.
 */

/** Staged intro lines (original copy, no film dialogue, no em-dashes). */
const LINES = [
  "Every so often, something falls in from another star.",
  "Not born here. Not bound here. Passing through, once, forever.",
  "Three have been caught in the act.",
];

const VISITORS: Array<{ id: keyof typeof OBJECT_COLOR; name: string; note: string }> = [
  { id: "1I", name: "1I/'Oumuamua", note: "2017 · the first, and the strangest" },
  { id: "2I", name: "2I/Borisov", note: "2019 · a comet from another star" },
  { id: "3I", name: "3I/ATLAS", note: "2025 · fastest, from Sagittarius" },
];

export default function Arrival({
  onEnter,
  onSkip,
}: {
  onEnter: () => void;
  onSkip: () => void;
}) {
  // Advance the reveal every ~1.7s up to the final stage.
  const [stage, setStage] = useState(0);
  // Which real still is foregrounded in the cross-fading montage.
  const [imageIdx, setImageIdx] = useState(0);
  // Respect reduced motion: hold on the first still, no slow zoom.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setStage((s) => (s >= LINES.length + 1 ? s : s + 1));
    }, 1700);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setImageIdx((i) => (i + 1) % REAL_IMAGERY.length);
    }, 4200);
    return () => clearInterval(id);
  }, [reduced]);

  const activeImage = REAL_IMAGERY[imageIdx];

  // z-30 is deliberately BELOW the nav's z-40. This intro is a full-screen
  // takeover of the tab, but it must never take over the world switcher, or the
  // visitor is stranded here with no way back out. It still sits above this tab's
  // own backdrop (which is unpositioned), so the montage still reads as full-bleed.
  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center overflow-hidden px-5 text-center">
      {/* real-footage montage: the three PD NASA/ESA stills, cross-fading */}
      <div aria-hidden className="absolute inset-0 overflow-hidden bg-abyss">
        {REAL_IMAGERY.map((img, i) => (
          <div
            key={img.src}
            className={`absolute inset-0 h-full w-full bg-cover bg-center ${
              i === imageIdx ? "opacity-100" : "opacity-0"
            }`}
            style={{
              backgroundImage: `url(${img.src})`,
              transform: reduced ? "none" : i === imageIdx ? "scale(1.08)" : "scale(1)",
              transition:
                "opacity 1600ms ease, transform 6000ms ease-out",
            }}
          />
        ))}
        {/* legibility wash */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 40%, rgba(4,6,12,0.45) 0%, rgba(4,6,12,0.72) 55%, rgba(3,4,8,0.92) 100%)",
          }}
        />
      </div>

      {/* per-image real credit + fact, bottom-left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 max-w-[320px] text-left sm:bottom-4 sm:left-5">
        <p className="font-mono text-[10px] leading-snug text-dim">{activeImage.fact}</p>
        <p className="mt-0.5 font-mono text-[9px] leading-snug text-faint/75">
          Real imagery · {activeImage.credit}
        </p>
      </div>

      <div className="relative z-10 flex max-w-2xl flex-col items-center gap-6">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.42em] animate-hud-in"
          style={{ color: INTERSTELLAR_ACCENT }}
        >
          H.O.T Earth // Interstellar
        </p>

        {/* staged lines */}
        <div className="flex min-h-[6.5rem] flex-col justify-center gap-2">
          {LINES.map((line, i) => (
            <p
              key={i}
              className={`font-display text-lg leading-snug text-ice transition-all duration-700 sm:text-2xl ${
                stage > i ? "opacity-100 blur-0" : "translate-y-2 opacity-0 blur-sm"
              }`}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* the three visitors, revealed together after the lines */}
        <div
          className={`flex flex-wrap items-center justify-center gap-2 transition-opacity duration-700 ${
            stage >= LINES.length ? "opacity-100" : "opacity-0"
          }`}
        >
          {VISITORS.map((v) => (
            <div
              key={v.id}
              className="hud-panel flex items-center gap-2 rounded-full px-3.5 py-2"
            >
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: OBJECT_COLOR[v.id] }}
              />
              <span className="text-xs text-ice">{v.name}</span>
              <span className="hidden font-mono text-[10px] text-faint sm:inline">
                {v.note}
              </span>
            </div>
          ))}
        </div>

        {/*
          Enter and Skip live together in the CENTRE column, not in a corner.

          Skip used to sit at `absolute right-4 top-4`, which is precisely where
          NavShell puts Search, Worlds and About. The nav chrome renders above
          this intro (z-40 against z-30), so the button was not merely ugly with
          "Skip intro" bleeding out from behind "Worlds": it was completely
          unclickable at every width tested, all five hit-test points across it
          covered by the nav. The top-right corner belongs to the nav on every
          tab, and nothing else may park there.
        */}
        <div className="mt-2 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={onEnter}
            className={`group inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white/5 px-6 py-3 text-sm font-medium text-ice transition-all duration-500 hover:bg-white/10 ${
              stage >= LINES.length ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            Enter
            <ArrowRight
              size={16}
              weight="bold"
              aria-hidden
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </button>

          {/* always available: skipping early is the entire point of a skip */}
          <button
            type="button"
            onClick={onSkip}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[11px] tracking-wide text-faint transition-colors duration-200 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <SkipForward size={13} weight="fill" aria-hidden />
            Skip intro
          </button>
        </div>

        <p className="max-w-md font-mono text-[10px] leading-relaxed text-faint/80">
          {HOMAGE_NOTE}
        </p>
      </div>
    </div>
  );
}
