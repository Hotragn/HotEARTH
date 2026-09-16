"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  PLANETS,
  heliocentricPosition as planetPosition,
  type PlanetName,
} from "@/lib/planets";
import {
  getInterstellarObject,
  incomingAsymptoteDirection,
  interstellarPosition,
  interstellarTrajectory,
  outgoingAsymptoteDirection,
  type InterstellarId,
} from "@/lib/interstellar";
import { OBJECT_COLOR } from "./interstellarUi";

/**
 * The Section B 3D scene: the inner Solar System (Sun + schematic planet orbit
 * rings, Mercury through Jupiter) with the SELECTED interstellar object drawn on
 * its REAL hyperbolic trajectory. Everything is on a linear AU scale (to scale,
 * not compressed) in the shared J2000-ecliptic frame, mapped ecliptic (x,y,z) AU
 * -> three.js (x, z, -y) * AU_SCALE so the ecliptic is the horizontal plane and
 * the object's real inclination lifts it out of that plane.
 *
 * Drawn from lib/interstellar: the trajectory arc (interstellarTrajectory), a live
 * marker at interstellarPosition(id, displayedDate), and the incoming asymptote
 * (incomingAsymptoteDirection, the real direction the object came from, labeled
 * with its origin constellation). Every physics call is guarded against null.
 */

const AU_SCALE = 1.4;
const REF_PLANETS: PlanetName[] = ["Mercury", "Venus", "Earth", "Mars", "Jupiter"];
const PLANET_REF_COLOR = "#59688c";
const EARTH_REF_COLOR = "#4aa3ff";
const DAY_MS = 86_400_000;

/** ecliptic (AU) -> three.js scene vector. */
function sceneVec(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(p.x * AU_SCALE, p.z * AU_SCALE, -p.y * AU_SCALE);
}

interface VisitorsSceneProps {
  selectedId: InterstellarId;
  displayedMsRef: React.RefObject<number>;
  /** trajectory sample window (ms): matches the scrubber range in the section. */
  fromMs: number;
  toMs: number;
}

