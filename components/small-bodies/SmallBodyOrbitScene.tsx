"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  PLANETS,
  heliocentricPosition as planetPosition,
  type PlanetName,
} from "@/lib/planets";
import {
  cometActivity,
  compressRadius,
  heliocentricPosition,
  orbitPath,
  type CompressionOptions,
} from "@/lib/small-bodies";
import {
  ASTEROID_COLOR,
  COMET_COLOR,
  EARTH_REF_COLOR,
  OPEN_ORBIT_COLOR,
  PHA_COLOR,
  PLANET_REF_COLOR,
  type SmallBodyObject,
} from "@/lib/small-body-facts";

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365.25;
const DEG2RAD = Math.PI / 180;

/** Base radius of the shared unit tail cone (scaled per-frame by activity). */
const TAIL_BASE_RADIUS = 0.2;
/** The tail geometry extends from its apex (nucleus) along −Y; we rotate −Y → anti-sunward. */
const TAIL_AXIS = new THREE.Vector3(0, -1, 0);

/**
 * One shared, log-compressed radial scale for BOTH the planet reference orbits
 * (Mercury→Jupiter) and the small-body orbits, so everything lives in one frame.
 * innerAU 0.1 (inside every perihelion) → outerAU 50 map to scene radii 1.4→11;
 * log is monotonic and extrapolates, so a long-period aphelion (tens–thousands of
 * AU) still maps to a finite, larger radius. ANGLES are the real heliocentric
 * longitudes; only the RADIUS is compressed: the HUD says so.
 */
const ORRERY_OPTS: CompressionOptions = {
  mode: "log",
  minRadius: 1.4,
  maxRadius: 11,
  innerAU: 0.1,
  outerAU: 50,
};

/** Inner planets + Jupiter: the reference frame for the inner Solar System. */
const REF_PLANETS: PlanetName[] = ["Mercury", "Venus", "Earth", "Mars", "Jupiter"];

interface OrbitVis {
  /** stable key (designation ?? name): matches the React key + the ref map. */
  key: string;
  obj: SmallBodyObject;
  line: THREE.Line;
  /** perihelion scene point, the graceful fallback if a live position is unresolved */
  peri: { x: number; z: number };
  /** perihelion heliocentric distance [AU] (fallback distance for the label) */
  qAU: number;
  color: string;
  /** the path is drawn as an open arc (near-parabolic or hyperbolic) */
  open: boolean;
  /**
   * The body is GENUINELY unbound (e > 1 / hyperbolic / interstellar): passes
   * through once and never returns. Distinct from `open`: a bound long-period
   * comet (e.g. NEOWISE e≈0.999) is drawn as an arc but is NOT unbound.
   */
  unbound: boolean;
  isComet: boolean;
  /** owned tail cone (comets only), animated per-frame, disposed on unmount */
  tailMesh: THREE.Mesh | null;
}

interface SmallBodyOrbitSceneProps {
  objects: SmallBodyObject[];
  onFocus: (o: SmallBodyObject) => void;
  /** simulated wall-clock (ms since epoch) advanced by the time control */
  simMsRef: React.RefObject<number>;
  playing: boolean;
  /** simulated Earth days advanced per real second while playing */
  speedDaysPerSec: number;
}

/** Colour for a body's orbit + marker. */
function colorFor(o: SmallBodyObject): string {
  if (o.interstellar || o.elements.hyperbolic) return OPEN_ORBIT_COLOR;
  return o.kind === "comet" ? COMET_COLOR : ASTEROID_COLOR;
}

/**
 * The inner-Solar-System orbit view: the 3D centerpiece. The Sun sits at centre;
 * the planet reference orbits (Mercury→Jupiter, Earth highlighted) and every
 * small body's REAL orbit share one compressed radial scale. Bound asteroids and
 * comets draw as CLOSED ellipses; hyperbolic / interstellar visitors draw as OPEN
 * arcs (visually distinct, labelled "unbound: passing through, not orbiting").
 *
 * The catalogue now carries a time anchor (mean anomaly + epoch for bound orbits,
 * time-of-perihelion for open ones), so each body rides a LIVE, propagated
 * heliocentric position advanced by the orrery clock: the same real two-body
 * mechanics the Solar-System and dwarf-planet orreries use. Comet tails emanate
 * from the live nucleus, point anti-sunward (away from the Sun at the origin) and
 * grow with cometActivity(r) at the body's live heliocentric distance. Hyperbolic
 * / interstellar bodies sweep through once and keep receding: honest to their
 * single pass. A body whose elements still can't resolve a position (should be
 * none) degrades gracefully to its perihelion marker, never crashing.
 *
 * All line geometries/materials and the tail cones are built once and disposed on
 * unmount; positions/orientations are updated by mutating existing objects with
 * reused scratch vectors: nothing allocates per frame.
 */
