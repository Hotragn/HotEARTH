"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { radiantVector3, type MeteorShowerRecord } from "@/lib/meteor-facts";
import { METEOR_ACCENT, RADIANT_SPHERE_RADIUS } from "./constants";

/**
 * Labelled radiant markers: one per shower, placed at its real J2000 radiant
 * direction (radiantVector3 → lib/celestial). ACTIVE and near-peak radiants pulse
 * and are always labelled; the selected one gets a highlight ring; the rest are
 * faint dots that label on hover. The markers are purely visual (pointer-events
 * off): clicking is resolved by the scene's manual picker, which is robust under
 * OrbitControls where THREE.Points threshold-picking is not.
 */
export default function RadiantMarkers({
  showers,
  activeCodes,
  nearPeakCodes,
  selectedCode,
  hoveredCode,
}: {
  showers: MeteorShowerRecord[];
  activeCodes: Set<string>;
  nearPeakCodes: Set<string>;
  selectedCode: string | null;
  hoveredCode: string | null;
}) {
  const markers = useMemo(
    () =>
      showers
        .map((s) => {
          const pos = radiantVector3(s, RADIANT_SPHERE_RADIUS * 0.985);
          return pos ? { code: s.code, name: s.name, pos } : null;
        })
        .filter((m): m is { code: string; name: string; pos: [number, number, number] } => m !== null),
    [showers]
  );

  return (
    <group>
      {markers.map((m) => {
        const active = activeCodes.has(m.code);
        const nearPeak = nearPeakCodes.has(m.code);
        const selected = selectedCode === m.code;
        const hovered = hoveredCode === m.code;
        const showLabel = active || nearPeak || selected || hovered;
        const dot = active || nearPeak ? 9 : 5;
        const opacity = selected ? 1 : active ? 0.95 : nearPeak ? 0.85 : 0.5;

        return (
          <Html
            key={m.code}
            position={m.pos}
            center
            zIndexRange={[selected ? 20 : active ? 14 : 8, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div style={{ position: "relative", width: 0, height: 0 }}>
              {selected && (
                <div
                  style={{
                    position: "absolute",
                    left: -15,
                    top: -15,
                    width: 30,
                    height: 30,
                    borderRadius: "9999px",
                    border: `1.5px solid ${METEOR_ACCENT}`,
                    boxShadow: `0 0 10px ${METEOR_ACCENT}66`,
                  }}
                />
              )}
              <div
                className={active ? "animate-pulse" : undefined}
                style={{
                  position: "absolute",
                  left: -dot / 2,
                  top: -dot / 2,
                  width: dot,
                  height: dot,
                  borderRadius: "9999px",
                  background: METEOR_ACCENT,
                  opacity,
                  boxShadow:
                    active || selected ? `0 0 8px ${METEOR_ACCENT}` : "none",
                }}
              />
              {showLabel && (
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    top: -7,
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-plex-mono, monospace)",
                    fontSize: 9.5,
                    letterSpacing: "0.03em",
                    color: selected ? "#edf0f5" : "#c7ccdb",
                    opacity: selected ? 1 : 0.82,
                    textShadow: "0 1px 5px rgba(0,0,0,0.9)",
                  }}
                >
                  {m.name}
                </div>
              )}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
