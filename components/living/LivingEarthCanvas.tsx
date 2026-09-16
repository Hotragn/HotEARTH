"use client";

import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type * as THREE from "three";
import type { LatLon } from "@/lib/geo";
import { latLonToVector3 } from "@/lib/geo";
import type { City } from "@/lib/cities";
import EarthGlobe from "@/components/globe/EarthGlobe";
import CityPoints from "./CityPoints";

// Same opening frame as the Earth tab: mid-Atlantic, whole civilization.
const INITIAL_CAMERA = latLonToVector3(20, -30, 2.9);

interface LivingEarthCanvasProps {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  timeOffsetHoursRef: React.RefObject<number>;
  cities: City[] | null;
  /** selected city's location, marked with the amber pin */
  selected: LatLon | null;
  onPick: (latLon: LatLon | null) => void;
  onHover: (latLon: LatLon | null) => void;
}

export default function LivingEarthCanvas(props: LivingEarthCanvasProps) {
  const [interacted, setInteracted] = useState(false);
  const pointerDownAt = useRef<[number, number] | null>(null);

  return (
    <Canvas
      className="absolute inset-0"
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
        layerTexture={null}
        layerKind={null}
        timeOffsetHoursRef={props.timeOffsetHoursRef}
        picked={props.selected}
        onPick={props.onPick}
        onHover={props.onHover}
      />
      {props.cities && <CityPoints cities={props.cities} />}
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
