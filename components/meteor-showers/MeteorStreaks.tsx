"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { RADIANT_SPHERE_RADIUS } from "./constants";

/**
 * ILLUSTRATIVE meteor streaks for ONE shower, emanating FROM its radiant. The
 * geometry is real: meteoroids in a stream travel on parallel paths, so by
 * perspective their trails all appear to diverge from a single point on the sky,
 * the radiant. We draw that honestly: each streak starts near the radiant
 * direction and lengthens OUTWARD along a great circle away from it, then fades
 * and respawns. The particles themselves are drawn (not observed): clearly
 * labelled illustrative in the HUD.
 *
 * Performance: everything is preallocated ONCE (positions + per-vertex alpha +
 * per-streak scalar state). The per-frame path only writes into those Float32
 * buffers and flips one needsUpdate flag: no allocation in the loop, mirroring
 * the wind-particle / star-field budgets elsewhere in the app.
 */

const RADIUS = RADIANT_SPHERE_RADIUS;

const VERTEX = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    if (vAlpha <= 0.002) discard;
    gl_FragColor = vec4(uColor * vAlpha, 1.0);
    #include <colorspace_fragment>
  }
`;

interface StreakState {
  phi: Float32Array; // azimuth around the radiant (rad)
  theta: Float32Array; // current head angular distance from radiant (rad)
  speed: Float32Array; // angular speed (rad/s)
  len: Float32Array; // streak angular length (rad)
  maxTheta: Float32Array; // death distance (rad)
  base: Float32Array; // per-streak brightness 0..1
}

function respawn(st: StreakState, i: number): void {
  st.phi[i] = Math.random() * Math.PI * 2;
  st.theta[i] = 0.02 + Math.random() * 0.06;
  st.speed[i] = 0.5 + Math.random() * 1.3;
  st.len[i] = 0.12 + Math.random() * 0.22;
  st.maxTheta[i] = 0.7 + Math.random() * 0.8;
  st.base[i] = 0.5 + Math.random() * 0.5;
}

export default function MeteorStreaks({
  radiant,
  color,
  count = 30,
  intensity = 1,
}: {
  radiant: readonly [number, number, number];
  color: string;
  count?: number;
  intensity?: number;
}) {
  // Orthonormal basis {e1, e2} perpendicular to the radiant direction, so a point
  // at angular distance θ and azimuth φ is  cosθ·r + sinθ·(cosφ·e1 + sinφ·e2).
  const basis = useMemo(() => {
    const r = new THREE.Vector3(radiant[0], radiant[1], radiant[2]).normalize();
    const a =
      Math.abs(r.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
    const e1 = new THREE.Vector3().crossVectors(a, r).normalize();
    const e2 = new THREE.Vector3().crossVectors(r, e1).normalize();
    return { r, e1, e2 };
  }, [radiant]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 2 * 3);
    const alphas = new Float32Array(count * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), RADIUS);
    return geo;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(color) } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    [color]
  );

  const state = useMemo<StreakState>(() => {
    const st: StreakState = {
      phi: new Float32Array(count),
      theta: new Float32Array(count),
      speed: new Float32Array(count),
      len: new Float32Array(count),
      maxTheta: new Float32Array(count),
      base: new Float32Array(count),
    };
    for (let i = 0; i < count; i++) {
      respawn(st, i);
      // stagger initial phase so streaks don't all burst from the radiant at once
      st.theta[i] = Math.random() * st.maxTheta[i];
    }
    return st;
  }, [count]);

  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // clamp so a tab-restore frame can't jump
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const alp = geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const posArr = pos.array as Float32Array;
    const alpArr = alp.array as Float32Array;
    const { r, e1, e2 } = basis;
    const strength = intensityRef.current;

    for (let i = 0; i < count; i++) {
      state.theta[i] += state.speed[i] * dt;
      if (state.theta[i] > state.maxTheta[i]) respawn(state, i);

      const th = state.theta[i];
      const thTail = Math.max(0.0, th - state.len[i]);
      const phi = state.phi[i];
      const cphi = Math.cos(phi);
      const sphi = Math.sin(phi);
      // perpendicular direction p = cosφ·e1 + sinφ·e2 (unit)
      const px = cphi * e1.x + sphi * e2.x;
      const py = cphi * e1.y + sphi * e2.y;
      const pz = cphi * e1.z + sphi * e2.z;

      // head vertex (leading, further from radiant)
      const ch = Math.cos(th);
      const sh = Math.sin(th);
      const hx = (ch * r.x + sh * px) * RADIUS;
      const hy = (ch * r.y + sh * py) * RADIUS;
      const hz = (ch * r.z + sh * pz) * RADIUS;
      // tail vertex (trailing, nearer the radiant)
      const ct = Math.cos(thTail);
      const stt = Math.sin(thTail);
      const tx = (ct * r.x + stt * px) * RADIUS;
      const ty = (ct * r.y + stt * py) * RADIUS;
      const tz = (ct * r.z + stt * pz) * RADIUS;

      const o = i * 6;
      posArr[o] = tx;
      posArr[o + 1] = ty;
      posArr[o + 2] = tz;
      posArr[o + 3] = hx;
      posArr[o + 4] = hy;
      posArr[o + 5] = hz;

      // fade in from the radiant, fade out toward the death distance
      const fadeIn = Math.min(1, th / 0.15);
      const fadeOut = Math.min(1, (state.maxTheta[i] - th) / 0.25);
      const life = Math.max(0, Math.min(1, fadeIn * fadeOut));
      const headA = life * state.base[i] * strength;
      const a2 = i * 2;
      alpArr[a2] = headA * 0.12; // dim tail
      alpArr[a2 + 1] = headA; // bright head
    }
    pos.needsUpdate = true;
    alp.needsUpdate = true;
  });

  return (
    <lineSegments
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={20}
      raycast={() => null}
    />
  );
}
