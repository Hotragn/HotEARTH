"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { PLANETS, planetSunDirection } from "@/lib/planets";
import { PLANET_FACTS, type DetailPlanetName } from "@/lib/planet-facts";
import {
  PLANET_FRAGMENT,
  PLANET_LIMB_FRAGMENT,
  PLANET_LIMB_VERTEX,
  PLANET_VERTEX,
} from "./shaders";

const DAY_MS = 86_400_000;
const DEG2RAD = Math.PI / 180;

/**
 * Saturn ring-system geometry, from public/data/planets/saturn_rings.json:
 * the to-scale visible span is D-ring inner edge (1.11 R_Saturn) to F-ring
 * outer edge (2.3342 R_Saturn). GLOBE_RADIUS == 1 represents Saturn's
 * equatorial radius, so these numbers are the scene-unit ring radii directly.
 */
const SATURN_RING_INNER = 1.11;
const SATURN_RING_OUTER = 2.3342;

interface PlanetGlobeProps {
  name: DetailPlanetName;
  /** real surface texture, or null → shader tints procedurally */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /** Saturn only: the ring-system PNG (alpha), or null while loading/404 */
  ringTexture: THREE.Texture | null;
  /** time-scrub offset in Earth days, read per-frame from a ref (no re-render) */
  timeOffsetDaysRef: React.RefObject<number>;
}

/** Per-body procedural fallback tint (used only if the texture 404s). */
const FALLBACK_TINT: Record<DetailPlanetName, [number, number, number]> = {
  Mercury: [0.55, 0.52, 0.48],
  Venus: [0.85, 0.72, 0.42],
  Jupiter: [0.78, 0.6, 0.42],
  Saturn: [0.83, 0.72, 0.45],
  Uranus: [0.5, 0.82, 0.86],
  Neptune: [0.22, 0.4, 0.82],
};

/** Bodies with an atmosphere get a faint tinted limb glow; Mercury does not. */
const HAS_ATMOSPHERE: Record<DetailPlanetName, boolean> = {
  Mercury: false,
  Venus: true,
  Jupiter: true,
  Saturn: true,
  Uranus: true,
  Neptune: true,
};

/**
 * Generic textured planet globe for the six "other planets". Mirrors
 * MarsGlobe / MoonGlobe: unrotated base mesh (so object-space normals are
 * body-fixed for the shared dot(P̂, sunDir) terminator), a shared reused
 * sunVec, textures swapped through uniforms (materials built once, disposed on
 * unmount), no per-frame allocations.
 *
 * The whole group is tipped by the body's REAL obliquity (a rigid world-space
 * rotation, like MoonGlobe's libration) so the terminator math is untouched:
 * Uranus (97.77°) visibly rolls onto its side, Venus (177.36°) flips over.
 * Saturn's rings are a child of this group, so they lie in the equatorial
 * plane and tilt with the planet.
 */
export default function PlanetGlobe({
  name,
  surfaceTexture,
  usingFallback,
  ringTexture,
  timeOffsetDaysRef,
}: PlanetGlobeProps) {
  const facts = PLANET_FACTS[name];
  const obliquityRad = PLANETS[name].physical.obliquityDeg * DEG2RAD;
  const retrograde = PLANETS[name].physical.siderealDayHours < 0;

  // 1x1 fallback so the sampler is always bound even before/without a texture.
  const blank = useMemo(() => {
    const [r, g, b] = FALLBACK_TINT[name];
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
    const [r, g, b] = FALLBACK_TINT[name];
    const isGiant = facts.noSolidSurface;
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: blank },
        useProcedural: { value: 1 },
        sunDir: { value: sunVec },
        tint: { value: new THREE.Color(r, g, b) },
        bands: { value: isGiant ? 1 : 0 },
        // airless Mercury = hard terminator; hazy giants = soft
        twilight: { value: HAS_ATMOSPHERE[name] ? 0.12 : 0.03 },
        uvOffsetX: { value: 0 },
      },
      vertexShader: PLANET_VERTEX,
      fragmentShader: PLANET_FRAGMENT,
    });
    // built once per body; texture swaps through the uniform below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const limbMaterial = useMemo(() => {
    const [r, g, b] = FALLBACK_TINT[name];
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: sunVec },
        glow: { value: new THREE.Color(r, g, b).lerp(new THREE.Color(1, 1, 1), 0.35) },
        intensity: { value: 0.35 },
      },
      vertexShader: PLANET_LIMB_VERTEX,
      fragmentShader: PLANET_LIMB_FRAGMENT,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Saturn ring geometry with RADIAL UVs (u = normalized radius) so a horizontal
  // ring strip PNG maps inner→outer correctly. Lies in XY; rotated to the
  // equatorial (XZ) plane on the mesh below.
  const ringGeometry = useMemo(() => {
    if (!facts.hasRings) return null;
    const geo = new THREE.RingGeometry(
      SATURN_RING_INNER,
      SATURN_RING_OUTER,
      160,
      1
    );
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const span = SATURN_RING_OUTER - SATURN_RING_INNER;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - SATURN_RING_INNER) / span, 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, [facts.hasRings]);

  const ringMaterial = useMemo(() => {
    if (!facts.hasRings) return null;
    return new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      alphaTest: 0.02,
      opacity: 0.95,
    });
  }, [facts.hasRings]);

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose();
      limbMaterial.dispose();
      blank.dispose();
      ringGeometry?.dispose();
      ringMaterial?.dispose();
    };
  }, [surfaceMaterial, limbMaterial, blank, ringGeometry, ringMaterial]);

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

  // Bind the Saturn ring texture once it loads.
  useEffect(() => {
    if (ringMaterial && ringTexture) {
      ringTexture.colorSpace = THREE.SRGBColorSpace;
      ringMaterial.map = ringTexture;
      ringMaterial.needsUpdate = true;
    }
  }, [ringMaterial, ringTexture]);

  // Sun direction (cheap): refresh every 500ms of real time, or immediately on
  // scrub. Reuses sunVec: no per-frame allocation. Venus additionally scrolls
  // its cloud texture longitudinally to depict measured super-rotation (labelled
  // illustrative in the HUD).
  const lastSun = useRef({ at: 0, offset: Number.NaN });
  useFrame((_, delta) => {
    const offset = timeOffsetDaysRef.current ?? 0;
    const now = Date.now();
    if (offset !== lastSun.current.offset || now - lastSun.current.at > 500) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const [x, y, z] = planetSunDirection(name, new Date(now + offset * DAY_MS));
      sunVec.set(x, y, z);
    }
    if (facts.superRotation) {
      // ~one visible lap every ~20 s of wall time: an illustrative rate, in
      // the retrograde sense; the true ~4-day lap is stated in the HUD.
      const dir = retrograde ? 1 : -1;
      surfaceMaterial.uniforms.uvOffsetX.value =
        (surfaceMaterial.uniforms.uvOffsetX.value + dir * delta * 0.05) % 1;
    }
  });

  return (
    <group rotation={[0, 0, obliquityRad]}>
      <mesh material={surfaceMaterial}>
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      {HAS_ATMOSPHERE[name] && (
        <mesh material={limbMaterial} scale={1.02}>
          <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
        </mesh>
      )}
      {ringGeometry && ringMaterial && (
        <mesh
          geometry={ringGeometry}
          material={ringMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
}
