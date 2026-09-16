"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3Into } from "@/lib/geo";
import { sunDirection } from "@/lib/solar";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";
import {
  populationAtYear,
  type HistoricalCity,
} from "@/lib/chrono-cities";
import { yearToApproxDate } from "@/lib/chrono-clock";
import { CHRONO_CITY_FRAGMENT, CHRONO_CITY_VERTEX } from "./shaders";

/**
 * All historical cities in ONE THREE.Points draw call. Point size grows with
 * the interpolated population at the current simulated year: cities wink into
 * existence at their founding and swell as they grow. The REAL solar
 * terminator (lib/solar) makes night-side cities glow. Sizes are refreshed on
 * a low-frequency cadence (not every frame) with no per-frame allocations.
 */

const ALTITUDE = GLOBE_RADIUS * 1.004;
const SIZE_REFRESH_MS = 250; // resize cities a few times a second, not per-frame
const SUN_REFRESH_MS = 400;

// log-scaled size mapping across the historical population range (~300 .. 40M)
const LOG_MIN = Math.log10(2_000);
const LOG_MAX = Math.log10(40_000_000);

function sizeForPop(pop: number): number {
  if (pop <= 0) return 0;
  const t = Math.min(
    Math.max((Math.log10(Math.max(pop, 1)) - LOG_MIN) / (LOG_MAX - LOG_MIN), 0),
    1
  );
  return 0.006 + 0.03 * t;
}

interface ChronoCityPointsProps {
  cities: HistoricalCity[];
  /** current simulated decimal year, read per-frame from a ref */
  simYearRef: React.RefObject<number>;
}

export default function ChronoCityPoints({
  cities,
  simYearRef,
}: ChronoCityPointsProps) {
  const count = cities.length;

  const { geometry, sizeAttr } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const c = cities[i];
      latLonToVector3Into(c.lat, c.lon, ALTITUDE, positions, i * 3);
      sizes[i] = 0; // hidden until the simulated year reaches founding
      phases[i] = Math.random() * Math.PI * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    sizeAttribute.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aSize", sizeAttribute);
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), ALTITUDE);
    return { geometry: geo, sizeAttr: sizeAttribute };
  }, [cities, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(1, 0, 0) },
          uTime: { value: 0 },
          uPixelScale: { value: 1000 },
        },
        vertexShader: CHRONO_CITY_VERTEX,
        fragmentShader: CHRONO_CITY_FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const last = useRef({ sunAt: 0, sizeAt: 0, year: Number.NaN });

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    const cam = state.camera as THREE.PerspectiveCamera;
    material.uniforms.uPixelScale.value =
      (state.size.height * state.viewport.dpr) /
      (2 * Math.tan((cam.fov * Math.PI) / 360));

    const now = Date.now();
    const year = simYearRef.current ?? 2026;

    if (now - last.current.sunAt > SUN_REFRESH_MS) {
      last.current.sunAt = now;
      const [x, y, z] = sunDirection(yearToApproxDate(year));
      (material.uniforms.uSunDir.value as THREE.Vector3).set(x, y, z);
    }

    // recompute per-year sizes only when the year moved or on the cadence
    if (
      now - last.current.sizeAt > SIZE_REFRESH_MS ||
      Math.abs(year - last.current.year) > 0.5
    ) {
      last.current.sizeAt = now;
      last.current.year = year;
      const arr = sizeAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i] = sizeForPop(populationAtYear(cities[i], year));
      }
      sizeAttr.needsUpdate = true;
    }
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      raycast={() => null}
    />
  );
}
