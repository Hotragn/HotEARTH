"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  eclipticPoleAxis,
  precessionAngle,
} from "@/lib/precession";

/**
 * Star field that precesses. The whole sky sits in a group rotated about the
 * (fixed) ecliptic-pole axis by the REAL axial-precession angle for the current
 * simulated year (lib/precession): a full turn every ~25,772 years. This is
 * the honest "even the sky changes" touch: play the clock across millennia and
 * the celestial pole (and the visible star pattern) rotates exactly as physics
 * says it should. The rotation is set per-frame from a ref (no re-render), with
 * no allocations: the axis and quaternion are reused.
 */
export default function PrecessionStars({
  simYearRef,
}: {
  simYearRef: React.RefObject<number>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // reused: the fixed ecliptic-pole axis and a scratch quaternion
  const axis = useMemo(() => {
    const [x, y, z] = eclipticPoleAxis();
    return new THREE.Vector3(x, y, z);
  }, []);

  const lastAngle = useRef(Number.NaN);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const year = simYearRef.current ?? 2026;
    const angle = precessionAngle(year);
    // only touch the transform when the angle actually moved
    if (angle !== lastAngle.current) {
      lastAngle.current = angle;
      group.quaternion.setFromAxisAngle(axis, angle);
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={80}
        depth={40}
        count={4500}
        factor={2.8}
        saturation={0}
        fade
        speed={0.15}
      />
    </group>
  );
}
