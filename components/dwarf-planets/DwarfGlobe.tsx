"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import { dwarfSunDirection, triaxialAxesKm } from "@/lib/dwarf-planets";
import {
  DWARF_ACCENT,
  DWARF_TINT,
  HAUMEA_RING,
  hasRealMap,
  type DwarfBodyName,
} from "@/lib/dwarf-facts";
import {
  DWARF_LIMB_FRAGMENT,
  DWARF_LIMB_VERTEX,
  DWARF_SURFACE_FRAGMENT,
  DWARF_SURFACE_VERTEX,
} from "./shaders";

const DAY_MS = 86_400_000;

/** Bodies with a (thin) atmosphere → softer terminator + haze rim. Only Pluto. */
const HAS_ATMOSPHERE: Record<DwarfBodyName, boolean> = {
  Pluto: true, // thin N₂ atmosphere + stacked haze layers (Gladstone 2016)
  Charon: false,
  Ceres: false,
  Eris: false,
  Haumea: false,
  Makemake: false,
};

/**
 * Haumea's illustrative spin rate (rad/s of wall time). Its REAL period is a
 * well-determined ~3.9155 h, far too slow to read at a globe and unrelated to
 * wall time, so, exactly like the Solar-System Venus super-rotation shell, the
 * spin here is illustrative of that measured fast rotation, labelled as such in
 * the HUD. ~1 lap / 11 s.
 */
const HAUMEA_SPIN_RATE = (2 * Math.PI) / 11;

interface DwarfGlobeProps {
  name: DwarfBodyName;
  /** real surface texture (imaged bodies only), or null → illustrative sphere */
  surfaceTexture: THREE.Texture | null;
  usingFallback: boolean;
  /** time-scrub offset in Earth days, read per-frame from a ref (no re-render) */
  timeOffsetDaysRef: React.RefObject<number>;
}

/**
 * ONE parameterized globe for all six dwarf-planet detail bodies. Mirrors
 * PlanetGlobe / MoonGlobe: object-space normals are body-fixed for the shared
 * dot(P̂, sunDir) terminator, a single reused sunVec, texture swapped through a
 * uniform (material built once, disposed on unmount), NO per-frame allocations.
 *
 * Three honest rendering paths:
 *   • IMAGED (Pluto, Charon, Ceres), a real grayscale albedo map + a computed
 *     terminator that sweeps at the body's real rotation rate.
 *   • ILLUSTRATIVE (Eris, Makemake): a tinted, softly-mottled sphere; NO real
 *     map exists, so the HUD/scene label it clearly. The terminator is still a
 *     real, computed sub-solar sweep.
 *   • HAUMEA, the real, measured GEOMETRY: a triaxial ellipsoid scaled to its
 *     ~2100×1680×1074 km axes, spinning about its short axis (illustrative rate),
 *     plus its real ring (Ortiz 2017). Surface still illustrative + labelled; the
 *     shape and ring are real. `sunDir` is counter-rotated per frame so the
 *     terminator stays world-fixed while the ellipsoid tumbles.
 */
