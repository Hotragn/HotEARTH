"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { libration, moonSunDirection } from "@/lib/lunar";
import {
  MOON_EDGE_FRAGMENT,
  MOON_EDGE_VERTEX,
  MOON_FRAGMENT,
  MOON_VERTEX,
} from "./shaders";

interface MoonGlobeProps {
  /** real surface texture, or null → shader tints procedurally */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /**
   * Time-scrub position in *Earth days* relative to now, read per-frame from a
   * ref so scrubbing the synodic month never re-renders the canvas.
   */
  timeOffsetDaysRef: React.RefObject<number>;
}

const DAY_MS = 86_400_000;
const DEG2RAD = Math.PI / 180;

/**
 * Moon sphere + a very faint neutral edge (NOT an atmosphere: the Moon is
 * airless). Mirrors MarsGlobe/EarthGlobe: same GLOBE_RADIUS, unrotated mesh for
 * the coordinate convention, shared sun vector referenced by both materials,
 * texture swaps through uniforms (never rebuild the material). Real terminator
 * from the Meeus sub-solar point in lib/lunar.
 *
 * The whole group is tilted by the optical libration (l′, b′) so the Moon's
 * monthly "nod" is visible. This is a purely visual world-space tilt: the
 * shader's day/night dot(normal, sunDir) is computed in the Moon-fixed object
 * frame (both the normals and sunDir live there), so the terminator stays
 * physically correct no matter how the group is oriented in world space.
 */
export default function MoonGlobe({
  surfaceTexture,
  usingFallback,
  timeOffsetDaysRef,
}: MoonGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1x1 fallback so the sampler is always bound even before/without a texture.
  const blank = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([150, 150, 150, 255]),
      1,
      1,
      THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const moonMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: blank },
          useProcedural: { value: 1 },
          sunDir: { value: sunVec },
        },
        vertexShader: MOON_VERTEX,
        fragmentShader: MOON_FRAGMENT,
      }),
    // created once; texture/procedural flag swap through uniforms below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const edgeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sunVec } },
        vertexShader: MOON_EDGE_VERTEX,
        fragmentShader: MOON_EDGE_FRAGMENT,
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
      moonMaterial.dispose();
      edgeMaterial.dispose();
      blank.dispose();
    };
  }, [moonMaterial, edgeMaterial, blank]);

  // Swap the surface texture / procedural flag in place.
  useEffect(() => {
    const u = moonMaterial.uniforms;
    if (surfaceTexture && !usingFallback) {
      u.dayMap.value = surfaceTexture;
      u.useProcedural.value = 0;
    } else {
      u.dayMap.value = blank;
      u.useProcedural.value = 1;
    }
  }, [moonMaterial, surfaceTexture, usingFallback, blank]);

  // Sun direction + libration tilt: cheap. Refresh every 500ms of real time or
  // immediately when the user scrubs (offset changes). No per-frame allocation:
  // sunVec is reused and the group Euler is set in place.
  const lastSun = useRef({ at: 0, offset: Number.NaN });
  useFrame(() => {
    const offset = timeOffsetDaysRef.current ?? 0;
    const now = Date.now();
    if (offset !== lastSun.current.offset || now - lastSun.current.at > 500) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const date = new Date(now + offset * DAY_MS);
      const [x, y, z] = moonSunDirection(date);
      sunVec.set(x, y, z);
      // Visible monthly "nod": tilt the group by the optical libration. b′ is a
      // pitch (nod up/down = about the world X axis), l′ a yaw (rock left/right
      // = about the world Y axis). Small (±~7°), damped a touch for calm motion.
      if (groupRef.current) {
        const lib = libration(date);
        groupRef.current.rotation.x = lib.latitude * DEG2RAD * 0.8;
        groupRef.current.rotation.y = lib.longitude * DEG2RAD * 0.8;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh material={moonMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={edgeMaterial} scale={1.015}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
      </mesh>
    </group>
  );
}
