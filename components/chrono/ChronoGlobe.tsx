"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { sunDirection } from "@/lib/solar";
import { yearToApproxDate } from "@/lib/chrono-clock";
import {
  CHRONO_ATMOSPHERE_FRAGMENT,
  CHRONO_ATMOSPHERE_VERTEX,
  CHRONO_EARTH_FRAGMENT,
  CHRONO_EARTH_VERTEX,
} from "./shaders";

interface ChronoGlobeProps {
  /** Blue Marble texture, or null → shader tints procedurally */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /**
   * Current simulated decimal year, read per-frame from a ref so the timeline
   * playback never re-renders the canvas. Drives the (real) solar terminator
   * for the simulated date: day/night still sweeps as history plays.
   */
  simYearRef: React.RefObject<number>;
}

/**
 * Virtual Earth sphere + thin atmosphere. Own material (never touches the
 * Earth/Living components), same GLOBE_RADIUS and unrotated-mesh convention,
 * shared sun vector referenced by both materials, texture swap through uniforms
 * (never rebuild the material). The terminator uses the REAL solar geometry
 * (lib/solar) for the simulated year's approximate date.
 */
export default function ChronoGlobe({
  surfaceTexture,
  usingFallback,
  simYearRef,
}: ChronoGlobeProps) {
  const blank = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([20, 45, 80, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: blank },
          useProcedural: { value: 1 },
          sunDir: { value: sunVec },
        },
        vertexShader: CHRONO_EARTH_VERTEX,
        fragmentShader: CHRONO_EARTH_FRAGMENT,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sunVec } },
        vertexShader: CHRONO_ATMOSPHERE_VERTEX,
        fragmentShader: CHRONO_ATMOSPHERE_FRAGMENT,
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
      earthMaterial.dispose();
      atmosphereMaterial.dispose();
      blank.dispose();
    };
  }, [earthMaterial, atmosphereMaterial, blank]);

  // Swap texture / procedural flag in place.
  useEffect(() => {
    const u = earthMaterial.uniforms;
    if (surfaceTexture && !usingFallback) {
      u.dayMap.value = surfaceTexture;
      u.useProcedural.value = 0;
    } else {
      u.dayMap.value = blank;
      u.useProcedural.value = 1;
    }
  }, [earthMaterial, surfaceTexture, usingFallback, blank]);

  // Terminator: cheap, but no need every frame, refresh when the simulated
  // year moves meaningfully or every 400ms. sunVec is reused (no allocation).
  const lastSun = useRef({ at: 0, year: Number.NaN });
  useFrame(() => {
    const year = simYearRef.current ?? 2026;
    const now = Date.now();
    if (
      Math.abs(year - lastSun.current.year) > 0.02 ||
      now - lastSun.current.at > 400
    ) {
      lastSun.current.at = now;
      lastSun.current.year = year;
      const [x, y, z] = sunDirection(yearToApproxDate(year));
      sunVec.set(x, y, z);
    }
  });

  return (
    <group>
      <mesh material={earthMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={atmosphereMaterial} scale={1.04}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
      </mesh>
    </group>
  );
}
