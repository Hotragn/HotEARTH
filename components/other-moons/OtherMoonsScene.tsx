"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  MOONS_BY_PLANET,
  OTHER_MOONS,
  OTHER_PLANETS,
  otherMoonPositions,
  planetGeocentric,
  type OtherMoon,
  type OtherPlanet,
} from "@/lib/other-moons";
import {
  ILLUSTRATIVE_MOONS,
  MOON_COLORS,
  MOON_RADIUS_KM,
  PLANET_FALLBACK_COLOR,
  systemSkyGeometry,
} from "./otherMoonsUi";
import type { OtherMoonsTextures } from "./useOtherMoonsTextures";

/**
 * The telescope plane-of-sky view, and the centerpiece of the tab. The selected
 * planet's OBLATE disk (a unit sphere squashed to OTHER_PLANETS[planet].
 * polarRadiusRatio along its pole) sits at centre, textured with the reused map
 * (Mars MOLA / Uranus / Neptune), TILTED so its pole points at the real sky
 * direction: we reconstruct the planet's pole in the plane-of-sky frame from the
 * exposed IAU pole constants plus the planet's apparent RA/Dec (systemSkyGeometry),
 * the SAME basis lib/other-moons projected the moons in. So the disk squash-axis
 * and the moon ellipse share the true geometry (dramatic for Uranus, tipped ~98
 * degrees).
 *
 * Each moon sits at its real apparent (x, y, z) in planet equatorial radii (X
 * positive = WEST = right, Y positive = NORTH = up, Z positive = toward Earth =
 * toward the orthographic camera), straight from lib/other-moons, so the close-in
 * moons string along the projected equatorial ellipse (that IS the geometry).
 * Depth is honest by construction: a frontOfDisk moon (z > 0) renders in front of
 * the opaque disk; one behind is occulted by the depth buffer. A small dark shadow
 * dot marks the rare shadow transit at (shadowX, shadowY).
 *
 * Two liberties, both labeled elsewhere: marker SIZE is enlarged for legibility
 * (real moons are tiny against these already-tiny disks; a true-size toggle
 * restores the honest angular size), and Proteus / Nereid, which have no map, are
 * illustrative tinted spheres. When a moon (Nereid, mainly) falls outside the
 * framed field, its direction and distance are shown at the edge rather than
 * dropped silently. Triton is flagged retrograde.
 */

/** Shadow dots sit just in front of the disk so they read. */
const SHADOW_Z = 1.4;
/** Edge indicators sit in front of everything. */
const EDGE_Z = 2;

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

interface OtherMoonsSceneProps {
  planet: OtherPlanet;
  textures: OtherMoonsTextures;
  /** displayed instant (ms) as a ref, read per-frame for smooth animation */
  displayedMsRef: React.RefObject<number>;
  /** half-width of the framed field in planet radii (drives marker sizing) */
  targetReq: number;
  /** true = markers enlarged for visibility; false = true angular size */
  exaggerate: boolean;
}

