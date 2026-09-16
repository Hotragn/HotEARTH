"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import {
  exoPlanetDerived,
  lsunFromLogLum,
  type ExoPlanet,
  type ExoStar,
} from "@/lib/exo-facts";
import ExoPlanetSphere from "./ExoPlanetSphere";

/** Composition classes rendered with a banded, gaseous look. */
const GASEOUS = new Set(["gas-giant", "neptune-like", "sub-neptune"]);
const ROCKY = new Set(["rocky", "super-earth"]);

function rimColorFor(
  eqtK: number | null,
  gaseous: boolean,
  rocky: boolean
): [number, number, number] {
  if (eqtK !== null && eqtK >= 1000) return [1.0, 0.5, 0.3]; // incandescent
  if (rocky && eqtK !== null && eqtK >= 200 && eqtK < 330) return [0.4, 0.7, 1.0];
  if (gaseous) return [0.6, 0.7, 0.95];
  return [0.55, 0.6, 0.75];
}

/**
 * Full-viewport detail canvas for one exoplanet: the illustrative sphere plus a
 * PROMINENT honesty badge. Reads the star's LINEAR luminosity (converted here
 * from the archive's log10 value) so the tint / equilibrium temperature match
 * the rest of the app. The camera slowly auto-rotates so both the lit and dark
 * hemispheres are visible without spinning the (static) sphere.
 */
export default function ExoPlanetDetailCanvas({
  planet,
  star,
}: {
  planet: ExoPlanet & { name: string };
  star: ExoStar;
}) {
  const [interacted, setInteracted] = useState(false);

  const lumLinear = lsunFromLogLum(star.lum);
  const ed = exoPlanetDerived(planet, {
    teff: star.teff,
    lum: lumLinear,
  });
  const cls = ed.composition?.class ?? null;
  const gaseous = cls !== null && GASEOUS.has(cls);
  const rocky = cls !== null && ROCKY.has(cls);
  const hot = ed.eqtK !== null && ed.eqtK >= 1000;
  const rimColor = rimColorFor(ed.eqtK, gaseous, rocky);
  const imaged = planet.directly_imaged === true;

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 3.4], fov: 42, near: 0.1, far: 200 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <Stars radius={90} depth={45} count={4200} factor={2.6} saturation={0} fade speed={0.25} />

      <ExoPlanetSphere
        tint={ed.tint}
        gaseous={gaseous}
        hot={hot}
        radiusRe={planet.radius_re ?? null}
        rimColor={rimColor}
      />

      {/* prominent illustrative badge */}
      <Html
        position={[0, 2.1, 0]}
        center
        distanceFactor={7}
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            textAlign: "center",
            fontFamily: "var(--font-plex-mono, monospace)",
            padding: "5px 12px",
            borderRadius: 999,
            border: "1px solid rgba(242,166,59,0.5)",
            background: "rgba(242,166,59,0.12)",
            color: "#f2a63b",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backdropFilter: "blur(4px)",
          }}
        >
          Illustrative
          <div
            style={{
              marginTop: 2,
              fontSize: 8.5,
              letterSpacing: "0.03em",
              textTransform: "none",
              color: "#9aa2b1",
            }}
          >
            {imaged
              ? "imaged only as an unresolved point of light: not a surface map"
              : "no exoplanet has been imaged in surface detail"}
          </div>
        </div>
      </Html>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.65}
        minDistance={1.6}
        maxDistance={9}
        autoRotate={!interacted}
        autoRotateSpeed={0.3}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
