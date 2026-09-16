"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  DWARF_ORDER,
  compressRadius,
  heliocentricPosition,
  orbitalPeriodYears,
  orreryLayout,
  type DwarfName,
  type OrreryOptions,
} from "@/lib/dwarf-planets";
import { DWARF_ACCENT, DWARF_DOT_RADIUS } from "@/lib/dwarf-facts";

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;
const DEG2RAD = Math.PI / 180;

/**
 * Neptune's semi-major axis [AU] (JPL). Neptune's orbit is nearly circular
 * (e ≈ 0.009), so a plain ring at this distance is honest to the eye: it is the
 * trans-Neptunian REFERENCE line, so viewers can see that Pluto/Haumea/Makemake/
 * Eris live beyond Neptune and that Pluto's eccentric orbit crosses it.
 */
const NEPTUNE_AU = 30.06992276;

/**
 * Log-compressed orrery scale. innerAU 2.5 (just inside Ceres at 2.77) →
 * outerAU 100 (just beyond Eris' ~98 AU aphelion) map to scene radii 1→10, so
 * all five orbits, a ~35× true-distance range, are visible together. ANGLES
 * are real heliocentric longitudes; only the RADIUS is compressed (the control
 * says so).
 */
const ORRERY_OPTS: OrreryOptions = {
  mode: "log",
  minRadius: 1,
  maxRadius: 10,
  innerAU: 2.5,
  outerAU: 100,
};

interface DwarfOrreryProps {
  simMsRef: React.RefObject<number>;
  playing: boolean;
  /** simulated Earth days advanced per real second while playing */
  speedDaysPerSec: number;
  onFocus: (name: DwarfName) => void;
}

/** Build the closed, compressed orbit path for one body (one full period). */
function buildOrbitGeometry(name: DwarfName, samples = 240): THREE.BufferGeometry {
  const periodDays = orbitalPeriodYears(name) * YEAR_DAYS;
  const start = Date.now();
  const pts = new Float32Array(samples * 3);
  for (let i = 0; i < samples; i++) {
    const d = new Date(start + (i / samples) * periodDays * DAY_MS);
    const pos = heliocentricPosition(name, d);
    const r = compressRadius(pos.distanceAU, ORRERY_OPTS);
    const lam = pos.longitudeDeg * DEG2RAD;
    pts[i * 3] = r * Math.cos(lam);
    pts[i * 3 + 1] = 0;
    pts[i * 3 + 2] = -r * Math.sin(lam);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
  return g;
}

/**
 * The dwarf-planet mini-orrery: Sun at centre, Neptune's orbit as a trans-
 * Neptunian reference ring, and the five dwarf planets on their REAL, eccentric,
 * radius-compressed orbits. Angular motion and relative speeds are physically
 * correct (Ceres laps in ~4.6 yr while Eris crawls over ~560 yr); the true AU
 * distance is labelled live. Each dwarf orbit is the traced compressed path, so
 * its dot always rides exactly on its line: and Pluto's line visibly dips
 * inside the Neptune ring near perihelion (the Neptune-crossing 3:2 resonance).
 */
export default function DwarfOrrery({
  simMsRef,
  playing,
  speedDaysPerSec,
  onFocus,
}: DwarfOrreryProps) {
  const groupRefs = useRef<Partial<Record<DwarfName, THREE.Group | null>>>({});

  const orbits = useMemo(
    () => DWARF_ORDER.map((name) => ({ name, geometry: buildOrbitGeometry(name) })),
    []
  );

  useEffect(() => {
    return () => {
      for (const o of orbits) o.geometry.dispose();
    };
  }, [orbits]);

  const neptuneRadius = useMemo(() => compressRadius(NEPTUNE_AU, ORRERY_OPTS), []);

  // Initial AU snapshot for the labels (updated ~4Hz in useFrame).
  const [auSnapshot, setAuSnapshot] = useState<Record<string, number>>(() => {
    const layout = orreryLayout(
      new Date(simMsRef.current ?? Date.now()),
      ORRERY_OPTS
    );
    return Object.fromEntries(layout.bodies.map((b) => [b.name, b.distanceAU]));
  });
  const labelAccum = useRef(0);

  useFrame((_, delta) => {
    if (playing) {
      simMsRef.current =
        (simMsRef.current ?? Date.now()) + delta * speedDaysPerSec * DAY_MS;
    }
    const layout = orreryLayout(
      new Date(simMsRef.current ?? Date.now()),
      ORRERY_OPTS
    );
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
      <NeptuneReferenceRing radius={neptuneRadius} />
      {orbits.map((o) => (
        <lineLoop key={`orbit-${o.name}`} geometry={o.geometry}>
          <lineBasicMaterial color={DWARF_ACCENT[o.name]} transparent opacity={0.32} />
        </lineLoop>
      ))}
      {DWARF_ORDER.map((name) => (
        <DwarfNode
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
        <sphereGeometry args={[0.34, 48, 48]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
      <mesh scale={1.7}>
        <sphereGeometry args={[0.34, 32, 32]} />
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

/** Neptune's (near-circular) orbit, drawn distinctly as the trans-Neptunian datum. */
function NeptuneReferenceRing({ radius }: { radius: number }) {
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

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <lineLoop geometry={geometry}>
        <lineBasicMaterial color="#3b6fe0" transparent opacity={0.5} />
      </lineLoop>
      <Html
        position={[0, 0, radius + 0.15]}
        center
        distanceFactor={11}
        zIndexRange={[15, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.06em",
            color: "#7fa0ea",
            opacity: 0.9,
          }}
        >
          Neptune orbit · ~30 AU
        </div>
      </Html>
    </group>
  );
}

function DwarfNode({
  name,
  au,
  groupRef,
  onFocus,
}: {
  name: DwarfName;
  au: number;
  groupRef: (el: THREE.Group | null) => void;
  onFocus: (name: DwarfName) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const r = DWARF_DOT_RADIUS[name];
  const accent = DWARF_ACCENT[name];

  return (
    <group ref={groupRef}>
      {/* visible tinted dot */}
      <mesh>
        <sphereGeometry args={[r, 24, 24]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {/* larger invisible hit target so small dots are easy to click */}
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
        <sphereGeometry args={[Math.max(r * 2.8, 0.34), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={[0, r + 0.28, 0]}
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
          </div>
          <div style={{ color: "#9aa2b1", fontSize: 9.5 }}>{au.toFixed(1)} AU</div>
        </div>
      </Html>
    </group>
  );
}
