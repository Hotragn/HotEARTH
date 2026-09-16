"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  PLANETS,
  PLANET_ORDER,
  compressRadius,
  orreryLayout,
  type OrreryOptions,
  type PlanetName,
} from "@/lib/planets";
import {
  ORRERY_DOT_RADIUS,
  PLANET_ACCENT,
  isDetailPlanet,
} from "@/lib/planet-facts";

const DAY_MS = 86_400_000;

/** Log-compressed orrery scale (the lib default): Mercury ≈ 1, Neptune ≈ 10. */
const ORRERY_OPTS: OrreryOptions = {
  mode: "log",
  minRadius: 1,
  maxRadius: 10,
  innerAU: 0.3,
  outerAU: 31,
};

interface OrreryProps {
  /** current simulated epoch ms; mutated in place by the time control / play */
  simMsRef: React.RefObject<number>;
  playing: boolean;
  /** simulated Earth days advanced per real second while playing */
  speedDaysPerSec: number;
  onFocus: (name: PlanetName) => void;
}

/**
 * The orrery: Sun at centre + all eight planets at their REAL heliocentric
 * ecliptic longitudes (from orreryLayout), with only the radial distance
 * log-compressed so every orbit is visible at once. Planet angular motion is
 * therefore physically correct and relative speeds are honest: Mercury laps
 * visibly while Neptune crawls. Positions are updated imperatively per frame
 * (no React re-render); the AU labels refresh a few times a second.
 */
export default function Orrery({
  simMsRef,
  playing,
  speedDaysPerSec,
  onFocus,
}: OrreryProps) {
  const groupRefs = useRef<Partial<Record<PlanetName, THREE.Group | null>>>({});

  // Static orbit rings at each planet's semi-major-axis scene radius.
  const orbits = useMemo(
    () =>
      PLANET_ORDER.map((name) => ({
        name,
        radius: compressRadius(PLANETS[name].elements.a, ORRERY_OPTS),
      })),
    []
  );

  // Initial AU snapshot for the labels (updated ~4Hz in useFrame).
  const [auSnapshot, setAuSnapshot] = useState<Record<string, number>>(() => {
    const layout = orreryLayout(new Date(simMsRef.current ?? Date.now()), ORRERY_OPTS);
    return Object.fromEntries(layout.bodies.map((b) => [b.name, b.distanceAU]));
  });

  const labelAccum = useRef(0);

  useFrame((_, delta) => {
    if (playing) {
      simMsRef.current = (simMsRef.current ?? Date.now()) + delta * speedDaysPerSec * DAY_MS;
    }
    const layout = orreryLayout(new Date(simMsRef.current ?? Date.now()), ORRERY_OPTS);
    for (const b of layout.bodies) {
      const g = groupRefs.current[b.name];
      if (g) g.position.set(b.x, 0, b.z);
    }
    labelAccum.current += delta;
    if (labelAccum.current > 0.25) {
      labelAccum.current = 0;
      setAuSnapshot(
        Object.fromEntries(layout.bodies.map((b) => [b.name, b.distanceAU]))
      );
    }
  });

  return (
    <group>
      <Sun />
      {orbits.map((o) => (
        <OrbitRing key={o.name} radius={o.radius} color={PLANET_ACCENT[o.name]} />
      ))}
      {PLANET_ORDER.map((name) => (
        <PlanetNode
          key={name}
          name={name}
          au={auSnapshot[name] ?? 0}
          groupRef={(el) => {
            groupRefs.current[name] = el;
          }}
          onFocus={onFocus}
        />
      ))}
    </group>
  );
}

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.42, 48, 48]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
      {/* additive glow halo */}
      <mesh scale={1.7}>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshBasicMaterial
          color="#f2a63b"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={1.4} distance={0} decay={0} color="#fff3d6" />
    </group>
  );
}

function OrbitRing({ radius, color }: { radius: number; color: string }) {
  const geometry = useMemo(() => {
    const segments = 256;
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
      <lineBasicMaterial color={color} transparent opacity={0.28} />
    </lineLoop>
  );
}

function PlanetNode({
  name,
  au,
  groupRef,
  onFocus,
}: {
  name: PlanetName;
  au: number;
  groupRef: (el: THREE.Group | null) => void;
  onFocus: (name: PlanetName) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const r = ORRERY_DOT_RADIUS[name];
  const accent = PLANET_ACCENT[name];
  const linkable = !isDetailPlanet(name); // Earth / Mars open their own tabs

  return (
    <group ref={groupRef}>
      {/* visible tinted dot */}
      <mesh>
        <sphereGeometry args={[r, 24, 24]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* larger invisible hit target so tiny dots are easy to click */}
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
        <sphereGeometry args={[Math.max(r * 2.6, 0.34), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={[0, r + 0.22, 0]}
        center
        distanceFactor={9}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 11,
            lineHeight: 1.25,
            textAlign: "center",
            transform: `scale(${hovered ? 1.08 : 1})`,
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ color: accent, fontWeight: 600, letterSpacing: "0.04em" }}>
            {name}
            {linkable ? " ↗" : ""}
          </div>
          <div style={{ color: "#9aa2b1", fontSize: 9.5 }}>
            {au.toFixed(2)} AU
          </div>
        </div>
      </Html>
    </group>
  );
}