export default function SmallBodyOrbitScene({
  objects,
  onFocus,
  simMsRef,
  playing,
  speedDaysPerSec,
}: SmallBodyOrbitSceneProps) {
  // Planet reference orbits: built once (independent of the object filter).
  const planetOrbits = useMemo(() => buildPlanetOrbits(), []);
  useEffect(() => {
    return () => {
      for (const p of planetOrbits) {
        p.line.geometry.dispose();
        (p.line.material as THREE.Material).dispose();
      }
    };
  }, [planetOrbits]);

  // Small-body orbits + tails: rebuilt when the filtered object set changes.
  const orbits = useMemo(() => buildOrbits(objects), [objects]);
  useEffect(() => {
    return () => {
      for (const o of orbits) {
        o.line.geometry.dispose();
        (o.line.material as THREE.Material).dispose();
        if (o.tailMesh) {
          o.tailMesh.geometry.dispose();
          (o.tailMesh.material as THREE.Material).dispose();
        }
      }
    };
  }, [orbits]);

  // Group refs keyed by the stable body key, so a filter change reattaches cleanly.
  const groupRefs = useRef(new Map<string, THREE.Group>());
  // Live true-AU per body, mirrored to state ~4 Hz for the labels (no per-frame React).
  const auLive = useRef<Record<string, number>>({});
  const [auSnapshot, setAuSnapshot] = useState<Record<string, number>>({});
  const labelAccum = useRef(0);

  // Reused scratch objects: allocated once, mutated each frame.
  const scratchDir = useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, delta) => {
    if (playing) {
      simMsRef.current =
        (simMsRef.current ?? Date.now()) + delta * speedDaysPerSec * DAY_MS;
    }
    const date = new Date(simMsRef.current ?? Date.now());

    for (const v of orbits) {
      const pos = heliocentricPosition(v.obj.elements, date);
      let sx: number;
      let sz: number;
      let distAU: number;
      if (pos) {
        const r = compressRadius(pos.distanceAU, ORRERY_OPTS);
        const lam = pos.longitudeDeg * DEG2RAD;
        sx = r * Math.cos(lam);
        sz = -r * Math.sin(lam);
        distAU = pos.distanceAU;
      } else {
        // Graceful fallback: park at perihelion (should not happen now).
        sx = v.peri.x;
        sz = v.peri.z;
        distAU = v.qAU;
      }

      const g = groupRefs.current.get(v.key);
      if (g) g.position.set(sx, 0, sz);
      auLive.current[v.key] = distAU;

      // Comet tail: anti-sunward from the LIVE nucleus, sized by live activity.
      const tail = v.tailMesh;
      if (tail) {
        const activity = pos ? cometActivity(distAU) : 0;
        if (activity > 0) {
          const rad = Math.hypot(sx, sz);
          if (rad > 1e-6) {
            scratchDir.set(sx / rad, 0, sz / rad); // outward = anti-sunward
            scratchQuat.setFromUnitVectors(TAIL_AXIS, scratchDir);
            tail.quaternion.copy(scratchQuat);
          }
          const len = 0.6 + 2.2 * activity;
          const rScale = (0.16 + 0.24 * activity) / TAIL_BASE_RADIUS;
          tail.scale.set(rScale, len, rScale);
          (tail.material as THREE.MeshBasicMaterial).opacity = 0.1 + 0.28 * activity;
          tail.visible = true;
        } else {
          tail.visible = false;
        }
      }
    }

    labelAccum.current += delta;
    if (labelAccum.current > 0.25) {
      labelAccum.current = 0;
      setAuSnapshot({ ...auLive.current });
    }
  });

  return (
    <group>
      <Sun />

      {/* planet reference orbits (Mercury→Jupiter) */}
      {planetOrbits.map((p) => (
        <group key={`planet-${p.name}`}>
          <primitive object={p.line} />
          <Html
            position={[p.labelX, 0, p.labelZ]}
            center
            distanceFactor={12}
            zIndexRange={[11, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div
              style={{
                whiteSpace: "nowrap",
                fontFamily: "var(--font-plex-mono, monospace)",
                fontSize: 9.5,
                letterSpacing: "0.04em",
                color: p.earth ? EARTH_REF_COLOR : "#7f93c8",
                opacity: p.earth ? 0.95 : 0.7,
              }}
            >
              {p.name} · {p.au < 1 ? p.au.toFixed(2) : p.au.toFixed(1)} AU
            </div>
          </Html>
        </group>
      ))}

      {/* small-body orbits, live markers + moving comet tails */}
      {orbits.map((v) => (
        <BodyMarker
          key={v.key}
          vis={v}
          au={auSnapshot[v.key]}
          groupRef={(el) => {
            if (el) groupRefs.current.set(v.key, el);
            else groupRefs.current.delete(v.key);
          }}
          onFocus={() => onFocus(v.obj)}
        />
      ))}
    </group>
  );
}

// ─────────────────────────────── building ───────────────────────────────────

interface PlanetOrbitVis {
  name: PlanetName;
  line: THREE.Line;
  au: number;
  earth: boolean;
  labelX: number;
  labelZ: number;
}

/** Trace each reference planet's real orbit (sampled over one period), compressed. */
function buildPlanetOrbits(): PlanetOrbitVis[] {
  const out: PlanetOrbitVis[] = [];
  const base = Date.now();
  for (const name of REF_PLANETS) {
    const periodDays = PLANETS[name].physical.orbitalPeriodYears * YEAR_DAYS;
    const samples = 128;
    const pts = new Float32Array(samples * 3);
    for (let i = 0; i < samples; i++) {
      const d = new Date(base + (i / samples) * periodDays * DAY_MS);
      const pos = planetPosition(name, d);
      const r = compressRadius(pos.distanceAU, ORRERY_OPTS);
      const lam = pos.longitudeDeg * DEG2RAD;
      pts[i * 3] = r * Math.cos(lam);
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = -r * Math.sin(lam);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const earth = name === "Earth";
    const mat = new THREE.LineBasicMaterial({
      color: earth ? EARTH_REF_COLOR : PLANET_REF_COLOR,
      transparent: true,
      opacity: earth ? 0.75 : 0.42,
    });
    const line = new THREE.LineLoop(geo, mat);
    const au = PLANETS[name].elements.a;
    const rLabel = compressRadius(au, ORRERY_OPTS);
    out.push({
      name,
      line,
      au,
      earth,
      labelX: rLabel * Math.cos(0.6),
      labelZ: -rLabel * Math.sin(0.6),
    });
  }
  return out;
}

/** Build a shared-shape unit tail cone: apex at the origin, extending along −Y. */
function buildTailMesh(): THREE.Mesh {
  const g = new THREE.ConeGeometry(TAIL_BASE_RADIUS, 1, 20, 1, true);
  g.translate(0, -0.5, 0); // apex at origin (nucleus), wide base at −Y
  const m = new THREE.MeshBasicMaterial({
    color: "#8fe9ff",
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.visible = false;
  return mesh;
}

/** Build the drawn orbit line, perihelion fallback + tail cone for each object. */
function buildOrbits(objects: SmallBodyObject[]): OrbitVis[] {
  const out: OrbitVis[] = [];
  for (const obj of objects) {
    const path = orbitPath(obj.elements, ORRERY_OPTS);
    if (!path || path.points.length < 2) continue;

    const pts = new Float32Array(path.points.length * 3);
    let periIdx = 0;
    let periDist = Infinity;
    for (let i = 0; i < path.points.length; i++) {
      const p = path.points[i];
      pts[i * 3] = p.x;
      pts[i * 3 + 1] = 0;
      pts[i * 3 + 2] = p.z;
      if (p.distanceAU < periDist) {
        periDist = p.distanceAU;
        periIdx = i;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    const open = !path.closed;
    const color = colorFor(obj);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: open ? 0.55 : obj.kind === "comet" ? 0.3 : 0.36,
    });
    const line = open
      ? new THREE.Line(geo, mat)
      : (new THREE.LineLoop(geo, mat) as unknown as THREE.Line);

    const periPt = path.points[periIdx];
    const unbound =
      obj.interstellar ||
      obj.elements.hyperbolic ||
      (obj.elements.e !== null && obj.elements.e > 1);
    const isComet = obj.kind === "comet";
    out.push({
      key: obj.designation ?? obj.name,
      obj,
      line,
      peri: { x: periPt.x, z: periPt.z },
      qAU: periDist,
      color,
      open,
      unbound,
      isComet,
      tailMesh: isComet ? buildTailMesh() : null,
    });
  }
  return out;
}

// ─────────────────────────────── pieces ─────────────────────────────────────

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.32, 48, 48]} />
        <meshBasicMaterial color="#ffcf6b" toneMapped={false} />
      </mesh>
      <mesh scale={1.7}>
        <sphereGeometry args={[0.32, 32, 32]} />
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

function BodyMarker({
  vis,
  au,
  groupRef,
  onFocus,
}: {
  vis: OrbitVis;
  au: number | undefined;
  groupRef: (el: THREE.Group | null) => void;
  onFocus: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { obj, color, unbound, tailMesh } = vis;
  const r = 0.085;

  return (
    <group ref={groupRef}>
      {/* live comet tail, animated in the parent useFrame (anti-sunward) */}
      {tailMesh && <primitive object={tailMesh} />}

      {/* visible marker dot */}
      <mesh>
        <sphereGeometry args={[r, 20, 20]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {/* PHA ring, a calm amber halo, factual not alarming */}
      {obj.pha && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r * 1.7, r * 2.3, 28]} />
          <meshBasicMaterial
            color={PHA_COLOR}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
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
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[Math.max(r * 3, 0.3), 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html
        position={[0, r + 0.22, 0]}
        center
        distanceFactor={10}
        zIndexRange={[18, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            textAlign: "center",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 10,
            lineHeight: 1.25,
            transform: `scale(${hovered ? 1.08 : 1})`,
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ color, fontWeight: 600 }}>{obj.name}</div>
          {typeof au === "number" && Number.isFinite(au) && (
            <div style={{ color: "#9aa2b1", fontSize: 8.5 }}>
              {au < 10 ? au.toFixed(2) : au.toFixed(1)} AU
            </div>
          )}
          {unbound && (
            <div style={{ color: OPEN_ORBIT_COLOR, fontSize: 8.5 }}>
              unbound: passing through
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
