"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type * as THREE from "three";
import type { LatLon } from "@/lib/geo";
import { latLonToVector3 } from "@/lib/geo";
import type { LayerKind } from "@/lib/gibs";
import type { WindField } from "@/lib/wind";
import EarthGlobe from "./EarthGlobe";
import WindLayer from "./WindLayer";

// Open on the mid-Atlantic (20N, 30W): Americas on the left, Europe/Africa
// on the right, the classic "whole civilization in one frame" view.
const INITIAL_CAMERA = latLonToVector3(20, -30, 2.9);

interface GlobeCanvasProps {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  layerTexture: THREE.Texture | null;
  layerKind: LayerKind | null;
  timeOffsetHoursRef: React.RefObject<number>;
  picked: LatLon | null;
  onPick: (latLon: LatLon | null) => void;
  /** GFS wind field, non-null renders the particle flow layer */
  windField: WindField | null;
}

export default function GlobeCanvas(props: GlobeCanvasProps) {
  const [interacted, setInteracted] = useState(false);
  // Where the pointer went down, so an orbit-drag that ends over empty space
  // is not mistaken for a "click away" that closes the forecast panel.
  const pointerDownAt = useRef<[number, number] | null>(null);

  return (
    <Canvas
      className="absolute inset-0"
      // Performance budget (globe-3d-visualization skill): dpr capped at 2,
      // high-performance context, textures <= 4096. RAF pauses automatically
      // when the tab is hidden.
      dpr={[1, 2]}
      camera={{ position: INITIAL_CAMERA, fov: 42, near: 0.1, far: 300 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
      onPointerDown={(e) => {
        pointerDownAt.current = [e.clientX, e.clientY];
      }}
      onPointerMissed={(e) => {
        const down = pointerDownAt.current;
        if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) {
          return; // was a drag, not a deselect click
        }
        props.onPick(null);
      }}
    >
      <Stars
        radius={70}
        depth={35}
        count={4000}
        factor={2.6}
        saturation={0}
        fade
        speed={0.35}
      />
      <EarthGlobe
        dayTexture={props.dayTexture}
        nightTexture={props.nightTexture}
        layerTexture={props.layerTexture}
        layerKind={props.layerKind}
        timeOffsetHoursRef={props.timeOffsetHoursRef}
        picked={props.picked}
        onPick={props.onPick}
      />
      {props.windField && <WindLayer field={props.windField} />}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.65}
        minDistance={1.5}
        maxDistance={5.5}
        autoRotate={!interacted}
        autoRotateSpeed={0.25}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
