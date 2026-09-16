"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";
import type { SunChannel } from "@/lib/sun-facts";
import SunDisk from "./SunDisk";

interface SunCanvasProps {
  channel: SunChannel;
  textures: Record<string, THREE.Texture | null>;
}

/**
 * Full-viewport canvas for the Sun disk. The SDO image is a fixed snapshot, so
 * the camera does not orbit it (that would fake rotation the data lacks): only
 * zoom is enabled, treating the disk as an observation you can inspect closer.
 * Same performance budget as the other worlds: dpr capped at 2,
 * high-performance context.
 */
export default function SunCanvas({ channel, textures }: SunCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 2.8], fov: 42, near: 0.1, far: 100 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <SunDisk channel={channel} textures={textures} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableRotate={false}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        zoomSpeed={0.6}
        minDistance={1.6}
        maxDistance={6}
      />
    </Canvas>
  );
}