export default function OtherMoonsScene({
  planet,
  textures,
  displayedMsRef,
  targetReq,
  exaggerate,
}: OtherMoonsSceneProps) {
  const moons = MOONS_BY_PLANET[planet];

  // Per-moon refs, keyed by moon name (the moon set changes with the planet).
  const markerRefs = useRef<Partial<Record<OtherMoon, THREE.Group | null>>>({});
  const shadowRefs = useRef<Partial<Record<OtherMoon, THREE.Mesh | null>>>({});
  const edgeRefs = useRef<Partial<Record<OtherMoon, THREE.Group | null>>>({});
  const edgeTextRefs = useRef<Partial<Record<OtherMoon, HTMLSpanElement | null>>>({});
  /** The planet frame (the oblate disk), re-oriented each frame to the true pole. */
  const frameRef = useRef<THREE.Group | null>(null);

  // Reused temporaries so the per-frame orientation update never allocates.
  const tmpPole = useMemo(() => new THREE.Vector3(), []);
  const upY = useMemo(() => new THREE.Vector3(0, 1, 0), []);

  const polarRatio = OTHER_PLANETS[planet].polarRadiusRatio;

  // Marker radius per moon (in planet radii). Enlarged mode keeps a roughly
  // constant on-screen size (scales with the framed field, capped so a moon is
  // never drawn larger than the disk) while preserving the moons' real size
  // ordering; true mode uses the honest angular radius (tiny, on purpose).
  const markerRadii = useMemo<Partial<Record<OtherMoon, number>>>(() => {
    const reqKm = OTHER_PLANETS[planet].equatorialRadiusKm;
    const maxRk = Math.max(...moons.map((m) => MOON_RADIUS_KM[m]));
    const enlargedBase = clamp(0.02 * targetReq, 0.1, 0.9);
    const out: Partial<Record<OtherMoon, number>> = {};
    for (const m of moons) {
      const rk = MOON_RADIUS_KM[m];
      const trueR = rk / reqKm;
      const enlargedR = enlargedBase * (rk / maxRk);
      out[m] = exaggerate ? Math.max(enlargedR, 0.06) : trueR;
    }
    return out;
  }, [planet, moons, targetReq, exaggerate]);

  // Per-frame: orient the disk to the true pole, place every moon at its real
  // (x, y, z), toggle its shadow dot, and route any off-frame moon to an edge
  // indicator. All off the React path. Every physics call is guarded against null.
  useFrame(() => {
    const date = new Date(displayedMsRef.current);

    const geo = planetGeocentric(planet, date);
    const frame = frameRef.current;
    if (geo && frame) {
      const g = systemSkyGeometry(planet, geo.raDeg, geo.decDeg, date);
      tmpPole.set(g.poleSky[0], g.poleSky[1], g.poleSky[2]);
      frame.quaternion.setFromUnitVectors(upY, tmpPole);
    }

    const positions = otherMoonPositions(planet, date);
    if (!positions) return;
    const field = targetReq * 1.06; // off-frame threshold (slightly past the edge)
    for (const p of positions) {
      const elong = Math.hypot(p.x, p.y);
      const off = elong > field;

      const marker = markerRefs.current[p.moon];
      if (marker) {
        marker.visible = !off;
        if (!off) marker.position.set(p.x, p.y, p.z);
      }

      const edge = edgeRefs.current[p.moon];
      if (edge) {
        edge.visible = off;
        if (off) {
          const k = (targetReq * 0.9) / (elong || 1);
          edge.position.set(p.x * k, p.y * k, EDGE_Z);
          const txt = edgeTextRefs.current[p.moon];
          if (txt) txt.textContent = `${p.moon} · ${elong.toFixed(0)} R`;
        }
      }

      const s = shadowRefs.current[p.moon];
      if (s) {
        const showShadow = p.inShadowTransit && !off;
        s.visible = showShadow;
        if (showShadow) s.position.set(p.shadowX, p.shadowY, SHADOW_Z);
      }
    }
  });

  return (
    <group>
      {/* The planet's oblate disk, re-oriented each frame to the true pole. */}
      <group ref={frameRef}>
        <PlanetDisk
          texture={textures.planets[planet]}
          polarRatio={polarRatio}
          fallbackColor={PLANET_FALLBACK_COLOR[planet]}
        />
      </group>

      <CompassLabels targetReq={targetReq} />

      {moons.map((moon) => {
        const retro = OTHER_MOONS[moon].retrograde;
        return (
          <group
            key={`marker-${moon}`}
            ref={(el) => {
              markerRefs.current[moon] = el;
            }}
          >
            <MoonMarker
              moon={moon}
              radius={markerRadii[moon] ?? 0.06}
              texture={textures.moons[moon] ?? null}
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
              <span>{moon}</span>
              {retro && (
                <span
                  title="Triton orbits Neptune retrograde (backwards): the only large retrograde moon."
                  style={{
                    marginLeft: 5,
                    padding: "0 4px",
                    borderRadius: 4,
                    border: "1px solid rgba(160,175,220,0.4)",
                    color: "rgba(180,192,225,0.95)",
                    fontSize: 8.5,
                    letterSpacing: "0.08em",
                  }}
                >
                  retrograde
                </span>
              )}
            </Html>
          </group>
        );
      })}

      {/* off-frame direction/distance indicators (Nereid, mainly) */}
      {moons.map((moon) => (
        <group
          key={`edge-${moon}`}
          visible={false}
          ref={(el) => {
            edgeRefs.current[moon] = el;
          }}
        >
          <mesh renderOrder={4}>
            <circleGeometry args={[Math.max(0.04 * targetReq, 0.08), 20]} />
            <meshBasicMaterial color={MOON_COLORS[moon]} toneMapped={false} />
          </mesh>
          <Html
            position={[0, 0, 0]}
            zIndexRange={[16, 0]}
            style={{
              pointerEvents: "none",
              userSelect: "none",
              whiteSpace: "nowrap",
              transform: "translate(-50%, -170%)",
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 9.5,
              letterSpacing: "0.05em",
              color: MOON_COLORS[moon],
              textShadow: "0 1px 3px rgba(0,0,0,0.95)",
            }}
          >
            <span
              ref={(el) => {
                edgeTextRefs.current[moon] = el;
              }}
            >
              {moon}
            </span>
          </Html>
        </group>
      ))}

      {/* dark shadow dots (hidden until a shadow transit is in progress) */}
      {moons.map((moon) => (
        <mesh
          key={`shadow-${moon}`}
          visible={false}
          renderOrder={3}
          ref={(el) => {
            shadowRefs.current[moon] = el;
          }}
        >
          <circleGeometry args={[markerRadii[moon] ?? 0.06, 24]} />
          <meshBasicMaterial color="#0a0b10" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────── planet disk ───────────────────────────────

/**
 * The planet as an OBLATE disk: a unit sphere squashed along its pole (local Y) to
 * the real polar ratio, textured with the reused map. Rendered unlit (meshBasic)
 * as an illustrative snapshot: the point of the tab is the moon geometry, not the
 * planet's own phase. Mars is a NASA/USGS MOLA map (color = elevation, not a
 * visible photo); Uranus and Neptune are Solar System Scope CC-BY textures
 * (stylized, credited in the panels and footer). The parent frame supplies the
 * true pole tilt.
 */
function PlanetDisk({
  texture,
  polarRatio,
  fallbackColor,
}: {
  texture: THREE.Texture | null;
  polarRatio: number;
  fallbackColor: string;
}) {
  return (
    <mesh scale={[1, polarRatio, 1]} renderOrder={0}>
      <sphereGeometry args={[1, 96, 72]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshBasicMaterial color={fallbackColor} toneMapped={false} />
      )}
    </mesh>
  );
}

// ─────────────────────────────── moon marker ───────────────────────────────

/**
 * One moon: a small textured sphere, or a flat tinted sphere when its map is
 * missing (Proteus / Nereid, illustrative, no fake surface detail).
 */
function MoonMarker({
  moon,
  radius,
  texture,
}: {
  moon: OtherMoon;
  radius: number;
  texture: THREE.Texture | null;
}) {
  const illustrative = ILLUSTRATIVE_MOONS.has(moon);
  return (
    <mesh renderOrder={2}>
      <sphereGeometry args={[radius, 24, 24]} />
      {texture && !illustrative ? (
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
 * X = west convention as lib/other-moons). Rebuilt when the field is reframed.
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
