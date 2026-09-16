"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_FACTS, type DetailPlanetName } from "@/lib/planet-facts";
import PlanetGlobe from "./PlanetGlobe";
import { usePlanetTexture } from "./usePlanetTexture";

/** Solar System Scope ring texture (CC BY 4.0): see the attribution footer. */
const RING_TEXTURE_PATH = "/textures/planets/saturn-rings.png";

interface PlanetDetailCanvasProps {
  name: DetailPlanetName;
  timeOffsetDaysRef: React.RefObject<number>;
  /** reports whether the real texture loaded (true = using procedural fallback) */
  onFallback?: (usingFallback: boolean) => void;
}

export default function PlanetDetailCanvas({
  name,
  timeOffsetDaysRef,
  onFallback,
}: PlanetDetailCanvasProps) {
  const [interacted, setInteracted] = useState(false);
  const { texture, ready, usingFallback } = usePlanetTexture(name);
  const [ringTexture, setRingTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (ready) onFallback?.(usingFallback);
  }, [ready, usingFallback, onFallback]);

  // Saturn only: load the ring PNG (alpha). Never blocks the scene.
  useEffect(() => {
    if (!PLANET_FACTS[name].hasRings) {
      setRingTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader
      .loadAsync(RING_TEXTURE_PATH)
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        setRingTexture(tex);
      })
      .catch(() => {
        /* rings simply won't render; the planet still does */
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  useEffect(() => {
    return () => {
      ringTexture?.dispose();
    };
  }, [ringTexture]);

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 1.1, 4.2], fov: 42, near: 0.1, far: 400 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <Stars
        radius={90}
        depth={45}
        count={4500}
        factor={2.8}
        saturation={0}
        fade
        speed={0.3}
      />
      <PlanetGlobe
        name={name}
        surfaceTexture={texture}
        usingFallback={usingFallback}
        ringTexture={ringTexture}
        timeOffsetDaysRef={timeOffsetDaysRef}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.65}
        minDistance={2.2}
        maxDistance={9}
        autoRotate={!interacted}
        autoRotateSpeed={0.28}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
