"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  bvToColor,
  magnitudeToOpacity,
  magnitudeToSize,
  raDecToVector3,
  type Star,
} from "@/lib/star-facts";
import { STAR_SPHERE_RADIUS } from "./constants";

/**
 * ALL ~9,029 catalogue stars in ONE THREE.Points draw call. Per-star direction
 * comes from raDecToVector3 (real RA/Dec, J2000), colour from the physical
 * B-V → black-body mapping (bvToColor), size + opacity from apparent magnitude.
 * Everything is baked into Float32 attributes once; the per-frame path only pokes
 * two scalar uniforms (dpr, size multiplier): no allocation.
 *
 * The "sky from your location" mode is handled entirely on the GPU: the parent
 * group is rotated into the local horizon frame, and this shader hides any star
 * below the horizon by evaluating its altitude from the observer's up-row
 * (uUpRow · direction) and collapsing its point size to zero. So scrubbing the
 * clock never touches the CPU-side geometry.
 */
const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aOpacity;
  uniform float uDpr;
  uniform float uSizeMul;
  uniform float uLocalMode; // 0 = equatorial sky, 1 = local horizon
  uniform vec3 uUpRow;      // equatorial-direction -> altitude sine, for the observer
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = aColor;
    float up = dot(uUpRow, normalize(position));   // sin(altitude) in local mode
    float below = step(up, 0.0);                    // 1 when below the horizon
    float hidden = uLocalMode * below;
    vOpacity = aOpacity * (1.0 - hidden);
    gl_PointSize = aSize * uDpr * uSizeMul * (1.0 - hidden);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    if (vOpacity <= 0.002) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float core = smoothstep(1.0, 0.0, r);
    float glow = pow(core, 1.7);
    // whiter core over the true colour, so bright stars read crisp
    vec3 col = mix(vColor, vec3(1.0), 0.35 * core);
    gl_FragColor = vec4(col * glow * vOpacity, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function StarField({
  stars,
  localMode,
  upRow,
}: {
  stars: Star[];
  localMode: boolean;
  upRow: readonly [number, number, number];
}) {
  const count = stars.length;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const color = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const s = stars[i];
      const [x, y, z] = raDecToVector3(s.ra, s.dec, STAR_SPHERE_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      color.set(bvToColor(s.ci)); // physical colour from the B-V index
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // pixel size + opacity from apparent magnitude (brighter = bigger/opaquer)
      sizes[i] = magnitudeToSize(s.mag, { minSize: 1.3, maxSize: 6.2 }) ?? 1.3;
      opacities[i] = magnitudeToOpacity(s.mag, { minOpacity: 0.4, maxOpacity: 1 }) ?? 0.4;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aOpacity", new THREE.BufferAttribute(opacities, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), STAR_SPHERE_RADIUS);
    return geo;
  }, [stars, count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uDpr: { value: 1 },
          uSizeMul: { value: 1 },
          uLocalMode: { value: 0 },
          uUpRow: { value: new THREE.Vector3(0, 1, 0) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

  // Mode / observer changes are just two uniform pokes (no geometry rebuild).
  useEffect(() => {
    material.uniforms.uLocalMode.value = localMode ? 1 : 0;
    (material.uniforms.uUpRow.value as THREE.Vector3).set(
      upRow[0],
      upRow[1],
      upRow[2]
    );
  }, [material, localMode, upRow]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((state) => {
    material.uniforms.uDpr.value = state.viewport.dpr;
  });

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={10}
      // stars are picked manually against the sky dome, never raycast here
      raycast={() => null}
    />
  );
}
