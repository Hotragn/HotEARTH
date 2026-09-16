"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  exoPlanetDerived,
  starColor,
  systemLayout,
  type ExoStar,
} from "@/lib/exoplanets";
import {
  COMPARE_BLUE,
  HZ_GREEN,
  displayName,
  type ExoSystemData,
  type SystemDerived,
} from "@/lib/exo-facts";

const MIN_R = 1.6;
const MAX_R = 9;
const DAYS_PER_YEAR = 365.25;

// Solar-System reference orbits for the "compare to our system" overlay [AU].
const REFERENCES: { name: string; au: number; earth?: boolean }[] = [
  { name: "Mercury", au: 0.387 },
  { name: "Earth", au: 1.0, earth: true },
  { name: "Mars", au: 1.524 },
  { name: "Jupiter", au: 5.204 },
];

/** Resolve a planet's semi-major axis [AU] exactly as lib/systemLayout does. */
function resolveSmaAU(
  p: { sma_au?: number | null; period_days?: number | null },
  mStar: number
): number | null {
  if (typeof p.sma_au === "number" && p.sma_au > 0) return p.sma_au;
  if (typeof p.period_days === "number" && p.period_days > 0) {
    const pYr = p.period_days / DAYS_PER_YEAR;
    return Math.cbrt(pYr * pYr * mStar);
  }
  return null;
}

/** Log-compress an AU distance to a scene radius (matches lib compressSma 'log'). */
function compressAU(au: number, innerAU: number, outerAU: number): number {
  if (!(au > 0)) return MIN_R;
  if (outerAU <= innerAU) return (MIN_R + MAX_R) / 2;
  const t =
    (Math.log(au) - Math.log(innerAU)) / (Math.log(outerAU) - Math.log(innerAU));
  return MIN_R + t * (MAX_R - MIN_R);
}

function starSceneRadius(rad: number | null | undefined): number {
  const r = typeof rad === "number" && rad > 0 ? rad : 1;
  return Math.min(0.62, Math.max(0.18, 0.18 + 0.12 * Math.log2(1 + r)));
}

function planetDotRadius(re: number | null | undefined): number {
  const r = typeof re === "number" && re > 0 ? re : 0.9;
  return Math.min(0.14, Math.max(0.05, 0.045 + 0.02 * Math.cbrt(r)));
}

interface PlanetVis {
  name: string;
  smaAU: number;
  baseR: number;
  ecc: number;
  tint: string;
  dotR: number;
  inHZ: boolean;
  orbit: Float32Array;
}

interface ExoSystemSceneProps {
  system: ExoSystemData;
  derived: SystemDerived;
  simDaysRef: React.RefObject<number>;
  playing: boolean;
  daysPerSec: number;
  compareOn: boolean;
  onFocusPlanet: (name: string) => void;
}

/**
 * The 3D SYSTEM ARCHITECTURE: the centerpiece. The host star sits at centre
 * (colour from starColor(teff), illustrative size from star.rad); each planet
 * rides its real, radius-compressed orbit at the correct RELATIVE speed
 * (lib/systemLayout: order + angular speeds are physical, absolute phase +
 * radial distance are illustrative). The computed Kopparapu (2013) habitable
 * zone is shaded as a green annulus (conservative bright, optimistic faint), and
 * an optional overlay draws our own Solar System's orbits on the SAME compressed
 * scale so a viewer can see how compact e.g. TRAPPIST-1 is. Clicking a planet
 * opens its detail. All geometry is disposed on unmount; the per-frame path only
 * repositions the planet groups.
 */
