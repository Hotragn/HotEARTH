"use client";

import { useMemo } from "react";
import { Html } from "@react-three/drei";
import { raDecToVector3 } from "@/lib/star-facts";
import { GRID_RADIUS } from "./constants";

/**
 * Optional reference circles (a nice-to-have, labelled): the CELESTIAL EQUATOR
 * (declination 0°) and the ECLIPTIC (the Sun's apparent path, the equator tilted
 * by the mean obliquity ε ≈ 23.44°). Both are computed great circles, not data
 * about the stars: they are orientation aids. Off by default.
 */
const OBLIQUITY_DEG = 23.4393;
const SEG = 256;

export default function CelestialGrid({ show }: { show: boolean }) {
  const { equator, ecliptic } = useMemo(() => {
    const eq = new Float32Array((SEG + 1) * 3);
    const ec = new Float32Array((SEG + 1) * 3);
    const e = (OBLIQUITY_DEG * Math.PI) / 180;
    const cosE = Math.cos(e);
    const sinE = Math.sin(e);
    for (let i = 0; i <= SEG; i++) {
      const ra = (i / SEG) * 360;
      const [x, y, z] = raDecToVector3(ra, 0, GRID_RADIUS);
      eq[i * 3] = x;
      eq[i * 3 + 1] = y;
      eq[i * 3 + 2] = z;
      // ecliptic = equator rotated about the vernal-equinox axis (+X) by ε
      ec[i * 3] = x;
      ec[i * 3 + 1] = y * cosE - z * sinE;
      ec[i * 3 + 2] = y * sinE + z * cosE;
    }
    return { equator: eq, ecliptic: ec };
  }, []);

  if (!show) return null;

  return (
    <group>
      <lineLoop renderOrder={3} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[equator, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#4a6fa8"
          transparent
          opacity={0.4}
          depthTest={false}
          depthWrite={false}
        />
      </lineLoop>
      <lineLoop renderOrder={3} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ecliptic, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#b79233"
          transparent
          opacity={0.45}
          depthTest={false}
          depthWrite={false}
        />
      </lineLoop>

      <GridLabel text="Celestial equator" pos={raDecToVector3(90, 0, GRID_RADIUS)} color="#7fa3d8" />
      <GridLabel text="Ecliptic" pos={eclipticLabelPos()} color="#d8b565" />
    </group>
  );
}

function eclipticLabelPos(): [number, number, number] {
  // a point near ecliptic longitude 90° (summer solstice), for the label
  const e = (OBLIQUITY_DEG * Math.PI) / 180;
  const [x, y, z] = raDecToVector3(90, 0, GRID_RADIUS);
  return [x, y * Math.cos(e) - z * Math.sin(e), y * Math.sin(e) + z * Math.cos(e)];
}

function GridLabel({
  text,
  pos,
  color,
}: {
  text: string;
  pos: [number, number, number];
  color: string;
}) {
  return (
    <Html position={pos} center zIndexRange={[4, 0]} style={{ pointerEvents: "none", userSelect: "none" }}>
      <div
        style={{
          whiteSpace: "nowrap",
          fontFamily: "var(--font-plex-mono, monospace)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color,
          opacity: 0.7,
        }}
      >
        {text}
      </div>
    </Html>
  );
}
