"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { latLonToVector3 } from "@/lib/geo";
import { sunDirection } from "@/lib/solar";
import type { GroundTrackPoint } from "@/lib/iss";
import {
  EARTH_MEAN_RADIUS_KM,
  footprintAngularRadiusDeg,
  type Observer,
} from "@/lib/iss-facts";
import {
  ATMOSPHERE_FRAGMENT,
  ATMOSPHERE_VERTEX,
  EARTH_FRAGMENT,
  EARTH_VERTEX,
} from "@/components/globe/shaders";

/** Globe radius in scene units (mirrors the Earth tab's GLOBE_RADIUS). */
const R = 1;
/** Ground overlays sit a hair above the surface to avoid z-fighting the texture. */
const SURFACE = 1.0016;

export interface IssSample {
  lat: number;
  lon: number;
  altKm: number;
}

interface IssSceneProps {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
  /** current live sub-point + altitude, or null while no orbit resolves. */
  iss: IssSample | null;
  /** altitude visual multiplier: 1 = true scale, >1 = exaggerated for visibility. */
  altExaggeration: number;
  /** one-orbit ground track (already sampled by lib/iss). */
  groundTrack: GroundTrackPoint[];
  /** the passes observer, marked on the globe as an orientation cue. */
  observer: Observer;
}

/** Real altitude (km) → scene height above the unit globe, times the exaggeration. */
function altToSceneHeight(altKm: number, exaggeration: number): number {
  return (altKm / EARTH_MEAN_RADIUS_KM) * exaggeration;
}

export default function IssScene({
  dayTexture,
  nightTexture,
  iss,
  altExaggeration,
  groundTrack,
  observer,
}: IssSceneProps) {
  return (
    <group>
      <EarthBody dayTexture={dayTexture} nightTexture={nightTexture} />
      <GroundTrackLines points={groundTrack} />
      {iss && <Footprint lat={iss.lat} lon={iss.lon} altKm={iss.altKm} />}
      {iss && (
        <IssMarker lat={iss.lat} lon={iss.lon} altKm={iss.altKm} exaggeration={altExaggeration} />
      )}
      <ObserverMarker observer={observer} />
    </group>
  );
}

// ────────────────────────────── Earth + terminator ─────────────────────────

/**
 * The globe: Blue Marble day + Black Marble night, blended by the SAME computed
 * day/night terminator as the Earth tab (lib/solar sunDirection → the shared
 * EARTH_FRAGMENT shader). The mesh is unrotated, so object-space normals are
 * Earth-fixed and the sub-satellite lat/lon from lib/iss drops straight on.
 */
function EarthBody({
  dayTexture,
  nightTexture,
}: {
  dayTexture: THREE.Texture;
  nightTexture: THREE.Texture;
}) {
  const sunVec = useMemo(() => new THREE.Vector3(1, 0, 0), []);

  const blankOverlay = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const earthMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayTexture },
          nightMap: { value: nightTexture },
          overlayMap: { value: blankOverlay },
          overlayStrength: { value: 0 },
          sunDir: { value: sunVec },
        },
        vertexShader: EARTH_VERTEX,
        fragmentShader: EARTH_FRAGMENT,
      }),
    // built once; textures fed in as uniforms
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const atmosphereMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { sunDir: { value: sunVec } },
        vertexShader: ATMOSPHERE_VERTEX,
        fragmentShader: ATMOSPHERE_FRAGMENT,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    earthMaterial.uniforms.dayMap.value = dayTexture;
    earthMaterial.uniforms.nightMap.value = nightTexture;
  }, [earthMaterial, dayTexture, nightTexture]);

  useEffect(() => {
    return () => {
      earthMaterial.dispose();
      atmosphereMaterial.dispose();
      blankOverlay.dispose();
    };
  }, [earthMaterial, atmosphereMaterial, blankOverlay]);

  // Live terminator: refresh the Sun vector every 500 ms of real time (cheap;
  // no need for 60 Hz). No allocation: subsolar → set on the reused vector.
  const lastSun = useRef(0);
  useFrame(() => {
    const now = Date.now();
    if (now - lastSun.current > 500) {
      lastSun.current = now;
      const [x, y, z] = sunDirection(new Date(now));
      sunVec.set(x, y, z);
    }
  });

  return (
    <group>
      <mesh material={earthMaterial}>
        <sphereGeometry args={[R, 128, 96]} />
      </mesh>
      <mesh material={atmosphereMaterial} scale={1.045}>
        <sphereGeometry args={[R, 96, 72]} />
      </mesh>
    </group>
  );
}

