"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  SATURN,
  SATURN_MOON_ORDER,
  saturnMoonPositions,
  saturnRingGeometry,
  type SaturnMoon,
} from "@/lib/saturn-moons";
import { MOON_COLORS, MOON_DESIGNATION, MOON_RADIUS_KM } from "./saturnUi";
import type { SaturnTextures } from "./useSaturnTextures";

/**
 * The telescope plane-of-sky view, and the centerpiece of the tab. Saturn's
 * OBLATE disk (a unit sphere squashed to SATURN.polarRadiusRatio along its pole)
 * sits at centre, textured with the reused Solar System Scope map, TILTED so the
 * pole points at the real position angle P (ring.positionAngleDeg) and opens by
 * the real ring tilt B (ring.ringTiltB): the disk squash-axis and the ring plane
 * therefore match the true sky geometry. The RINGS are drawn as the real annulus
 * (D-ring inner ~1.11 to F-ring outer ~2.33 Saturn radii) in Saturn's equatorial
 * plane, using the reused ring strip mapped radially, tilted to the same B/P.
 *
 * The seven moons sit at their real apparent (x, y, z) in Saturn equatorial radii
 * (X positive = WEST = right, Y positive = NORTH = up, Z positive = toward Earth
 * = toward the orthographic camera), straight from lib/saturn-moons; so they
 * string along the projected ring ellipse (that is the true geometry, a built-in
 * check). Depth is honest by construction: a frontOfDisk moon (z > 0) renders in
 * front of the opaque disk; one behind is occulted; and because the tilted ring
 * annulus is placed at its true 3-D depth, a moon crossing the ring region passes
 * in front of or behind the rings exactly as frontOfRingPlane says (the depth
 * buffer resolves it per pixel). A small dark shadow dot marks a shadow transit
 * at (shadowX, shadowY).
 *
 * The ONLY liberty is marker SIZE: real Saturn moons are tiny against the disk +
 * rings, so markers are enlarged for legibility (real size ordering preserved,
 * relative to Titan) and that is labeled in the HUD and on the size toggle. The
 * where and when are to scale.
 */

const DEG2RAD = Math.PI / 180;

/** Saturn equatorial radius = 1 scene unit; polar radius is the oblate ratio. */
const DISK_R = 1;
const POLAR_RATIO = SATURN.polarRadiusRatio;
/**
 * To-scale visible ring span in Saturn equatorial radii: D-ring inner edge
 * (1.11) to F-ring outer edge (2.3342), matching the Planets tab's
 * saturn_rings.json. SATURN.mainRingInnerReq confirms the inner edge.
 */
const RING_INNER = SATURN.mainRingInnerReq; // 1.11
const RING_OUTER = 2.3342;
/** Shadow dots sit just in front of the disk so they read. */
const SHADOW_Z = 1.4;
/** Titan is the largest moon; enlarged markers are scaled relative to it. */
const TITAN_KM = MOON_RADIUS_KM.Titan;

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

interface SaturnMoonsSceneProps {
  textures: SaturnTextures;
  saturnFallback: boolean;
  /** displayed instant (ms) as a ref, read per-frame for smooth animation */
  displayedMsRef: React.RefObject<number>;
  /** half-width of the framed field in Saturn radii (drives marker sizing) */
  targetReq: number;
  /** true = markers enlarged for visibility; false = true angular size */
  exaggerate: boolean;
}