export default function DwarfGlobe({
  name,
  surfaceTexture,
  usingFallback,
  timeOffsetDaysRef,
}: DwarfGlobeProps) {
  const imaged = hasRealMap(name);
  const hasAtmosphere = HAS_ATMOSPHERE[name];
  const spins = name === "Haumea";
  // Only Haumea is non-spherical; guard so Charon (absent from DWARFS) is safe.
  const axes = spins ? triaxialAxesKm("Haumea") : undefined;

  // Triaxial ellipsoid scaling (Haumea): normalise so the volume-equivalent
  // radius maps to GLOBE_RADIUS. Long axis a → X and intermediate b → Z lie in
  // the equatorial plane; short axis c → Y is the spin axis.
  const { meshScale, ringInner, ringOuter } = useMemo(() => {
    if (!axes) {
      return {
        meshScale: [1, 1, 1] as [number, number, number],
        ringInner: 0,
        ringOuter: 0,
      };
    }
    const sa = axes.a / 2;
    const sb = axes.b / 2;
    const sc = axes.c / 2;
    const volEquivKm = Math.cbrt(sa * sb * sc); // ≈ 779 km
    const perKm = GLOBE_RADIUS / volEquivKm; // scene units per km
    const ringR = HAUMEA_RING.radiusKm * perKm;
    const halfW = (HAUMEA_RING.widthKm * perKm) / 2;
    return {
      meshScale: [sa * perKm, sc * perKm, sb * perKm] as [number, number, number],
      ringInner: Math.max(ringR - halfW, GLOBE_RADIUS * 1.1),
      ringOuter: ringR + halfW,
    };
  }, [axes]);

  // 1×1 fallback so the sampler is always bound even before/without a texture.
  const blank = useMemo(() => {
    const [r, g, b] = DWARF_TINT[name];
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
  /** the world-space sun direction, before Haumea's spin counter-rotation */
  const worldSun = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const surfaceMaterial = useMemo(() => {
    const [r, g, b] = DWARF_TINT[name];
    return new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: blank },
        useProcedural: { value: 1 },
        sunDir: { value: sunVec },
        tint: { value: new THREE.Color(r, g, b) },
        twilight: { value: hasAtmosphere ? 0.09 : 0.02 },
      },
      vertexShader: DWARF_SURFACE_VERTEX,
      fragmentShader: DWARF_SURFACE_FRAGMENT,
    });
    // built once per body; texture swaps through the uniform below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const limbMaterial = useMemo(() => {
    const accent = new THREE.Color(DWARF_ACCENT[name]);
    const glow = hasAtmosphere
      ? accent.clone().lerp(new THREE.Color(1, 1, 1), 0.2) // Pluto: thin haze
      : new THREE.Color(0.6, 0.63, 0.7); // airless: faint neutral silver
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDir: { value: sunVec },
        glow: { value: glow },
        intensity: { value: hasAtmosphere ? 0.42 : 0.2 },
        rimPower: { value: hasAtmosphere ? 2.6 : 4.0 },
      },
      vertexShader: DWARF_LIMB_VERTEX,
      fragmentShader: DWARF_LIMB_FRAGMENT,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // Haumea ring: real radius/width (Ortiz 2017), illustrative particle look. A
  // thin flat annulus in the equatorial (XZ) plane: no texture, no CC-BY.
  const ringGeometry = useMemo(() => {
    if (!spins) return null;
    return new THREE.RingGeometry(ringInner, ringOuter, 160, 1);
  }, [spins, ringInner, ringOuter]);

  const ringMaterial = useMemo(() => {
    if (!spins) return null;
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.85, 0.88, 0.92),
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }, [spins]);

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose();
      limbMaterial.dispose();
      blank.dispose();
      ringGeometry?.dispose();
      ringMaterial?.dispose();
    };
  }, [surfaceMaterial, limbMaterial, blank, ringGeometry, ringMaterial]);

  // Swap the surface texture / procedural flag in place. Un-imaged bodies always
  // stay procedural (no real map exists).
  useEffect(() => {
    const u = surfaceMaterial.uniforms;
    if (imaged && surfaceTexture && !usingFallback) {
      u.dayMap.value = surfaceTexture;
      u.useProcedural.value = 0;
    } else {
      u.dayMap.value = blank;
      u.useProcedural.value = 1;
    }
  }, [surfaceMaterial, surfaceTexture, usingFallback, blank, imaged]);

  // Sun direction (cheap): refresh the world sun every 500ms of real time, or
  // immediately on scrub. Reuses vectors: no per-frame allocation. For Haumea
  // the ellipsoid spins each frame and sunVec is counter-rotated about Y so the
  // terminator stays fixed in world space.
  const innerRef = useRef<THREE.Group>(null);
  const spinRef = useRef(0);
  const lastSun = useRef({ at: 0, offset: Number.NaN });

  useFrame((_, delta) => {
    const offset = timeOffsetDaysRef.current ?? 0;
    const now = Date.now();
    if (offset !== lastSun.current.offset || now - lastSun.current.at > 500) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const [x, y, z] = dwarfSunDirection(name, new Date(now + offset * DAY_MS));
      worldSun.set(x, y, z);
      if (!spins) sunVec.copy(worldSun);
    }
    if (spins) {
      spinRef.current += delta * HAUMEA_SPIN_RATE;
      const t = spinRef.current;
      if (innerRef.current) innerRef.current.rotation.y = t;
      // sunVec = R_y(−t) · worldSun  ⇒  dot(objNormal, sunVec) == world terminator
      const c = Math.cos(t);
      const s = Math.sin(t);
      sunVec.set(
        worldSun.x * c - worldSun.z * s,
        worldSun.y,
        worldSun.x * s + worldSun.z * c
      );
    }
  });

  return (
    <group>
      <group ref={innerRef} scale={meshScale}>
        <mesh material={surfaceMaterial}>
          <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
        </mesh>
        <mesh material={limbMaterial} scale={hasAtmosphere ? 1.03 : 1.015}>
          <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
        </mesh>
      </group>

      {/* Haumea's ring: real geometry, in the equatorial plane, does not spin */}
      {ringGeometry && ringMaterial && (
        <mesh
          geometry={ringGeometry}
          material={ringMaterial}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      )}

      {/* Prominent illustrative badge for never-visited bodies */}
      {!imaged && (
        <Html
          position={[0, spins ? 1.35 : 1.5, 0]}
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
              padding: "5px 11px",
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
                letterSpacing: "0.04em",
                textTransform: "none",
                color: "#9aa2b1",
              }}
            >
              never visited · no surface map exists
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
