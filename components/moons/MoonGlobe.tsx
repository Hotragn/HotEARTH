"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { moonSunDirection, type MoonName } from "@/lib/moons";
import { HAS_HAZE, MOON_ACCENT, MOON_FALLBACK_TINT } from "@/lib/moon-facts";
import {
  MOON_LIMB_FRAGMENT,
  MOON_LIMB_VERTEX,
  MOON_SURFACE_FRAGMENT,
  MOON_SURFACE_VERTEX,
} from "./shaders";

const DAY_MS = 86_400_000;

interface MoonGlobeProps {
  name: MoonName;
  /** real surface texture, or null → shader tints procedurally */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /** time-scrub offset in Earth days, read per-frame from a ref (no re-render) */
  timeOffsetDaysRef: React.RefObject<number>;
}

/**
 * ONE parameterized globe for all nine major moons. Mirrors PlanetGlobe /
 * MoonGlobe: unrotated base mesh (so object-space normals are body-fixed for the
 * shared dot(P̂, sunDir) terminator), a single reused sunVec, textures swapped
 * through uniforms (material built once, disposed on unmount), NO per-frame
 * allocations.
 *
 * The terminator is driven by lib/moons.moonSunDirection: because each moon is
 * tidally locked, the sub-solar point sweeps the surface once per orbit (in the
 * period's sign, so retrograde Triton sweeps the other way). The globe mesh is
 * never rotated: the sub-solar sweep alone moves the terminator, which is the
 * honest way to depict synchronous rotation.
 *
 * Airless moons get only a barely-there neutral rim (NOT an atmosphere). Titan
 * alone carries a faint orange haze rim: the one honest atmosphere this phase.
 */
export default function MoonGlobe({
  name,
  surfaceTexture,
  usingFallback,
  timeOffsetDaysRef,
}: MoonGlobeProps) {
  const hasHaze = HAS_HAZE[name];

  // 1x1 fallback so the sampler is always bound even before/without a texture.
  const blank = useMemo(() => {
    const [r, g, b] = MOON_FALLBACK_TINT[name];
    const tex = new THREE.DataTexture(
      new Uint8Array([r * 255, g * 255, b * 255, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, [name]);

  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const surfaceMaterial = useMemo(() => {
    const [r, g, b] = MOON_FALLBACK_TINT[name];
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: blank },
        useProcedural: { value: 1 },
        sunDir: { value: sunVec },
        tint: { value: new THREE.Color(r, g, b) },
        // Titan: soft, hazy terminator. Everyone else: razor-hard (airless).
        twilight: { value: hasHaze ? 0.14 : 0.02 },
      },
      vertexShader: MOON_SURFACE_VERTEX,
      fragmentShader: MOON_SURFACE_FRAGMENT,
    });
    // built once per body; texture swaps through the uniform below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const limbMaterial = useMemo(() => {
    const accent = new THREE.Color(MOON_ACCENT[name]);
    // Titan: warm orange haze, broader + brighter. Airless: neutral silver, tight + dim.
    const glow = hasHaze
      ? accent.clone().lerp(new THREE.Color(1, 1, 1), 0.15)
      : new THREE.Color(0.6, 0.63, 0.7);
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: sunVec },
        glow: { value: glow },
        intensity: { value: hasHaze ? 0.5 : 0.22 },
        rimPower: { value: hasHaze ? 2.2 : 4.0 },
      },
      vertexShader: MOON_LIMB_VERTEX,
      fragmentShader: MOON_LIMB_FRAGMENT,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose();
      limbMaterial.dispose();
      blank.dispose();
    };
  }, [surfaceMaterial, limbMaterial, blank]);

  // Swap the surface texture / procedural flag in place.
  useEffect(() => {
    const u = surfaceMaterial.uniforms;
    if (surfaceTexture && !usingFallback) {
      u.dayMap.value = surfaceTexture;
      u.useProcedural.value = 0;
    } else {
      u.dayMap.value = blank;
      u.useProcedural.value = 1;
    }
  }, [surfaceMaterial, surfaceTexture, usingFallback, blank]);

  // Sun direction: cheap. Refresh every 500ms of real time, or immediately on
  // scrub. Reuses sunVec: no per-frame allocation. The mesh is never rotated;
  // the sub-solar sweep alone moves the terminator (synchronous rotation).
  const lastSun = useRef({ at: 0, offset: Number.NaN });
  useFrame(() => {
    const offset = timeOffsetDaysRef.current ?? 0;
    const now = Date.now();
    if (offset !== lastSun.current.offset || now - lastSun.current.at > 500) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const [x, y, z] = moonSunDirection(name, new Date(now + offset * DAY_MS));
      sunVec.set(x, y, z);
    }
  });

  return (
    <group>
      <mesh material={surfaceMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={limbMaterial} scale={hasHaze ? 1.03 : 1.015}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
      </mesh>
    </group>
  );
}
