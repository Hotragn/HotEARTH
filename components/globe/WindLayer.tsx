"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLonToVector3Into } from "@/lib/geo";
import { advectLatLon, sampleWind, type WindField } from "@/lib/wind";
import { GLOBE_RADIUS } from "./EarthGlobe";

/**
 * Global wind particle layer: the earth.nullschool look on a sphere.
 *
 * Technique: one indexed THREE.LineSegments holding short per-particle
 * trails. Each particle keeps TRAIL positions in a flat Float32Array; per
 * frame the trail is shifted back (copyWithin, no allocation), the head is
 * advected by bilinear-interpolated GFS u/v (lib/wind.ts, with cos(lat)
 * correction and antimeridian wrap), and per-vertex colors fade head -> tail
 * with additive blending. depthTest keeps far-side particles hidden behind
 * the globe. All buffers are preallocated; the sim loop allocates nothing.
 */

const PARTICLE_COUNT = 9000;
/** trail vertices per particle (TRAIL - 1 line segments) */
const TRAIL = 8;
/** slightly above the surface to avoid z-fighting with the globe mesh */
const ALTITUDE = GLOBE_RADIUS * 1.006;
/**
 * Simulated seconds of wind advection per real second. Real 10 m/s wind
 * moves ~0.5 m per frame, invisible at globe scale, so, like the classic
 * earth.nullschool animation, time is exaggerated: 55,000x ≈ 15 h of wind
 * per wall-clock second, i.e. ~0.08°/frame at 10 m/s.
 */
const SIM_SCALE = 55_000;
/** particle lifetime bounds, seconds */
const AGE_MIN = 3;
const AGE_SPAN = 5;
/** respawn when nearly calm (m/s) or too close to a pole (deg) */
const MIN_SPEED = 0.2;
const MAX_LAT = 85;
/** wind speed (m/s) mapped to full brightness */
const SPEED_FULL = 24;

/** dim slow -> bright amber-white fast (matches the solar accent) */
const COLOR_SLOW = { r: 0.16, g: 0.13, b: 0.1 };
const COLOR_FAST = { r: 1.0, g: 0.82, b: 0.55 };

interface WindLayerProps {
  field: WindField;
}

interface SimState {
  lats: Float32Array;
  lons: Float32Array;
  ages: Float32Array;
  maxAges: Float32Array;
  /** trail positions, particle-major: [p][t][xyz], t 0 = head */
  positions: Float32Array;
  colors: Float32Array;
  /** brightness ramp per trail slot, head -> tail */
  ramp: Float32Array;
  uv: Float32Array;
  latLon: Float32Array;
}

function spawn(state: SimState, p: number, scatterAge: boolean): void {
  // uniform on the sphere: lat = asin(2u - 1)
  const lat = (Math.asin(2 * Math.random() - 1) * 180) / Math.PI;
  const lon = Math.random() * 360 - 180;
  state.lats[p] = lat;
  state.lons[p] = lon;
  state.ages[p] = scatterAge ? Math.random() * AGE_MIN : 0;
  state.maxAges[p] = AGE_MIN + Math.random() * AGE_SPAN;
  // collapse the whole trail onto the spawn point: no streak across the globe
  const base = p * TRAIL * 3;
  latLonToVector3Into(lat, lon, ALTITUDE, state.positions, base);
  for (let t = 1; t < TRAIL; t++) {
    state.positions[base + t * 3] = state.positions[base];
    state.positions[base + t * 3 + 1] = state.positions[base + 1];
    state.positions[base + t * 3 + 2] = state.positions[base + 2];
  }
}

export default function WindLayer({ field }: WindLayerProps) {
  const state = useMemo<SimState>(() => {
    const s: SimState = {
      lats: new Float32Array(PARTICLE_COUNT),
      lons: new Float32Array(PARTICLE_COUNT),
      ages: new Float32Array(PARTICLE_COUNT),
      maxAges: new Float32Array(PARTICLE_COUNT),
      positions: new Float32Array(PARTICLE_COUNT * TRAIL * 3),
      colors: new Float32Array(PARTICLE_COUNT * TRAIL * 3),
      ramp: new Float32Array(TRAIL),
      uv: new Float32Array(2),
      latLon: new Float32Array(2),
    };
    for (let t = 0; t < TRAIL; t++) {
      // quadratic fade toward the tail reads as a comet streak
      const f = 1 - t / (TRAIL - 1);
      s.ramp[t] = f * f;
    }
    for (let p = 0; p < PARTICLE_COUNT; p++) spawn(s, p, true);
    return s;
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(state.positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    const colAttr = new THREE.BufferAttribute(state.colors, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", posAttr);
    geo.setAttribute("color", colAttr);
    // static index: segments between consecutive trail slots of each particle
    const index = new Uint32Array(PARTICLE_COUNT * (TRAIL - 1) * 2);
    let w = 0;
    for (let p = 0; p < PARTICLE_COUNT; p++) {
      const v0 = p * TRAIL;
      for (let t = 0; t < TRAIL - 1; t++) {
        index[w++] = v0 + t;
        index[w++] = v0 + t + 1;
      }
    }
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    // the layer wraps the whole globe; skip per-frame bounds recomputation
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), ALTITUDE * 1.1);
    return geo;
  }, [state]);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // don't self-occlude the additive trails
        // depthTest stays on: the globe mesh hides far-side particles
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30); // clamp tab-switch time jumps
    const simSeconds = dt * SIM_SCALE;
    const { lats, lons, ages, maxAges, positions, colors, ramp, uv, latLon } =
      state;

    for (let p = 0; p < PARTICLE_COUNT; p++) {
      let lat = lats[p];
      let lon = lons[p];

      sampleWind(field, lat, lon, uv);
      const speed = Math.hypot(uv[0], uv[1]);
      ages[p] += dt;

      if (
        ages[p] > maxAges[p] ||
        speed < MIN_SPEED ||
        lat > MAX_LAT ||
        lat < -MAX_LAT
      ) {
        spawn(state, p, false);
        lat = lats[p];
        lon = lons[p];
      } else {
        advectLatLon(lat, lon, uv[0], uv[1], simSeconds, latLon);
        lat = latLon[0];
        lon = latLon[1];
        lats[p] = lat;
        lons[p] = lon;

        // shift trail back one slot (head lives at slot 0), write new head
        const base = p * TRAIL * 3;
        positions.copyWithin(base + 3, base, base + (TRAIL - 1) * 3);
        latLonToVector3Into(lat, lon, ALTITUDE, positions, base);
      }

      // speed -> color, faded along the trail
      let s = speed / SPEED_FULL;
      if (s > 1) s = 1;
      const r = COLOR_SLOW.r + (COLOR_FAST.r - COLOR_SLOW.r) * s;
      const g = COLOR_SLOW.g + (COLOR_FAST.g - COLOR_SLOW.g) * s;
      const b = COLOR_SLOW.b + (COLOR_FAST.b - COLOR_SLOW.b) * s;
      const cBase = p * TRAIL * 3;
      for (let t = 0; t < TRAIL; t++) {
        const f = ramp[t];
        colors[cBase + t * 3] = r * f;
        colors[cBase + t * 3 + 1] = g * f;
        colors[cBase + t * 3 + 2] = b * f;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      frustumCulled={false}
      // never intercept globe picking
      raycast={() => null}
    />
  );
}
