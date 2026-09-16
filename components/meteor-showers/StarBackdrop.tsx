"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * A dim, static backdrop of real bright stars (naked-eye subset of the HYG
 * catalogue, same J2000 frame as the radiants) drawn in ONE THREE.Points call so
 * the radiants sit against recognisable sky for context. Purely decorative: not
 * clickable, no per-frame work. Positions are precomputed by
 * lib/meteor-facts.parseStarBackdrop; here we only build/dispose the buffers.
 */
export default function StarBackdrop({ positions }: { positions: Float32Array }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: new THREE.Color("#9aa6bd"),
        size: 1.6,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        depthTest: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <points
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={0}
      raycast={() => null}
    />
  );
}
