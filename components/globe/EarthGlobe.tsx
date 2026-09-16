"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3, vector3ToLatLon, type LatLon } from "@/lib/geo";
import { sunDirection } from "@/lib/solar";
import type { LayerKind } from "@/lib/gibs";
import {
  ATMOSPHERE_FRAGMENT,
  ATMOSPHERE_VERTEX,
  EARTH_FRAGMENT,
  EARTH_VERTEX,
} from "./shaders";

export const GLOBE_RADIUS = 1;

/** How much a pointer may travel (px) and still count as a "click to pick". */
const CLICK_SLOP_PX = 5;

interface EarthGlobeProps {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  /** current GIBS layer texture (null = plain Blue Marble) */
  layerTexture: THREE.Texture | null;
  layerKind: LayerKind | null;
  /** mutable, read per-frame, avoids re-rendering the canvas while scrubbing */
  timeOffsetHoursRef: React.RefObject<number>;
  picked: LatLon | null;
  onPick: (latLon: LatLon) => void;
  /** surface hover tracking (Living Earth city tooltips); null = pointer left */
  onHover?: (latLon: LatLon | null) => void;
}

export default function EarthGlobe({
  dayTexture,
  nightTexture,
  layerTexture,
  layerKind,
  timeOffsetHoursRef,
  picked,
  onPick,
  onHover,
}: EarthGlobeProps) {
  // 1x1 transparent texture used when no overlay is active
  const blankOverlay = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([0, 0, 0, 0]),
      1,
      1,
      THREE.RGBAFormat
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Shared sun vector: one instance referenced by both materials.
  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTexture },
          nightMap: { value: nightTexture },
          overlayMap: { value: blankOverlay },
          overlayStrength: { value: 0 },
          sunDir: { value: sunVec },
        },
        vertexShader: EARTH_VERTEX,
        fragmentShader: EARTH_FRAGMENT,
      }),
    // created once; texture swaps happen through uniforms below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sunVec } },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
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
      blankOverlay.dispose();
    };
  }, [earthMaterial, atmosphereMaterial, blankOverlay]);

  // Swap texture uniforms in place: never rebuild the material on layer
  // change (globe-3d-visualization skill).
  useEffect(() => {
    const u = earthMaterial.uniforms;
    if (layerTexture && layerKind === "base") {
      u.dayMap.value = layerTexture;
      u.overlayMap.value = blankOverlay;
      u.overlayStrength.value = 0;
    } else if (layerTexture && layerKind === "overlay") {
      u.dayMap.value = dayTexture;
      u.overlayMap.value = layerTexture;
      u.overlayStrength.value = 0.92;
    } else {
      u.dayMap.value = dayTexture;
      u.overlayMap.value = blankOverlay;
      u.overlayStrength.value = 0;
    }
  }, [earthMaterial, layerTexture, layerKind, dayTexture, blankOverlay]);

  useEffect(() => {
    earthMaterial.uniforms.nightMap.value = nightTexture;
  }, [earthMaterial, nightTexture]);

  // Sun direction: cheap, but no need for 60Hz, refresh every 500ms of real
  // time, or immediately when the user scrubs the time control.
  const lastSun = useRef({ at: 0, offset: Number.NaN });
  useFrame(() => {
    const offset = timeOffsetHoursRef.current ?? 0;
    const now = Date.now();
    if (
      offset !== lastSun.current.offset ||
      now - lastSun.current.at > 500
    ) {
      lastSun.current.at = now;
      lastSun.current.offset = offset;
      const [x, y, z] = sunDirection(new Date(now + offset * 3_600_000));
      sunVec.set(x, y, z);
    }
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Ignore orbit drags that end on the globe.
    if (event.delta > CLICK_SLOP_PX) return;
    event.stopPropagation();
    const p = event.point; // world space == Earth-fixed (mesh unrotated)
    onPick(vector3ToLatLon(p.x, p.y, p.z));
  };

  const handlePointerMove = onHover
    ? (event: ThreeEvent<PointerEvent>) => {
        const p = event.point;
        onHover(vector3ToLatLon(p.x, p.y, p.z));
      }
    : undefined;
  const handlePointerLeave = onHover ? () => onHover(null) : undefined;

  return (
    <group>
      <mesh
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        material={earthMaterial}
      >
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={atmosphereMaterial} scale={1.045}>
        <sphereGeometry args={[GLOBE_RADIUS, 96, 72]} />
      </mesh>
      {picked && <PickMarker latLon={picked} />}
    </group>
  );
}

/** Amber pin: a dot plus a slowly breathing ring, tangent to the surface. */
function PickMarker({ latLon }: { latLon: LatLon }) {
  const position = useMemo(
    () => latLonToVector3(latLon.lat, latLon.lon, GLOBE_RADIUS * 1.003),
    [latLon]
  );
  const quaternion = useMemo(() => {
    const outward = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      outward
    );
  }, [position]);

  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const s = 1 + 0.22 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.2));
    ringRef.current.scale.setScalar(s);
  });

  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[0.0065, 24]} />
        <meshBasicMaterial color="#f2a63b" />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.013, 0.0148, 48]} />
        <meshBasicMaterial
          color="#f2a63b"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
