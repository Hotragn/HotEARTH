"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import NightSkyScene from "./NightSkyScene";
import {
  DEFAULT_FOV,
  MAX_FOV,
  MIN_FOV,
  type LayerState,
  type Observer,
  type Selection,
  type ViewMode,
} from "./constants";
import type {
  Constellation,
  MessierObject,
  Star,
} from "@/lib/star-facts";

interface NightSkyCanvasProps {
  stars: Star[];
  messier: MessierObject[];
  constellations: Constellation[];
  byId: Map<number, Star>;
  layers: LayerState;
  mode: ViewMode;
  observer: Observer;
  date: Date;
  selected: Selection;
  onSelect: (sel: Selection) => void;
}

/**
 * Full-viewport planetarium canvas. The camera sits (essentially) at the origin
 * looking OUT; OrbitControls rotate the view in place (no pan, no dolly: dolly
 * is meaningless against a far shell), and the wheel zooms by field-of-view for a
 * real "zoom into a constellation" feel. Same performance budget as the other
 * worlds (dpr capped at 2, high-performance context).
 */
export default function NightSkyCanvas(props: NightSkyCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 0.35], fov: DEFAULT_FOV, near: 0.01, far: 2000 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#04050b")}
    >
      <NightSkyScene {...props} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={-0.22}
        minPolarAngle={0.02}
        maxPolarAngle={Math.PI - 0.02}
      />
      <FovZoom />
    </Canvas>
  );
}

/** Field-of-view zoom on the mouse wheel (OrbitControls dolly is disabled). */
function FovZoom() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      cam.fov = THREE.MathUtils.clamp(
        cam.fov + e.deltaY * 0.04,
        MIN_FOV,
        MAX_FOV
      );
      cam.updateProjectionMatrix();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [camera, gl]);

  return null;
}
