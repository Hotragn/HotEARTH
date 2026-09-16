"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { SunChannel } from "@/lib/sun-facts";

interface SunDiskProps {
  channel: SunChannel;
  textures: Record<string, THREE.Texture | null>;
}

/** Soft grayscale mask that trims the square image's black corners to a disk. */
function makeCornerMask(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  // radius reaches the corner (√2·half); opaque out to the mid-edge (the full
  // solar disk fills the frame), then fades through the black corners only.
  const g = ctx.createRadialGradient(c, c, 0, c, c, c * Math.SQRT2);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.707, "#ffffff"); // mid-edge: keep the whole disk
  g.addColorStop(0.9, "#000000");
  g.addColorStop(1, "#000000");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Radial halo hugging the limb, tinted per channel and added over the abyss. */
function makeCoronaGlow(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0.0, "rgba(255,255,255,0)");
  g.addColorStop(0.28, "rgba(255,255,255,0.04)");
  g.addColorStop(0.36, "rgba(255,255,255,0.30)"); // limb ring
  g.addColorStop(0.5, "rgba(255,255,255,0.05)");
  g.addColorStop(0.72, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/**
 * The Sun rendered honestly: the real NASA/SDO full-disk image on a
 * camera-facing quad (these are SQUARE photos of the Earth-facing side, not
 * wrapped maps), with a subtle additive limb glow tinted to the channel's
 * false-colour palette. No rotation, a single snapshot does not rotate, so
 * the presentation never implies motion the data does not have.
 *
 * Materials + mask/glow canvases are built once and swapped through uniforms;
 * nothing is allocated per frame. Everything is disposed on unmount (the loaded
 * channel textures are owned/disposed by useSunTextures).
 */
export default function SunDisk({ channel, textures }: SunDiskProps) {
  // 1×1 warm fallback so the sampler is always bound before a channel resolves.
  const blank = useMemo(() => {
    const tex = new THREE.DataTexture(
      new Uint8Array([255, 180, 90, 255]),
      1,
      1,
      THREE.RGBAFormat,
    );
    tex.needsUpdate = true;
    return tex;
  }, []);

  const cornerMask = useMemo(makeCornerMask, []);
  const coronaGlow = useMemo(makeCoronaGlow, []);

  const diskMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: blank,
        alphaMap: cornerMask,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [blank, cornerMask],
  );

  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: coronaGlow,
        color: new THREE.Color(channel.glow),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    // color swapped in place below; built once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coronaGlow],
  );

  useEffect(() => {
    return () => {
      diskMaterial.dispose();
      glowMaterial.dispose();
      cornerMask.dispose();
      coronaGlow.dispose();
      blank.dispose();
    };
  }, [diskMaterial, glowMaterial, cornerMask, coronaGlow, blank]);

  // Swap the disk image + glow tint in place when the channel or its texture
  // changes: never rebuild the material.
  const activeTex = textures[channel.id] ?? null;
  useEffect(() => {
    diskMaterial.map = activeTex ?? blank;
    diskMaterial.needsUpdate = true;
    glowMaterial.color.set(channel.glow);
  }, [diskMaterial, glowMaterial, activeTex, channel.glow, blank]);

  return (
    <group>
      <mesh material={glowMaterial} position={[0, 0, -0.02]} renderOrder={0}>
        <planeGeometry args={[3.1, 3.1]} />
      </mesh>
      <mesh material={diskMaterial} renderOrder={1}>
        <planeGeometry args={[2, 2]} />
      </mesh>
    </group>
  );
}