export default function SaturnMoonsScene({
  textures,
  saturnFallback,
  displayedMsRef,
  targetReq,
  exaggerate,
}: SaturnMoonsSceneProps) {
  const moonRefs = useRef<Array<THREE.Group | null>>(
    SATURN_MOON_ORDER.map(() => null)
  );
  const shadowRefs = useRef<Array<THREE.Mesh | null>>(
    SATURN_MOON_ORDER.map(() => null)
  );
  /** The Saturn frame (disk + rings), re-oriented each frame to B / P. */
  const frameRef = useRef<THREE.Group | null>(null);

  // Reused temporaries so the per-frame orientation update never allocates.
  const tmpPole = useMemo(() => new THREE.Vector3(), []);
  const upY = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  // Marker radius per moon (in Saturn radii). Enlarged mode keeps a roughly
  // constant on-screen size (scales with the framed field) while preserving the
  // moons' real size ordering; true mode uses the honest angular radius.
  const markerRadii = useMemo<number[]>(() => {
    const enlargedBase = clamp(0.02 * targetReq, 0.1, 0.9);
    return SATURN_MOON_ORDER.map((m) => {
      const rk = MOON_RADIUS_KM[m];
      const trueR = rk / SATURN.equatorialRadiusKm;
      const enlargedR = enlargedBase * (rk / TITAN_KM);
      // never let an enlarged marker fall below a visible floor for the tiny moons
      return exaggerate ? Math.max(enlargedR, 0.06) : trueR;
    });
  }, [targetReq, exaggerate]);

  // Per-frame: orient Saturn's disk + rings to the true B / P, place every moon
  // at its real (x, y, z), and toggle its shadow dot. All off the React path.
  useFrame(() => {
    const ms = displayedMsRef.current;
    const date = new Date(ms);

    // Orient the disk + rings to the live ring geometry. The pole points, in the
    // sky frame, along the projected position angle P (measured N through E, so
    // North=+Y, East=-X) and tips out of the plane of sky by B (positive = the
    // north face is toward Earth / the camera at +Z):
    //   pole = (-sinP·cosB, cosP·cosB, sinB).
    // The frame's local +Y is aligned to that pole, so the disk sphere (squashed
    // along local Y) and the ring annulus (in local XZ, perpendicular to Y) both
    // take the true tilt. Roll about the pole is irrelevant (radial ring texture,
    // symmetric oblate silhouette).
    const ring = saturnRingGeometry(date);
    const frame = frameRef.current;
    if (ring && frame) {
      const bRad = ring.ringTiltBDeg * DEG2RAD;
      const pRad = ring.positionAngleDeg * DEG2RAD;
      const cosB = Math.cos(bRad);
      tmpPole.set(
        -Math.sin(pRad) * cosB,
        Math.cos(pRad) * cosB,
        Math.sin(bRad)
      );
      frame.quaternion.setFromUnitVectors(upY, tmpPole);
    }

    const positions = saturnMoonPositions(date);
    if (!positions) return;
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      const g = moonRefs.current[i];
      if (g) g.position.set(p.x, p.y, p.z);
      const s = shadowRefs.current[i];
      if (s) {
        s.visible = p.inShadowTransit;
        if (p.inShadowTransit) s.position.set(p.shadowX, p.shadowY, SHADOW_Z);
      }
    }
  });

  return (
    <group>
      {/* Saturn's disk + rings, re-oriented each frame to the real B / P. */}
      <group ref={frameRef}>
        <SaturnDisk texture={textures.saturn} fallback={saturnFallback} />
        <SaturnRings texture={textures.rings} />
      </group>

      <CompassLabels targetReq={targetReq} />

      {SATURN_MOON_ORDER.map((moon, i) => (
        <group
          key={moon}
          ref={(el) => {
            moonRefs.current[i] = el;
          }}
        >
          <MoonMarker
            moon={moon}
            radius={markerRadii[i]}
            texture={textures.moons[moon]}
          />
          <Html
            position={[0, 0, 0]}
            zIndexRange={[15, 0]}
            style={{
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              transform: "translate(-50%, 8px)",
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.06em",
              color: MOON_COLORS[moon],
              textShadow: "0 1px 3px rgba(0,0,0,0.9)",
            }}
          >
            {moon}
          </Html>
        </group>
      ))}

      {/* dark shadow dots (hidden until a shadow transit is in progress) */}
      {SATURN_MOON_ORDER.map((moon, i) => (
        <mesh
          key={`shadow-${moon}`}
          visible={false}
          renderOrder={3}
          ref={(el) => {
            shadowRefs.current[i] = el;
          }}
        >
          <circleGeometry args={[markerRadii[i], 28]} />
          <meshBasicMaterial color="#0a0b10" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────── Saturn disk ───────────────────────────────

/**
 * Saturn as an OBLATE disk: a unit sphere squashed along its pole (local Y) to
 * the real polar ratio (~0.902: Saturn is the most oblate planet, ~10% flatter),
 * textured with the reused Solar System Scope map (CC-BY 4.0, credited in the ring
 * panel and footer). Rendered unlit (meshBasic) and as an illustrative snapshot:
 * the point of the tab is the ring/moon geometry, not Saturn's own gibbous phase.
 * The parent frame supplies the true B / P tilt, so the squash-axis matches the
 * real sub-Earth latitude and the silhouette matches lib/saturn-moons.diskContains.
 */
function SaturnDisk({
  texture,
  fallback,
}: {
  texture: THREE.Texture | null;
  fallback: boolean;
}) {
  return (
    <mesh scale={[1, POLAR_RATIO, 1]} renderOrder={0}>
      <sphereGeometry args={[DISK_R, 96, 72]} />
      {texture && !fallback ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshBasicMaterial color="#c9b473" toneMapped={false} />
      )}
    </mesh>
  );
}

// ─────────────────────────────── Saturn rings ──────────────────────────────

/**
 * The ring system as a real annulus (RING_INNER..RING_OUTER Saturn radii) in
 * Saturn's equatorial plane, reusing the exact radial-UV technique of the Planets
 * tab (components/solar-system/PlanetGlobe.tsx): a RingGeometry with u = normalized
 * radius so the horizontal ring strip maps inner→outer. Built in local XY, rotated
 * to the frame's XZ (equatorial) plane; the parent frame tilts it to the true B/P.
 *
 * depthWrite + alphaTest let the tilted ring participate in the depth buffer, so
 * moons in front of the ring plane draw over it and moons behind are correctly
 * dimmed / hidden by the opaque ring bands while remaining visible through the
 * (low-alpha) gaps: the honest frontOfRingPlane geometry, resolved per pixel.
 */
function SaturnRings({ texture }: { texture: THREE.Texture | null }) {
  const geometry = useMemo(() => {
    const geo = new THREE.RingGeometry(RING_INNER, RING_OUTER, 180, 1);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const span = RING_OUTER - RING_INNER;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - RING_INNER) / span, 0.5);
    }
    uv.needsUpdate = true;
    return geo;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.04,
      opacity: 0.95,
      toneMapped: false,
      color: 0xffffff, // white until a texture (or the neutral fallback) is bound
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
    } else {
      // no ring strip: a faint neutral annulus so the geometry still reads
      material.color = new THREE.Color("#b9ad86");
    }
    material.needsUpdate = true;
  }, [texture, material]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  return (
    <mesh
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    />
  );
}