// ────────────────────────────── ISS marker ─────────────────────────────────

/**
 * The live station: a small glyph (bright body + two solar-array wings) at the
 * sub-point lat/lon and its REAL altitude (scaled by `exaggeration`; 1 = true).
 * A faint tether drops to the ground point so the height reads at a glance, and
 * an Html tag shows the live altitude. Only the group position changes as the
 * station moves: the glyph geometry is fixed.
 */
function IssMarker({
  lat,
  lon,
  altKm,
  exaggeration,
}: {
  lat: number;
  lon: number;
  altKm: number;
  exaggeration: number;
}) {
  const radius = R + altToSceneHeight(altKm, exaggeration);

  const position = useMemo<[number, number, number]>(
    () => latLonToVector3(lat, lon, radius),
    [lat, lon, radius]
  );
  const surfacePoint = useMemo<[number, number, number]>(
    () => latLonToVector3(lat, lon, SURFACE),
    [lat, lon]
  );

  // Orient the glyph so its local +Z points away from Earth (up), like a pin.
  const quaternion = useMemo(() => {
    const outward = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  }, [position]);

  // Tether from the ground sub-point up to the station (rebuilt on move; 2 verts).
  const tether = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([...surfacePoint, ...position]), 3)
    );
    const m = new THREE.LineBasicMaterial({ color: "#c0d0e8", transparent: true, opacity: 0.34 });
    return new THREE.Line(g, m);
  }, [surfacePoint, position]);
  useEffect(
    () => () => {
      tether.geometry.dispose();
      (tether.material as THREE.Material).dispose();
    },
    [tether]
  );

  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const s = 1 + 0.28 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 2.4));
    ringRef.current.scale.setScalar(s);
  });

  return (
    <group>
      <primitive object={tether} />

      <group position={surfacePoint}>
        {/* sub-point dot on the ground: the "now" position on the track */}
        <mesh>
          <sphereGeometry args={[0.006, 16, 16]} />
          <meshBasicMaterial color="#c0d0e8" toneMapped={false} />
        </mesh>
      </group>

      <group position={position} quaternion={quaternion}>
        {/* pulsing ring */}
        <mesh ref={ringRef}>
          <ringGeometry args={[0.02, 0.026, 40]} />
          <meshBasicMaterial
            color="#eaf1fb"
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        {/* central module */}
        <mesh>
          <boxGeometry args={[0.008, 0.008, 0.02]} />
          <meshBasicMaterial color="#f4f7fc" toneMapped={false} />
        </mesh>
        {/* two solar-array wings */}
        <mesh position={[0.018, 0, 0]}>
          <boxGeometry args={[0.026, 0.001, 0.012]} />
          <meshBasicMaterial color="#5c7cc4" toneMapped={false} />
        </mesh>
        <mesh position={[-0.018, 0, 0]}>
          <boxGeometry args={[0.026, 0.001, 0.012]} />
          <meshBasicMaterial color="#5c7cc4" toneMapped={false} />
        </mesh>
        {/* bright core */}
        <mesh>
          <sphereGeometry args={[0.005, 16, 16]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>

        <Html
          position={[0, 0.045, 0]}
          center
          distanceFactor={8}
          zIndexRange={[20, 0]}
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
            <div style={{ color: "#eaf1fb", fontWeight: 600, letterSpacing: "0.08em" }}>
              ISS
            </div>
            <div style={{ color: "#9aa2b1", fontSize: 8.5 }}>{altKm.toFixed(0)} km</div>
          </div>
        </Html>
      </group>
    </group>
  );
}

// ────────────────────────────── ground track ───────────────────────────────

/**
 * The sub-satellite ground track over ~one orbit, drawn on the surface as a
 * polyline SPLIT at the antimeridian (wherever |Δlon| between neighbours > 180°),
 * so no segment is drawn straight across the ±180° seam. Built once per track
 * update and disposed on change.
 */
