"use client";

import { useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { METEOR_ACCENT } from "./constants";

/**
 * "Why a radiant?" explainer. A meteor shower's radiant is a PERSPECTIVE effect:
 * the meteoroids in a stream travel on essentially parallel paths, and as Earth
 * ploughs through the stream they all enter the atmosphere moving the same way,
 * so, like railway tracks converging at the horizon, their trails appear to
 * diverge from a single point on the sky. The diagram is illustrative (real
 * geometry, drawn), which is stated on it.
 */
export default function WhyRadiantModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-abyss/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Why a radiant?"
        onClick={(e) => e.stopPropagation()}
        className="hud-panel flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl animate-hud-in"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 className="font-display text-lg font-medium tracking-tight text-ice">
              Why a radiant?
            </h2>
            <p className="mt-1 text-[12px] text-dim">
              The radiant is a perspective effect, not a real point in space.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={17} weight="light" aria-hidden />
          </button>
        </div>

        <div className="hud-scroll overflow-y-auto p-5">
          <svg
            viewBox="0 0 420 210"
            className="w-full"
            role="img"
            aria-label="Left: parallel meteoroid paths in space crossing Earth. Right: from the ground, the same trails appear to fan out from a single radiant point."
          >
            {/* left panel, parallel stream in space */}
            <text x="12" y="16" fill="#9aa2b1" fontSize="9" fontFamily="monospace">
              In space: parallel paths
            </text>
            {[0, 1, 2, 3, 4].map((i) => {
              const y = 34 + i * 12;
              return (
                <line
                  key={i}
                  x1={18}
                  y1={y}
                  x2={150}
                  y2={y + 28}
                  stroke={METEOR_ACCENT}
                  strokeWidth={1.4}
                  markerEnd="url(#ah)"
                  opacity={0.85}
                />
              );
            })}
            {/* Earth arc */}
            <path
              d="M120 150 A 60 60 0 0 1 188 118"
              fill="none"
              stroke="#4aa3ff"
              strokeWidth={3}
              opacity={0.8}
            />
            <text x="118" y="168" fill="#626a7a" fontSize="8" fontFamily="monospace">
              Earth &amp; atmosphere
            </text>

            {/* divider */}
            <line x1="210" y1="12" x2="210" y2="198" stroke="#ffffff" strokeOpacity="0.08" />

            {/* right panel, perspective convergence to the radiant */}
            <text x="228" y="16" fill="#9aa2b1" fontSize="9" fontFamily="monospace">
              In the sky: one radiant
            </text>
            {/* radiant point */}
            <circle cx="300" cy="52" r="4" fill={METEOR_ACCENT} />
            <circle cx="300" cy="52" r="9" fill="none" stroke={METEOR_ACCENT} strokeWidth="1" opacity="0.5" />
            <text x="310" y="50" fill="#c7ccdb" fontSize="8.5" fontFamily="monospace">
              radiant
            </text>
            {/* trails fanning outward from the radiant */}
            {[-38, -18, 6, 30, 52].map((dx, i) => (
              <line
                key={i}
                x1={300}
                y1={52}
                x2={300 + dx}
                y2={52 + 90 + Math.abs(dx) * 0.4}
                stroke={METEOR_ACCENT}
                strokeWidth={1.4}
                markerEnd="url(#ah)"
                opacity={0.85}
              />
            ))}
            <text x="238" y="192" fill="#626a7a" fontSize="8" fontFamily="monospace">
              observer&apos;s view (illustrative)
            </text>

            <defs>
              <marker id="ah" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M0 0 L6 3 L0 6 Z" fill={METEOR_ACCENT} />
              </marker>
            </defs>
          </svg>

          <p className="mt-4 text-[13px] leading-relaxed text-dim">
            Earth sweeps through a stream of debris shed by a comet or asteroid. The
            particles all move on nearly <span className="text-ice">parallel</span>{" "}
            paths, so they strike the atmosphere travelling the same direction. From
            the ground, exactly like railway tracks converging at the horizon, their
            glowing trails appear to <span className="text-ice">fan out from one
            point</span>: the radiant. A shower is named for the constellation that
            point sits in (Perseids → Perseus).
          </p>
          <p className="mt-3 text-[12px] leading-relaxed text-faint">
            The radiant drifts slightly night to night as Earth&apos;s motion
            changes the perspective, and rates are highest when the radiant is high
            in the sky (more atmosphere above you is facing the stream). This
            diagram is illustrative; the radiant positions plotted in the 3D view
            are real catalog values.
          </p>
        </div>
      </div>
    </div>
  );
}
