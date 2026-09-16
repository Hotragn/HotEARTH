"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { marsSunDirection } from "@/lib/mars-time";
import {
  MARS_ATMOSPHERE_FRAGMENT,
  MARS_ATMOSPHERE_VERTEX,
  MARS_FRAGMENT,
  MARS_VERTEX,
} from "./shaders";

interface MarsGlobeProps {
  /** real surface texture, or null → shader tints procedurally */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /**
   * Mars-year scrub position in *sols* relative to now, read per-frame from a
   * ref so scrubbing the year never re-renders the canvas.
   */
  timeOffsetSolsRef: React.RefObject<number>;
}

const SOL_MS = 88_775_244; // one sol in ms (SECONDS_PER_SOL * 1000)

/**
 * Mars sphere + thin dusty atmosphere. Mirrors EarthGlobe: same GLOBE_RADIUS,
 * unrotated mesh, shared sun vector referenced by both materials, texture swaps
 * through uniforms (never rebuild the material). Real terminator from the
 * Mars24 subsolar point in lib/mars-time.
 */
export default function MarsGlobe({
  surfaceTexture,
  usingFallback,
  timeOffsetSolsRef,
}: MarsGlobeProps) {
  // 1x1 fallback so the sampler is always bound even before/without a texture.
  const blank = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([180, 90, 40, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const marsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: blank },
          useProcedural: { value: 1 },
          sunDir: { value: sunVec },
        },
        vertexShader: MARS_VERTEX,
        fragmentShader: MARS_FRAGMENT,
      }),
    // created once; texture/procedural flag swap through uniforms below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sunVec } },
        vertexShader: MARS_ATMOSPHERE_VERTEX,
        fragmentShader: MARS_ATMOSPHERE_FRAGMENT,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    return () => {
      marsMaterial.dispose();
      atmosphereMaterial.dispose();
      blank.dispose();
    };
  }, [marsMaterial, atmosphereMaterial, blank]);

  // Swap the surface texture / procedural flag in place.
  useEffect(() => {
    const u = marsMaterial.uniforms;
    if (surfaceTexture && !usingFallback) {
      u.dayMap.value = surfaceTexture;
      u.useProcedural.value = 0;
    } else {
      u.dayMap.value = blank;
      u.useProcedural.value = 1;
    }
  }, [marsMaterial, surfaceTexture, usingFallback, blank]);

  // Sun direction: cheap. Refresh every 500ms of real time or immediately when
  // the user scrubs the Mars year (offset changes). No per-frame allocation:
  // sunVec is reused.
  const lastSun = useRef({ at: 0, offset: Number.NaN });
  useFrame(() => {
    const offset = timeOffsetSolsRef.current ?? 0;
    const now = Date.now();
    if (offset !== lastSun.current.offset || now - lastSun.current.at > 500) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const [x, y, z] = marsSunDirection(new Date(now + offset * SOL_MS));
      sunVec.set(x, y, z);
    }
  });

  return (
    <group>
      <mesh material={marsMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={atmosphereMaterial} scale={1.03}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
      </mesh>
    </group>
  );
}