function GroundTrackLines({ points }: { points: GroundTrackPoint[] }) {
  const lines = useMemo(() => buildGroundTrackLines(points), [points]);
  useEffect(
    () => () => {
      for (const l of lines) {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      }
    },
    [lines]
  );
  return (
    <group>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
    </group>
  );
}

function buildGroundTrackLines(points: GroundTrackPoint[]): THREE.Line[] {
  const out: THREE.Line[] = [];
  if (points.length < 2) return out;

  // Break the track into antimeridian-safe segments.
  const segments: GroundTrackPoint[][] = [];
  let current: GroundTrackPoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const dLon = Math.abs(points[i].lon - points[i - 1].lon);
    if (dLon > 180) {
      segments.push(current);
      current = [points[i]];
    } else {
      current.push(points[i]);
    }
  }
  segments.push(current);

  for (const seg of segments) {
    if (seg.length < 2) continue;
    const arr = new Float32Array(seg.length * 3);
    for (let i = 0; i < seg.length; i++) {
      const [x, y, z] = latLonToVector3(seg[i].lat, seg[i].lon, SURFACE);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const mat = new THREE.LineBasicMaterial({
      color: "#c0d0e8",
      transparent: true,
      opacity: 0.6,
    });
    out.push(new THREE.Line(geo, mat));
  }
  return out;
}

// ────────────────────────────── footprint circle ───────────────────────────

/**
 * The ISS "footprint": the circle on the ground from which the station is above
 * the horizon right now, at angular radius acos(R/(R+h)) around the sub-point
 * (~20° at ~420 km). Honest geometry, drawn faint. Rebuilt on a coarse key so it
 * doesn't churn every second.
 */
function Footprint({ lat, lon, altKm }: { lat: number; lon: number; altKm: number }) {
  // coarse quantization so the geometry only rebuilds every few seconds of motion
  const key = `${lat.toFixed(1)}|${lon.toFixed(1)}|${altKm.toFixed(0)}`;
  const line = useMemo(() => buildFootprint(lat, lon, altKm), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line]
  );
  return <primitive object={line} />;
}

function buildFootprint(lat: number, lon: number, altKm: number): THREE.LineLoop {
  const theta = footprintAngularRadiusDeg(altKm) * (Math.PI / 180);
  const c = new THREE.Vector3(...latLonToVector3(lat, lon, 1)).normalize();
  // tangent basis at the sub-point
  const up = Math.abs(c.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(c, up).normalize();
  const v = new THREE.Vector3().crossVectors(c, u).normalize();

  const N = 96;
  const arr = new Float32Array(N * 3);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * Math.PI * 2;
    const x = cosT * c.x + sinT * (Math.cos(phi) * u.x + Math.sin(phi) * v.x);
    const y = cosT * c.y + sinT * (Math.cos(phi) * u.y + Math.sin(phi) * v.y);
    const z = cosT * c.z + sinT * (Math.cos(phi) * u.z + Math.sin(phi) * v.z);
    arr[i * 3] = x * SURFACE;
    arr[i * 3 + 1] = y * SURFACE;
    arr[i * 3 + 2] = z * SURFACE;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const mat = new THREE.LineBasicMaterial({
    color: "#7f93c8",
    transparent: true,
    opacity: 0.32,
  });
  return new THREE.LineLoop(geo, mat);
}

// ────────────────────────────── observer marker ────────────────────────────

/** A small amber pin at the passes observer's location: an orientation cue. */
function ObserverMarker({ observer }: { observer: Observer }) {
  const position = useMemo<[number, number, number]>(
    () => latLonToVector3(observer.lat, observer.lon, SURFACE),
    [observer.lat, observer.lon]
  );
  const quaternion = useMemo(() => {
    const outward = new THREE.Vector3(...position).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  }, [position]);
  return (
    <group position={position} quaternion={quaternion}>
      <mesh>
        <circleGeometry args={[0.006, 20]} />
        <meshBasicMaterial color="#f2a63b" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.009, 0.011, 32]} />
        <meshBasicMaterial
          color="#f2a63b"
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
