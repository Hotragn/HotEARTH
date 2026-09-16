"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { DwarfBodyName } from "@/lib/dwarf-facts";
import DwarfGlobe from "./DwarfGlobe";
import { useDwarfTexture } from "./useDwarfTexture";

interface DwarfDetailCanvasProps {
  name: DwarfBodyName;
  timeOffsetDaysRef: React.RefObject<number>;
  /** reports whether the real texture loaded (true = illustrative / fallback) */
  onFallback?: (usingFallback: boolean) => void;
}

/**
 * Full-viewport detail globe for one dwarf-planet body. Same performance budget
 * as the other worlds (dpr capped at 2, high-performance context). The globe
 * reads the day-scrub offset from a ref per frame, so scrubbing the rotation
 * never re-renders the canvas.
 *
 * Haumea is framed further out (its ring spans ~3 body radii) and its camera
 * does NOT auto-rotate: the ellipsoid itself spins. Every other body gets a
 * gentle camera auto-rotate until the user grabs it.
 */
export default function DwarfDetailCanvas({
  name,
  timeOffsetDaysRef,
  onFallback,
}: DwarfDetailCanvasProps) {
  const [interacted, setInteracted] = useState(false);
  const { texture, ready, usingFallback } = useDwarfTexture(name);
  const isHaumea = name === "Haumea";

  useEffect(() => {
    if (ready) onFallback?.(usingFallback);
  }, [ready, usingFallback, onFallback]);

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{
        position: isHaumea ? [0, 1.8, 7] : [0, 0.9, 3.8],
        fov: 42,
        near: 0.1,
        far: 300,
      }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <Stars
        radius={80}
        depth={40}
        count={4200}
        factor={2.6}
        saturation={0}
        fade
        speed={0.3}
      />
      <DwarfGlobe
        name={name}
        surfaceTexture={texture}
        usingFallback={usingFallback}
        timeOffsetDaysRef={timeOffsetDaysRef}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.65}
        minDistance={isHaumea ? 3.4 : 1.6}
        maxDistance={isHaumea ? 14 : 7}
        autoRotate={!interacted && !isHaumea}
        autoRotateSpeed={0.24}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
