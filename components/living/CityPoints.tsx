"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { City } from "@/lib/cities";
import { latLonToVector3Into } from "@/lib/geo";
import { sunDirection } from "@/lib/solar";
import { activityIndex } from "@/lib/activity";
import { GLOBE_RADIUS } from "@/components/globe/EarthGlobe";

/**
 * All cities in ONE THREE.Points draw call (globe-3d-visualization skill:
 * never one mesh per city). Size scales with population; the REAL solar
 * terminator (lib/solar.ts sunDirection) makes night-side cities glow while
 * day-side ones stay subtle; pulse rate/intensity comes from the simulated
 * activity index (lib/activity.ts: clearly labeled a simulation in the HUD).
 */

const ALTITUDE = GLOBE_RADIUS * 1.004;
/** recompute the (slow-moving) activity attribute every few seconds */
const ACTIVITY_REFRESH_MS = 5_000;
const SUN_REFRESH_MS = 500;

const VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aActivity;
  uniform vec3 uSunDir;
  uniform float uTime;
  uniform float uPixelScale;
  varying float vIntensity;

  void main() {
    vec3 n = normalize(position);
    // sine of solar elevation at the city (mesh is unrotated: object space
    // == Earth-fixed). night: 1 in deep night, 0 in daylight, twilight ramp.
    float night = smoothstep(0.09, -0.18, dot(n, normalize(uSunDir)));
    // simulated activity drives pulse speed and depth
    float pulse = 0.78 + 0.22 * sin(uTime * (1.4 + 2.2 * aActivity) + aPhase);
    float glow = 0.25 + 0.75 * aActivity * pulse;
    // day side: faint presence; night side: the "living" lights
    vIntensity = mix(0.10, glow, night);

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = aSize * (0.85 + 0.5 * night * aActivity * pulse);
    gl_PointSize = size * uPixelScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vIntensity;

  void main() {
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float falloff = pow(1.0 - r, 1.8);
    float core = smoothstep(0.45, 0.0, r);
    // warm sodium-lamp amber with a whiter core: matches the solar accent
    vec3 warm = mix(vec3(1.0, 0.62, 0.28), vec3(1.0, 0.92, 0.75), core);
    gl_FragColor = vec4(warm * vIntensity * falloff, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function CityPoints({ cities }: { cities: City[] }) {
  const count = cities.length;

  const { geometry, lons, activityAttr } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const activities = new Float32Array(count);
    const cityLons = new Float32Array(count);

    // population -> point size, log-scaled across the catalog range
    // (~390K .. ~36M); sqrt/log keeps megacities from dwarfing everything.
    const logMin = Math.log10(300_000);
    const logMax = Math.log10(40_000_000);
    for (let i = 0; i < count; i++) {
      const c = cities[i];
      latLonToVector3Into(c.lat, c.lon, ALTITUDE, positions, i * 3);
      const t = Math.min(
        Math.max((Math.log10(Math.max(c.pop, 1)) - logMin) / (logMax - logMin), 0),
        1
      );
      sizes[i] = 0.008 + 0.022 * t;
      phases[i] = Math.random() * Math.PI * 2;
      cityLons[i] = c.lon;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    const actAttr = new THREE.BufferAttribute(activities, 1);
    actAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aActivity", actAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), ALTITUDE);
    return { geometry: geo, lons: cityLons, activityAttr: actAttr };
  }, [cities, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSunDir: { value: new THREE.Vector3(1, 0, 0) },
          uTime: { value: 0 },
          uPixelScale: { value: 1000 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false, // additive glow shouldn't occlude
        // depthTest stays on: the globe hides far-side cities
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // low-frequency refresh bookkeeping (no per-frame allocations)
  const last = useRef({ sunAt: 0, activityAt: 0 });

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;

    const cam = state.camera as THREE.PerspectiveCamera;
    material.uniforms.uPixelScale.value =
      (state.size.height * state.viewport.dpr) /
      (2 * Math.tan((cam.fov * Math.PI) / 360));

    const now = Date.now();
    if (now - last.current.sunAt > SUN_REFRESH_MS) {
      last.current.sunAt = now;
      const [x, y, z] = sunDirection(new Date(now));
      (material.uniforms.uSunDir.value as THREE.Vector3).set(x, y, z);
    }
    if (now - last.current.activityAt > ACTIVITY_REFRESH_MS) {
      last.current.activityAt = now;
      const arr = activityAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i] = activityIndex(lons[i], now);
      }
      activityAttr.needsUpdate = true;
    }
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      // hover/click resolve against the globe surface, never the points
      raycast={() => null}
    />
  );
}
