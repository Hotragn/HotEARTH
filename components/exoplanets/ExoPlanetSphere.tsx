"use client";

import { useEffect, useMemo } from "react";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  EXO_LIMB_FRAGMENT,
  EXO_LIMB_VERTEX,
  EXO_PLANET_FRAGMENT,
  EXO_PLANET_VERTEX,
} from "./shaders";

/** Jupiter radius in Earth radii: for the size-reference shell. */
const JUPITER_RE = 11.21;
/** Fixed object-space sun direction (the camera orbits, the light does not). */
const SUN_DIR = new THREE.Vector3(1, 0.35, 0.55).normalize();

/** Compressed (√) size mapping so Earth and Jupiter both fit one frame. */
function sceneRadius(re: number | null | undefined): number {
  const r = typeof re === "number" && re > 0 ? re : 1;
  return 0.8 * Math.sqrt(r);
}

interface ExoPlanetSphereProps {
  tint: string;
  gaseous: boolean;
  hot: boolean;
  /** measured/derived radius in Earth radii, or null */
  radiusRe: number | null;
  /** rim/atmosphere glow colour */
  rimColor: [number, number, number];
}

/**
 * The single ILLUSTRATIVE planet sphere for the detail view. There is NO real
 * texture, no exoplanet has been imaged in surface detail, so this is a
 * procedural cue only (tint from planetTint, gentle bands/mottling, an optional
 * incandescent glow for very hot worlds, a soft limb). Faint wireframe shells
 * for Earth and Jupiter give an honest size comparison. Materials are built once
 * and disposed on unmount; nothing allocates per frame.
 */
export default function ExoPlanetSphere({
  tint,
  gaseous,
  hot,
  radiusRe,
  rimColor,
}: ExoPlanetSphereProps) {
  const r = sceneRadius(radiusRe);
  const earthR = sceneRadius(1);
  const jupiterR = sceneRadius(JUPITER_RE);

  const surfaceMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: SUN_DIR },
        tint: { value: new THREE.Color(tint) },
        rimColor: { value: new THREE.Color(rimColor[0], rimColor[1], rimColor[2]) },
        gaseous: { value: gaseous ? 1 : 0 },
        hot: { value: hot ? 1 : 0 },
        rimStrength: { value: 0.5 },
      },
      vertexShader: EXO_PLANET_VERTEX,
      fragmentShader: EXO_PLANET_FRAGMENT,
    });
  }, [tint, gaseous, hot, rimColor]);

  const limbMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: SUN_DIR },
        glow: { value: new THREE.Color(rimColor[0], rimColor[1], rimColor[2]) },
        intensity: { value: gaseous ? 0.5 : 0.34 },
      },
      vertexShader: EXO_LIMB_VERTEX,
      fragmentShader: EXO_LIMB_FRAGMENT,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }, [gaseous, rimColor]);

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose();
      limbMaterial.dispose();
    };
  }, [surfaceMaterial, limbMaterial]);

  const known = typeof radiusRe === "number" && radiusRe > 0;

  return (
    <group>
      <mesh material={surfaceMaterial}>
        <sphereGeometry args={[r, 128, 96]} />
      </mesh>
      <mesh material={limbMaterial} scale={1.04}>
        <sphereGeometry args={[r, 96, 72]} />
      </mesh>

      {/* size reference shells (only when the planet's radius is measured) */}
      {known && (
        <>
          <ReferenceShell radius={earthR} color="#5aa9ff" label="Earth" />
          <ReferenceShell radius={jupiterR} color="#c9a97e" label="Jupiter" />
        </>
      )}
    </group>
  );
}

function ReferenceShell({
  radius,
  color,
  label,
}: {
  radius: number;
  color: string;
  label: string;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 32, 24]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </mesh>
      <Html
        position={[0, radius, 0]}
        center
        distanceFactor={9}
        zIndexRange={[14, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 8.5,
            letterSpacing: "0.06em",
            color,
            opacity: 0.7,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}
