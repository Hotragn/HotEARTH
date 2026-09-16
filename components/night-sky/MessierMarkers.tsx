"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  messierStyle,
  raDecToVector3,
  type MessierObject,
} from "@/lib/star-facts";
import { MESSIER_RADIUS } from "./constants";

/**
 * Messier deep-sky objects (110) as hollow ring glyphs, coloured by type:
 * galaxy / nebula / star cluster / other. Positions and types are MEASURED
 * OpenNGC values (J2000). One THREE.Points draw call; the same GPU horizon-hide
 * as the stars keeps below-horizon objects out of the local-sky view. A curated
 * set of famous objects carries an always-on M# label; the rest label on
 * hover/click via the scene's detail card.
 */

/** Objects that get an always-on label (the crowd-pleasers), by Messier number. */
const FAMOUS = new Set([1, 8, 13, 16, 27, 31, 42, 44, 45, 51, 57, 63, 81, 104]);

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  uniform float uDpr;
  uniform float uSizeMul;
  uniform float uLocalMode;
  uniform vec3 uUpRow;
  varying vec3 vColor;
  varying float vHidden;

  void main() {
    vColor = aColor;
    float up = dot(uUpRow, normalize(position));
    float below = step(up, 0.0);
    vHidden = uLocalMode * below;
    gl_PointSize = 11.0 * uDpr * uSizeMul * (1.0 - vHidden);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vHidden;

  void main() {
    if (vHidden > 0.5) discard;
    vec2 d = gl_PointCoord - vec2(0.5);
    float r = length(d) * 2.0;
    // hollow ring glyph + faint centre dot, so DSOs read distinct from stars
    float ring = smoothstep(0.62, 0.78, r) * (1.0 - smoothstep(0.9, 1.0, r));
    float dot0 = 1.0 - smoothstep(0.0, 0.22, r);
    float a = clamp(ring + 0.55 * dot0, 0.0, 1.0);
    if (a <= 0.02) discard;
    gl_FragColor = vec4(vColor, a * 0.9);
    #include <colorspace_fragment>
  }
`;

export default function MessierMarkers({
  objects,
  localMode,
  upRow,
}: {
  objects: MessierObject[];
  localMode: boolean;
  upRow: readonly [number, number, number];
}) {
  const count = objects.length;

  const { geometry, labels } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();
    const labelList: {
      key: string;
      text: string;
      color: string;
      pos: [number, number, number];
    }[] = [];

    for (let i = 0; i < count; i++) {
      const o = objects[i];
      const [x, y, z] = raDecToVector3(o.ra, o.dec, MESSIER_RADIUS);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const style = messierStyle(o);
      color.set(style.color);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      if (FAMOUS.has(o.m)) {
        labelList.push({
          key: `M${o.m}`,
          text: `M${o.m}`,
          color: style.color,
          pos: [x, y, z],
        });
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MESSIER_RADIUS);
    return { geometry: geo, labels: labelList };
  }, [objects, count]);

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
        depthTest: false,
        depthWrite: false,
      }),
    []
  );

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
    <group>
      <points
        geometry={geometry}
        material={material}
        frustumCulled={false}
        renderOrder={8}
        raycast={() => null}
      />
      {labels.map((l) => (
        <Html
          key={l.key}
          position={l.pos}
          center
          zIndexRange={[7, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div
            style={{
              whiteSpace: "nowrap",
              transform: "translateY(-12px)",
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 9,
              letterSpacing: "0.08em",
              color: l.color,
              opacity: 0.8,
            }}
          >
            {l.text}
          </div>
        </Html>
      ))}
    </group>
  );
}
