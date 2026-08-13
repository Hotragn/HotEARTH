"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import {
  GEOMAGNETIC_POLE_LAT_DEG,
  GEOMAGNETIC_POLE_LON_DEG,
  type OvationGrid,
} from "@/lib/aurora";
import { AURORA_ACCENT } from "./auroraUi";

/**
 * Earth with NOAA's modelled auroral oval on it.
 *
 * The oval is the OVATION Prime grid, drawn as one THREE.Points cloud: every
 * grid cell with a non-zero probability, coloured green through to red as the
 * probability rises, and lifted to the real emission altitude rather than laid
 * flat on the ground. At 110 km on a globe of radius 1 that is a lift of 0.017,
 * which is small but it is the honest place to put it and it stops the oval
 * z-fighting with the surface.
 *
 * The geomagnetic pole is marked, because it is the whole point of the tab: it
 * sits in the Canadian Arctic, well away from the top of the globe, and the
 * oval is a ring around IT rather than around the geographic pole. Spin the
 * globe and that is immediately obvious.
 */

const R = 1;
const EMISSION_LIFT = 1 + 110 / 6371;

/** Same lat/lon convention as every other globe tab in this app. */
function latLonToVec(lat: number, lon: number, radius = R): THREE.Vector3 {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const cl = Math.cos(la);
  return new THREE.Vector3(
    radius * cl * Math.cos(lo),
    radius * Math.sin(la),
    -radius * cl * Math.sin(lo)
  );
}

function Earth() {
  const map = useLoader(THREE.TextureLoader, "/textures/earth-night-black-marble.jpg");
  return (
    <mesh>
      <sphereGeometry args={[R, 96, 72]} />
      {/*
        The NIGHT map, not the day one. Aurora is a night phenomenon and the
        city lights give an immediate sense of who is underneath the oval.
      */}
      <meshBasicMaterial map={map} color="#8f9bb3" />
    </mesh>
  );
}

/** The modelled oval: one point per active grid cell. */
function OvalPoints({ grid }: { grid: OvationGrid }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];
    const c = new THREE.Color();

    // The grid is [lon 0..359][lat -90..90]. Most of it is zero, so we only
    // build geometry for the cells that carry a probability.
    for (let lon = 0; lon < 360; lon++) {
      for (let ai = 0; ai < 181; ai++) {
        const p = grid.probability[lon * 181 + ai];
        if (p <= 0) continue;
        const lat = ai - 90;
        const v = latLonToVec(lat, lon > 180 ? lon - 360 : lon, EMISSION_LIFT);
        positions.push(v.x, v.y, v.z);

        // green -> yellow -> red as probability climbs
        const t = Math.min(1, p / 60);
        if (t < 0.5) c.setRGB(0.15 + 0.5 * t, 0.75 + 0.35 * t, 0.45);
        else c.setRGB(0.4 + 1.2 * (t - 0.5), 0.92 - 0.7 * (t - 0.5), 0.45 - 0.3 * (t - 0.5));
        const a = 0.25 + 0.75 * t;
        colors.push(c.r * a, c.g * a, c.b * a);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }, [grid]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        vertexColors
        size={0.02}
        sizeAttenuation
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Where the observer is, and where the geomagnetic pole is. */
function Markers({
  observer,
}: {
  observer: { latDeg: number; lonDeg: number } | null;
}) {
  return (
    <group>
      {/* the geomagnetic pole: the centre the oval actually rings */}
      <mesh position={latLonToVec(GEOMAGNETIC_POLE_LAT_DEG, GEOMAGNETIC_POLE_LON_DEG, R * 1.01)}>
        <sphereGeometry args={[0.018, 16, 12]} />
        <meshBasicMaterial color="#8fd3ff" />
      </mesh>
      {observer && (
        <mesh position={latLonToVec(observer.latDeg, observer.lonDeg, R * 1.01)}>
          <sphereGeometry args={[0.016, 16, 12]} />
          <meshBasicMaterial color={AURORA_ACCENT} />
        </mesh>
      )}
    </group>
  );
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  useFrame(({ scene }, delta) => {
    if (enabled) scene.rotation.y += delta * 0.03;
  });
  return null;
}

export default function AuroraGlobe({
  grid,
  observer,
  autoRotate,
}: {
  grid: OvationGrid | null;
  observer: { latDeg: number; lonDeg: number } | null;
  autoRotate: boolean;
}) {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0.6, 1.6, 2.4], fov: 42, near: 0.1, far: 40 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#04060d")}
    >
      <ambientLight intensity={1.6} />
      <Suspense fallback={null}>
        <Earth />
        {grid && <OvalPoints grid={grid} />}
        <Markers observer={observer} />
      </Suspense>
      <AutoRotate enabled={autoRotate} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={1.5}
        maxDistance={6}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