// ─────────────────────────────── moon marker ───────────────────────────────

/** One moon: a small textured sphere, or a flat tinted disk if its map is missing. */
function MoonMarker({
  moon,
  radius,
  texture,
}: {
  moon: SaturnMoon;
  radius: number;
  texture: THREE.Texture | null;
}) {
  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[radius, 24, 24]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshBasicMaterial color={MOON_COLORS[moon]} toneMapped={false} />
      )}
    </mesh>
  );
}

// ───────────────────────────── compass labels ──────────────────────────────

/**
 * Fixed N / S / E / W markers at the edges of the framed field. The plane-of-sky
 * convention never rotates: North up, South down, West right, East left (the same
 * X = west convention as lib/saturn-moons). Rebuilt when the field is reframed.
 */
function CompassLabels({ targetReq }: { targetReq: number }) {
  const r = targetReq * 0.92;
  const marks: Array<{ key: string; pos: [number, number, number] }> = [
    { key: "N", pos: [0, r, -3] },
    { key: "S", pos: [0, -r, -3] },
    { key: "W", pos: [r, 0, -3] }, // +X = west = right
    { key: "E", pos: [-r, 0, -3] }, // -X = east = left
  ];
  return (
    <group>
      {marks.map((m) => (
        <Html
          key={m.key}
          position={m.pos}
          zIndexRange={[10, 0]}
          style={{
            pointerEvents: "none",
            userSelect: "none",
            transform: "translate(-50%, -50%)",
            fontFamily: "var(--font-plex-mono, monospace)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(180,190,205,0.55)",
            textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          }}
        >
          {m.key}
        </Html>
      ))}
    </group>
  );
}
