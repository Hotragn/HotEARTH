"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import {
  moonOrreryLayout,
  type MoonName,
  type MoonOrreryOptions,
  type ParentPlanet,
} from "@/lib/moons";
import { MOON_ACCENT, MOON_DOT_RADIUS, PARENT_ACCENT } from "@/lib/moon-facts";

const DAY_MS = 86_400_000;

/**
 * Log-compressed mini-orrery scale. moonOrreryLayout auto-fits each parent's own
 * moon span to [minRadius, maxRadius], so every parent's system fills the same
 * visual ring range (inner moon ≈ 0.7, outer ≈ 2.6) no matter the true km span.
 */
const ORRERY_OPTS: MoonOrreryOptions = {
  mode: "log",
  minRadius: 0.7,
  maxRadius: 2.6,
};

interface MoonsOverviewCanvasProps {
  parent: ParentPlanet;
  /** current simulated epoch ms; mutated in place while playing */
  simMsRef: React.RefObject<number>;
  playing: boolean;
  /** simulated Earth days advanced per real second while playing */
  speedDaysPerSec: number;
  onFocus: (name: MoonName) => void;
}

/**
 * One parent's moon mini-orrery. The ANGLE of each moon is its real orbital
 * angle at the simulated date (from moonOrreryLayout); only the RADIUS is
 * log-compressed so the whole system is visible at once. Inner moons whip around
 * while outer moons amble, and retrograde Triton visibly sweeps the other way:
 * all physically correct relative motion. Positions are updated imperatively per
 * frame (no React re-render). Click a moon to open its detail globe.
 */
export default function MoonsOverviewCanvas(props: MoonsOverviewCanvasProps) {
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 6.4, 3.4], fov: 45, near: 0.1, far: 200 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <ambientLight intensity={0.7} />
      <Stars
        radius={90}
        depth={45}
        count={4000}
        factor={2.6}
        saturation={0}
        fade
        speed={0.25}
      />
      <MiniOrrery
        key={props.parent}
        parent={props.parent}
        simMsRef={props.simMsRef}
        playing={props.playing}
        speedDaysPerSec={props.speedDaysPerSec}
        onFocus={props.onFocus}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        minDistance={2.5}
        maxDistance={12}
        maxPolarAngle={Math.PI * 0.92}
      />
    </Canvas>
  );
}

function MiniOrrery({
  parent,
  simMsRef,
  playing,
  speedDaysPerSec,
  onFocus,
}: {
  parent: ParentPlanet;
  simMsRef: React.RefObject<number>;
  playing: boolean;
  speedDaysPerSec: number;
  onFocus: (name: MoonName) => void;
}) {
  const groupRefs = useRef<Partial<Record<MoonName, THREE.Group | null>>>({});

  // Static per-parent geometry: orbit-ring radii + true km distances. Radii
  // depend only on the semi-major axis + opts, so they never change with time.
  const bodies = useMemo(
    () =>
      moonOrreryLayout(parent, new Date(), ORRERY_OPTS).bodies.map((b) => ({
        name: b.name,
        sceneRadius: b.sceneRadius,
        distanceKm: b.distanceKm,
        retrograde: b.retrograde,
      })),
    [parent]
  );

  useFrame((_, delta) => {
    if (playing) {
      simMsRef.current =
        (simMsRef.current ?? Date.now()) + delta * speedDaysPerSec * DAY_MS;
    }
    const layout = moonOrreryLayout(
      parent,
      new Date(simMsRef.current ?? Date.now()),
      ORRERY_OPTS
    );
    for (const b of layout.bodies) {
      const g = groupRefs.current[b.name];
      if (g) g.position.set(b.x, 0, b.z);
    }
  });

  return (
    <group>
      <Parent parent={parent} />
      {bodies.map((b) => (
        <OrbitRing
          key={`ring-${b.name}`}
          radius={b.sceneRadius}
          color={MOON_ACCENT[b.name]}
          retrograde={b.retrograde}
        />
      ))}
      {bodies.map((b) => (
        <MoonNode
          key={b.name}
          name={b.name}
          distanceKm={b.distanceKm}
          retrograde={b.retrograde}
          groupRef={(el) => {
            groupRefs.current[b.name] = el;
          }}
          onFocus={onFocus}
        />
      ))}
    </group>
  );
}

function Parent({ parent }: { parent: ParentPlanet }) {
  const accent = PARENT_ACCENT[parent];
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.4, 48, 48]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh scale={1.6}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Html
        position={[0, 0.62, 0]}
        center
        distanceFactor={7}
        zIndexRange={[10, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: accent,
          }}
        >
          {parent}
        </div>
      </Html>
    </group>
  );
}

function OrbitRing({
  radius,
  color,
  retrograde,
}: {
  radius: number;
  color: string;
  retrograde: boolean;
}) {
  const geometry = useMemo(() => {
    const segments = 200;
    const pts = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pts[i * 3] = Math.cos(a) * radius;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = Math.sin(a) * radius;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, [radius]);

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={retrograde ? 0.4 : 0.26}
      />
    </lineLoop>
  );
}

function MoonNode({
  name,
  distanceKm,
  retrograde,
  groupRef,
  onFocus,
}: {
  name: MoonName;
  distanceKm: number;
  retrograde: boolean;
  groupRef: (el: THREE.Group | null) => void;
  onFocus: (name: MoonName) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const r = MOON_DOT_RADIUS[name];
  const accent = MOON_ACCENT[name];

  return (
    <group ref={groupRef}>
      {/* visible tinted dot */}
      <mesh>
        <sphereGeometry args={[r, 24, 24]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* larger invisible hit target so tiny moons are easy to click */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onFocus(name);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[Math.max(r * 3, 0.18), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={[0, r + 0.14, 0]}
        center
        distanceFactor={7}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 11,
            lineHeight: 1.2,
            textAlign: "center",
            transform: `scale(${hovered ? 1.1 : 1})`,
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ color: accent, fontWeight: 600, letterSpacing: "0.04em" }}>
            {name}
            {retrograde ? " ⟲" : ""}
          </div>
          <div style={{ color: "#9aa2b1", fontSize: 9.5 }}>
            {distanceKm.toLocaleString()} km
          </div>
        </div>
      </Html>
    </group>
  );
}