export default function VisitorsScene({
  selectedId,
  displayedMsRef,
  fromMs,
  toMs,
}: VisitorsSceneProps) {
  const obj = getInterstellarObject(selectedId);
  const color = OBJECT_COLOR[selectedId];

  // ── planet reference orbit rings (built once) ──
  const planetOrbits = useMemo(() => buildPlanetOrbits(), []);
  useEffect(
    () => () => {
      for (const p of planetOrbits) {
        p.line.geometry.dispose();
        (p.line.material as THREE.Material).dispose();
      }
    },
    [planetOrbits],
  );

  // ── selected object's trajectory arc (rebuilt on id / window change) ──
  const arc = useMemo(() => {
    const from = new Date(fromMs);
    const to = new Date(toMs);
    const pts = interstellarTrajectory(selectedId, from, to, 300);
    if (pts.length < 2) return null;
    const positions = new Float32Array(pts.length * 3);
    let maxDist = 0;
    for (let i = 0; i < pts.length; i++) {
      const v = sceneVec(pts[i].position);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
      if (pts[i].position.distanceAU > maxDist) maxDist = pts[i].position.distanceAU;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const line = new THREE.Line(geo, mat);
    return { line, maxDistAU: maxDist };
  }, [selectedId, fromMs, toMs, color]);
  useEffect(() => {
    if (!arc) return;
    return () => {
      arc.line.geometry.dispose();
      (arc.line.material as THREE.Material).dispose();
    };
  }, [arc]);

  // ── asymptote endpoints (real geometry from the orbit orientation) ──
  const asymptotes = useMemo(() => {
    const inc = incomingAsymptoteDirection(selectedId);
    const out = outgoingAsymptoteDirection(selectedId);
    const L = Math.min(Math.max(arc?.maxDistAU ?? 8, 5), 40) * AU_SCALE;
    const incoming = inc ? new THREE.Vector3(inc[0], inc[2], -inc[1]).multiplyScalar(L) : null;
    const outgoing = out ? new THREE.Vector3(out[0], out[2], -out[1]).multiplyScalar(L) : null;
    return { incoming, outgoing };
  }, [selectedId, arc]);

  // ── moving markers ──
  const objRef = useRef<THREE.Group>(null);
  const planetRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame(() => {
    const date = new Date(displayedMsRef.current ?? Date.now());

    const pos = interstellarPosition(selectedId, date);
    if (objRef.current) {
      if (pos) {
        const v = sceneVec(pos);
        objRef.current.position.set(v.x, v.y, v.z);
        objRef.current.visible = true;
      } else {
        objRef.current.visible = false;
      }
    }

    for (let i = 0; i < REF_PLANETS.length; i++) {
      const g = planetRefs.current[i];
      if (!g) continue;
      const pp = planetPosition(REF_PLANETS[i], date);
      if (pp && Number.isFinite(pp.distanceAU)) {
        const v = sceneVec(pp);
        g.position.set(v.x, v.y, v.z);
        g.visible = true;
      } else {
        g.visible = false;
      }
    }
  });

  return (
    <group>
      <Sun />

      {/* planet reference orbits + live planet markers */}
      {planetOrbits.map((p, i) => (
        <group key={p.name}>
          <primitive object={p.line} />
          <group
            ref={(el: THREE.Group | null) => {
              planetRefs.current[i] = el;
            }}
          >
            <mesh>
              <sphereGeometry args={[p.earth ? 0.07 : 0.055, 16, 16]} />
              <meshBasicMaterial
                color={p.earth ? EARTH_REF_COLOR : PLANET_REF_COLOR}
                toneMapped={false}
              />
            </mesh>
            <Html
              position={[0, 0.16, 0]}
              center
              distanceFactor={14}
              zIndexRange={[8, 0]}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <span
                style={{
                  whiteSpace: "nowrap",
                  fontFamily: "var(--font-plex-mono, monospace)",
                  fontSize: 9,
                  letterSpacing: "0.04em",
                  color: p.earth ? EARTH_REF_COLOR : "#8090b0",
                  opacity: p.earth ? 0.95 : 0.7,
                }}
              >
                {p.name}
              </span>
            </Html>
          </group>
        </group>
      ))}

      {/* incoming asymptote: where the object CAME FROM (labeled with origin) */}
      {asymptotes.incoming && (
        <AsymptoteLine
          end={asymptotes.incoming}
          color={color}
          opacity={0.5}
          label={obj ? `from ${obj.originConstellation.split(",")[0]}` : "incoming"}
        />
      )}
      {/* outgoing asymptote: where it HEADS TO (fainter) */}
      {asymptotes.outgoing && (
        <AsymptoteLine
          end={asymptotes.outgoing}
          color={color}
          opacity={0.22}
          label="outbound, never returns"
        />
      )}

      {/* the real hyperbolic trajectory arc */}
      {arc && <primitive object={arc.line} />}

      {/* the live object marker */}
      <group ref={objRef}>
        <mesh>
          <sphereGeometry args={[0.11, 24, 24]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        <mesh scale={1.9}>
          <sphereGeometry args={[0.11, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.16}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <Html
          position={[0, 0.26, 0]}
          center
          distanceFactor={11}
          zIndexRange={[16, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color,
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}
          >
            {obj?.name ?? selectedId}
          </span>
        </Html>
      </group>
    </group>
  );
}

// ─────────────────────────── pieces ────────────────────────────────────────

interface PlanetOrbitVis {
  name: PlanetName;
  line: THREE.Line;
  earth: boolean;
}

/** Trace each reference planet's real orbit over one period, to true AU scale. */
function buildPlanetOrbits(): PlanetOrbitVis[] {
  const out: PlanetOrbitVis[] = [];
  const base = Date.now();
  const YEAR_DAYS = 365.25;
  for (const name of REF_PLANETS) {
    const periodDays = PLANETS[name].physical.orbitalPeriodYears * YEAR_DAYS;
    const samples = 160;
    const pts = new Float32Array(samples * 3);
    for (let i = 0; i < samples; i++) {
      const d = new Date(base + (i / samples) * periodDays * DAY_MS);
      const pp = planetPosition(name, d);
      const v = sceneVec(pp);
      pts[i * 3] = v.x;
      pts[i * 3 + 1] = v.y;
      pts[i * 3 + 2] = v.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const earth = name === "Earth";
    const mat = new THREE.LineBasicMaterial({
      color: earth ? EARTH_REF_COLOR : PLANET_REF_COLOR,
      transparent: true,
      opacity: earth ? 0.7 : 0.4,
    });
    out.push({ name, line: new THREE.LineLoop(geo, mat) as unknown as THREE.Line, earth });
  }
  return out;
}

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.22, 40, 40]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
      <mesh scale={1.8}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial
          color="#f2a63b"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Html
        position={[0, -0.34, 0]}
        center
        distanceFactor={16}
        zIndexRange={[7, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <span
          style={{
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 9,
            color: "#ffcf6b",
            opacity: 0.85,
          }}
        >
          Sun
        </span>
      </Html>
    </group>
  );
}

/**
 * A straight line from the Sun (origin) out to `end`, with a label at the far tip.
 * Built as a small owned geometry; disposed on unmount. Used for the incoming /
 * outgoing hyperbolic asymptotes (real directions from the orbit geometry).
 */
function AsymptoteLine({
  end,
  color,
  opacity,
  label,
}: {
  end: THREE.Vector3;
  color: string;
  opacity: number;
  label: string;
}) {
  const line = useMemo(() => {
    const pts = new Float32Array([0, 0, 0, end.x, end.y, end.z]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    return new THREE.Line(geo, mat);
  }, [end, color, opacity]);
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line],
  );
  return (
    <group>
      <primitive object={line} />
      <Html
        position={[end.x, end.y, end.z]}
        center
        distanceFactor={16}
        zIndexRange={[9, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <span
          style={{
            whiteSpace: "nowrap",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 9,
            letterSpacing: "0.04em",
            color,
            opacity: 0.85,
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}