export default function ExoSystemScene({
  system,
  derived,
  simDaysRef,
  playing,
  daysPerSec,
  compareOn,
  onFocusPlanet,
}: ExoSystemSceneProps) {
  const mStar = system.star.mass && system.star.mass > 0 ? system.star.mass : 1;

  // Compression window: always spans the planets + the (optimistic) HZ, and the
  // Solar-System references when the overlay is on, so nothing renders off-frame.
  const { innerAU, outerAU } = useMemo(() => {
    const smas = system.planets
      .map((p) => resolveSmaAU(p, mStar))
      .filter((x): x is number => x !== null && x > 0);
    let lo = smas.length ? Math.min(...smas) * 0.9 : 0.9;
    let hi = smas.length ? Math.max(...smas) * 1.1 : 1.1;
    if (derived.hz) {
      lo = Math.min(lo, derived.hz.optimistic.inner * 0.9);
      hi = Math.max(hi, derived.hz.optimistic.outer * 1.1);
    }
    if (compareOn) {
      lo = Math.min(lo, REFERENCES[0].au * 0.85);
      hi = Math.max(hi, REFERENCES[REFERENCES.length - 1].au * 1.1);
    }
    if (!(lo > 0)) lo = 0.01;
    if (!(hi > lo)) hi = lo * 2;
    return { innerAU: lo, outerAU: hi };
  }, [system, mStar, derived.hz, compareOn]);

  const starLinear: ExoStar = useMemo(
    () => ({
      teff: system.star.teff,
      lum: derived.lumLinear, // LINEAR L/Lsun (already converted)
      rad: system.star.rad,
      mass: system.star.mass,
      spectype: system.star.spectype,
    }),
    [system.star, derived.lumLinear]
  );

  // Per-planet visuals + closed compressed orbit paths (rebuilt only when the
  // window changes, e.g. when the comparison overlay reframes the scene).
  const planets: PlanetVis[] = useMemo(() => {
    const out: PlanetVis[] = [];
    for (const p of system.planets) {
      const sma = resolveSmaAU(p, mStar);
      if (sma === null) continue;
      const baseR = compressAU(sma, innerAU, outerAU);
      const ecc = typeof p.ecc === "number" && p.ecc >= 0 && p.ecc < 1 ? p.ecc : 0;
      const ed = exoPlanetDerived(p, starLinear);
      const samples = 220;
      const orbit = new Float32Array((samples + 1) * 3);
      for (let i = 0; i <= samples; i++) {
        const E = (i / samples) * Math.PI * 2;
        const nu = Math.atan2(
          Math.sqrt(1 - ecc * ecc) * Math.sin(E),
          Math.cos(E) - ecc
        );
        const r = baseR * (1 - ecc * Math.cos(E));
        orbit[i * 3] = r * Math.cos(nu);
        orbit[i * 3 + 1] = 0;
        orbit[i * 3 + 2] = -r * Math.sin(nu);
      }
      out.push({
        name: p.name,
        smaAU: sma,
        baseR,
        ecc,
        tint: ed.tint,
        dotR: planetDotRadius(p.radius_re),
        inHZ: ed.inHabitableZone === true,
        orbit,
      });
    }
    return out;
  }, [system, mStar, innerAU, outerAU, starLinear]);

  // HZ annulus radii (compressed).
  const hzRings = useMemo(() => {
    const hz = derived.hz;
    if (!hz) return null;
    return {
      consInner: compressAU(hz.conservative.inner, innerAU, outerAU),
      consOuter: compressAU(hz.conservative.outer, innerAU, outerAU),
      optInner: compressAU(hz.optimistic.inner, innerAU, outerAU),
      optOuter: compressAU(hz.optimistic.outer, innerAU, outerAU),
    };
  }, [derived.hz, innerAU, outerAU]);

  const starCol = starColor(system.star.teff);
  const starR = starSceneRadius(system.star.rad);

  // Per-frame: advance sim time (physical relative speeds) and reposition dots.
  const groupRefs = useRef<Record<string, THREE.Group | null>>({});
  useFrame((_, delta) => {
    if (playing) {
      simDaysRef.current = (simDaysRef.current ?? 0) + delta * daysPerSec;
    }
    const layout = systemLayout(system.planets, {
      mode: "log",
      timeDays: simDaysRef.current ?? 0,
      starMassMsun: mStar,
      minRadius: MIN_R,
      maxRadius: MAX_R,
      innerAU,
      outerAU,
    });
    for (const b of layout.planets) {
      const g = b.name ? groupRefs.current[b.name] : null;
      if (g) g.position.set(b.x, 0, b.z);
    }
  });

  return (
    <group>
      <StarBody color={starCol} radius={starR} name={displayName(system)} />

      {/* Habitable zone (computed): optimistic faint, conservative brighter */}
      {hzRings && hzRings.optOuter > hzRings.optInner && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.05, hzRings.optInner), hzRings.optOuter, 96]} />
          <meshBasicMaterial
            color={HZ_GREEN}
            transparent
            opacity={0.06}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {hzRings && hzRings.consOuter > hzRings.consInner && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.05, hzRings.consInner), hzRings.consOuter, 96]} />
          <meshBasicMaterial
            color={HZ_GREEN}
            transparent
            opacity={0.13}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Solar-System comparison overlay (same compressed scale) */}
      {compareOn &&
        REFERENCES.map((ref) => (
          <ReferenceOrbit
            key={ref.name}
            name={ref.name}
            radius={compressAU(ref.au, innerAU, outerAU)}
            au={ref.au}
            earth={ref.earth}
          />
        ))}

      {/* Planet orbits + nodes */}
      {planets.map((p) => (
        <group key={p.name}>
          <OrbitLine points={p.orbit} inHZ={p.inHZ} />
          <group
            ref={(el) => {
              groupRefs.current[p.name] = el;
            }}
          >
            <PlanetNode planet={p} onFocus={() => onFocusPlanet(p.name)} />
          </group>
        </group>
      ))}
    </group>
  );
}

