"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AppearanceKind } from "@/lib/small-body-facts";

/** Smooth fade curve for value noise (matches the GLSL 3·t²−2·t³). */
function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Hash of an integer lattice point, seeded: deterministic pseudo-random [0,1). */
function hash(xi: number, yi: number, zi: number, seed: number): number {
  const h = Math.sin(xi * 127.1 + yi * 311.7 + zi * 74.7 + seed * 13.13) * 43758.5453;
  return h - Math.floor(h);
}

/** Trilinearly-interpolated 3D value noise in [0,1] (smooth lumps, no spikes). */
function vnoise(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const zf = fade(z - zi);
  const c000 = hash(xi, yi, zi, seed);
  const c100 = hash(xi + 1, yi, zi, seed);
  const c010 = hash(xi, yi + 1, zi, seed);
  const c110 = hash(xi + 1, yi + 1, zi, seed);
  const c001 = hash(xi, yi, zi + 1, seed);
  const c101 = hash(xi + 1, yi, zi + 1, seed);
  const c011 = hash(xi, yi + 1, zi + 1, seed);
  const c111 = hash(xi + 1, yi + 1, zi + 1, seed);
  const x00 = c000 + (c100 - c000) * xf;
  const x10 = c010 + (c110 - c010) * xf;
  const x01 = c001 + (c101 - c001) * xf;
  const x11 = c011 + (c111 - c011) * xf;
  const y0 = x00 + (x10 - x00) * yf;
  const y1 = x01 + (x11 - x01) * yf;
  return y0 + (y1 - y0) * zf;
}

/** Two-octave fractal noise centred on 0 (range roughly ±1). */
function fbm(x: number, y: number, z: number, seed: number): number {
  const a = vnoise(x * 1.6, y * 1.6, z * 1.6, seed);
  const b = vnoise(x * 3.7, y * 3.7, z * 3.7, seed + 7.3);
  return (0.7 * a + 0.3 * b - 0.5) * 2;
}

/** Numeric seed from a body's id, so its lump shape is stable across renders. */
function seedFrom(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return h * 0.00061;
}

interface SmallBodySphereProps {
  appearance: AppearanceKind;
  /** wrapped map texture (map bodies only), else null → procedural lump */
  texture: THREE.Texture | null;
  /** stable id (designation/name) → deterministic lump shape */
  seedId: string;
  /** base tint for the lump [0..1] rgb */
  tint: [number, number, number];
}

/**
 * The single detail body for the object view. Two honest rendering paths:
 *   • MAP (Eros / Vesta / Bennu), the real equirectangular mosaic wrapped on a
 *     SLIGHTLY-displaced sphere, smooth-shaded so the imagery reads. Labelled
 *     "real imagery … shape approximated" in the HUD/badge.
 *   • LUMP (everything else, incl. the photo bodies whose single-view frames are
 *     shown flat in the panel): a strongly-displaced, flat-shaded irregular rock
 *     tinted from the body's albedo. Purely illustrative; labelled as such.
 *
 * The geometry is displaced on the CPU with seeded value noise (normals
 * recomputed) so it is a genuine irregular shape, built once and disposed on
 * unmount. The body tumbles slowly (mesh rotation) so all faces come into the
 * fixed sunlight; nothing allocates per frame.
 */
export default function SmallBodySphere({
  appearance,
  texture,
  seedId,
  tint,
}: SmallBodySphereProps) {
  const isMap = appearance === "map" && texture !== null;

  const geometry = useMemo(() => {
    const seed = seedFrom(seedId);
    const disp = isMap ? 0.06 : 0.26;
    const geo = isMap
      ? new THREE.SphereGeometry(1, 96, 64)
      : new THREE.IcosahedronGeometry(1, 4);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const len = v.length() || 1;
      const nx = v.x / len;
      const ny = v.y / len;
      const nz = v.z / len;
      const bump = fbm(nx, ny, nz, seed);
      const r = 1 + disp * bump;
      pos.setXYZ(i, nx * r, ny * r, nz * r);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [isMap, seedId]);

  const material = useMemo(() => {
    if (isMap) {
      return new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        roughness: 1,
        metalness: 0,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(tint[0], tint[1], tint[2]),
      roughness: 1,
      metalness: 0,
      flatShading: true,
    });
  }, [isMap, texture, tint]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.28;
      ref.current.rotation.x = 0.28;
    }
  });

  return <mesh ref={ref} geometry={geometry} material={material} />;
}
