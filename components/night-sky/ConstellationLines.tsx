"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import {
  raDecToVector3,
  type Constellation,
  type Star,
} from "@/lib/star-facts";
import { CONSTELLATION_RADIUS, NIGHT_SKY_ACCENT_DIM } from "./constants";

/**
 * The constellation stick figures: a CULTURAL OVERLAY, not physics. The stars
 * are real measured objects; the lines joining them into figures are a human
 * convention (the modern IAU / Western set, from Marc van der Sluys'
 * ConstellationLines, CC BY 4.0). Every segment connects two real catalogue
 * stars by id, so the figures sit exactly on the real star field. Rendered as a
 * single LineSegments (one geometry); optional constellation NAME labels are
 * drawn at each figure's centroid when toggled on.
 */
export default function ConstellationLines({
  constellations,
  byId,
  showLines,
  showNames,
}: {
  constellations: Constellation[];
  byId: Map<number, Star>;
  showLines: boolean;
  showNames: boolean;
}) {
  const { segments, labels } = useMemo(() => {
    const pts: number[] = [];
    const labelAnchors: { name: string; pos: [number, number, number] }[] = [];

    for (const con of constellations) {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let n = 0;
      for (const [aId, bId] of con.lines) {
        const a = byId.get(aId);
        const b = byId.get(bId);
        if (!a || !b) continue;
        const av = raDecToVector3(a.ra, a.dec, CONSTELLATION_RADIUS);
        const bv = raDecToVector3(b.ra, b.dec, CONSTELLATION_RADIUS);
        pts.push(av[0], av[1], av[2], bv[0], bv[1], bv[2]);
        sx += av[0] + bv[0];
        sy += av[1] + bv[1];
        sz += av[2] + bv[2];
        n += 2;
      }
      if (n > 0) {
        // centroid direction → back onto the sphere for the name label
        const len = Math.hypot(sx, sy, sz) || 1;
        labelAnchors.push({
          name: con.name,
          pos: [
            (sx / len) * CONSTELLATION_RADIUS,
            (sy / len) * CONSTELLATION_RADIUS,
            (sz / len) * CONSTELLATION_RADIUS,
          ],
        });
      }
    }
    return { segments: new Float32Array(pts), labels: labelAnchors };
  }, [constellations, byId]);

  if (!showLines && !showNames) return null;

  return (
    <group>
      {showLines && segments.length > 0 && (
        <lineSegments renderOrder={5} raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[segments, 3]} />
          </bufferGeometry>
          <lineBasicMaterial
            color={NIGHT_SKY_ACCENT_DIM}
            transparent
            opacity={0.32}
            depthTest={false}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {showNames &&
        labels.map((l) => (
          <Html
            key={l.name}
            position={l.pos}
            center
            zIndexRange={[6, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div
              style={{
                whiteSpace: "nowrap",
                fontFamily: "var(--font-plex-mono, monospace)",
                fontSize: 9.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#aab3ff",
                opacity: 0.65,
              }}
            >
              {l.name}
            </div>
          </Html>
        ))}
    </group>
  );
}