function StarBody({
  color,
  radius,
  name,
}: {
  color: string;
  radius: number;
  name: string;
}) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight intensity={1.1} distance={0} decay={0} color={color} />
      <Html
        position={[0, radius + 0.35, 0]}
        center
        distanceFactor={12}
        zIndexRange={[12, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#edf0f5",
            opacity: 0.9,
          }}
        >
          {name}
        </div>
      </Html>
    </group>
  );
}

function OrbitLine({ points, inHZ }: { points: Float32Array; inHZ: boolean }) {
  return (
    <lineLoop>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <lineBasicMaterial
        color={inHZ ? HZ_GREEN : "#6f76ff"}
        transparent
        opacity={inHZ ? 0.5 : 0.32}
      />
    </lineLoop>
  );
}

function PlanetNode({
  planet,
  onFocus,
}: {
  planet: PlanetVis;
  onFocus: () => void;
}) {
  return (
    <group>
      {/* tinted illustrative dot */}
      <mesh>
        <sphereGeometry args={[planet.dotR, 24, 24]} />
        <meshBasicMaterial color={planet.tint} toneMapped={false} />
      </mesh>
      {/* in-HZ halo */}
      {planet.inHZ && (
        <mesh scale={1.9}>
          <sphereGeometry args={[planet.dotR, 20, 20]} />
          <meshBasicMaterial
            color={HZ_GREEN}
            transparent
            opacity={0.22}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* larger invisible hit target */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[Math.max(planet.dotR * 3, 0.3), 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={[0, planet.dotR + 0.22, 0]}
        center
        distanceFactor={10}
        zIndexRange={[16, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            textAlign: "center",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 10,
            lineHeight: 1.25,
          }}
        >
          <div style={{ color: "#c7ccd6", fontWeight: 600 }}>{planet.name}</div>
          <div style={{ color: "#626a7a", fontSize: 9 }}>
            {planet.smaAU < 1 ? planet.smaAU.toFixed(3) : planet.smaAU.toFixed(2)} AU
          </div>
        </div>
      </Html>
    </group>
  );
}

function ReferenceOrbit({
  name,
  radius,
  au,
  earth,
}: {
  name: string;
  radius: number;
  au: number;
  earth?: boolean;
}) {
  const points = useMemo(() => {
    const seg = 128;
    const arr = new Float32Array((seg + 1) * 3);
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * radius;
      arr[i * 3 + 1] = 0;
      arr[i * 3 + 2] = Math.sin(a) * radius;
    }
    return arr;
  }, [radius]);

  return (
    <group>
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={COMPARE_BLUE}
          transparent
          opacity={earth ? 0.7 : 0.4}
        />
      </lineLoop>
      <Html
        position={[0, 0, radius]}
        center
        distanceFactor={12}
        zIndexRange={[13, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 9.5,
            letterSpacing: "0.04em",
            color: COMPARE_BLUE,
            opacity: earth ? 0.95 : 0.7,
          }}
        >
          {name} · {au < 1 ? au.toFixed(2) : au.toFixed(1)} AU
        </div>
      </Html>
    </group>
  );
}
