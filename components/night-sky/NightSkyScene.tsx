"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  localSiderealTimeDeg,
  messierLabel,
  raDecToVector3,
  starLabel,
  type Constellation,
  type MessierObject,
  type Star,
} from "@/lib/star-facts";
import StarField from "./StarField";
import MessierMarkers from "./MessierMarkers";
import ConstellationLines from "./ConstellationLines";
import MilkyWay from "./MilkyWay";
import CelestialGrid from "./CelestialGrid";
import HorizonScene from "./HorizonScene";
import {
  NIGHT_SKY_ACCENT,
  STAR_SPHERE_RADIUS,
  type LayerState,
  type Observer,
  type Selection,
  type ViewMode,
} from "./constants";

const DEG2RAD = Math.PI / 180;

interface NightSkySceneProps {
  stars: Star[];
  messier: MessierObject[];
  constellations: Constellation[];
  byId: Map<number, Star>;
  layers: LayerState;
  mode: ViewMode;
  observer: Observer;
  date: Date;
  selected: Selection;
  onSelect: (sel: Selection) => void;
}

/**
 * The 3D centrepiece. All sky layers live in ONE group whose orientation is the
 * only thing that changes between the two modes:
 *   • "sky" (equatorial free-look): identity, the J2000 celestial sphere, N pole
 *     up, look anywhere.
 *   • "local" (sky from your location): the group is rotated by the real
 *     equatorial→horizon rotation for the observer's latitude and local sidereal
 *     time, so zenith is up and the horizon is level; stars below the horizon are
 *     hidden on the GPU and the ground occludes the lower hemisphere.
 * Star / Messier picking is done manually against the catalogue directions (the
 * incoming ray is rotated back into the equatorial frame), which is robust at
 * this scale where THREE.Points threshold-picking is not.
 */
export default function NightSkyScene({
  stars,
  messier,
  constellations,
  byId,
  layers,
  mode,
  observer,
  date,
  selected,
  onSelect,
}: NightSkySceneProps) {
  const dateMs = date.getTime();

  // Equatorial→horizon rotation + the observer "up row" (drives GPU horizon-hide).
  const { quaternion, upRow } = useMemo(() => {
    if (mode === "sky") {
      return {
        quaternion: new THREE.Quaternion(),
        upRow: [0, 1, 0] as [number, number, number],
      };
    }
    const lstDeg = localSiderealTimeDeg(new Date(dateMs), observer.lon) ?? 0;
    const theta = lstDeg * DEG2RAD;
    const phi = observer.lat * DEG2RAD;
    const ct = Math.cos(theta);
    const st = Math.sin(theta);
    const cphi = Math.cos(phi);
    const sphi = Math.sin(phi);
    // Rows: X(east)=[-st,0,-ct], Y(up)=[cphi*ct,sphi,-cphi*st], Z=[sphi*ct,-cphi,-sphi*st]
    const m = new THREE.Matrix4().set(
      -st, 0, -ct, 0,
      cphi * ct, sphi, -cphi * st, 0,
      sphi * ct, -cphi, -sphi * st, 0,
      0, 0, 0, 1
    );
    return {
      quaternion: new THREE.Quaternion().setFromRotationMatrix(m),
      upRow: [cphi * ct, sphi, -cphi * st] as [number, number, number],
    };
  }, [mode, observer.lat, observer.lon, dateMs]);

  const invQuat = useMemo(() => quaternion.clone().invert(), [quaternion]);
  const localMode = mode === "local";

  // Catalogue directions (unit vectors, equatorial frame) for manual picking.
  const starDirs = useMemo(() => {
    const arr = new Float32Array(stars.length * 3);
    for (let i = 0; i < stars.length; i++) {
      const [x, y, z] = raDecToVector3(stars[i].ra, stars[i].dec, 1);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [stars]);

  const messierDirs = useMemo(() => {
    const arr = new Float32Array(messier.length * 3);
    for (let i = 0; i < messier.length; i++) {
      const [x, y, z] = raDecToVector3(messier[i].ra, messier[i].dec, 1);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [messier]);

  const [hover, setHover] = useState<Selection>(null);
  const localDir = useRef(new THREE.Vector3());
  const lastHoverAt = useRef(0);
  const pointerDown = useRef<{ x: number; y: number; t: number } | null>(null);

  // altitude of a catalogue direction for the observer (local-mode horizon test)
  const aboveHorizon = (dx: number, dy: number, dz: number): boolean => {
    if (!localMode) return true;
    return upRow[0] * dx + upRow[1] * dy + upRow[2] * dz > 0;
  };

  /** Nearest catalogue object to a look direction (already in equatorial frame). */
  const pick = (dir: THREE.Vector3, fovDeg: number): Selection => {
    const thresholdRad = Math.max(0.006, fovDeg * DEG2RAD * 0.03);
    const starCos = Math.cos(thresholdRad);
    const messierCos = Math.cos(thresholdRad * 1.7);

    let bestStar = -1;
    let bestStarDot = -2;
    for (let i = 0; i < stars.length; i++) {
      const dx = starDirs[i * 3];
      const dy = starDirs[i * 3 + 1];
      const dz = starDirs[i * 3 + 2];
      if (!aboveHorizon(dx, dy, dz)) continue;
      const d = dir.x * dx + dir.y * dy + dir.z * dz;
      if (d > bestStarDot) {
        bestStarDot = d;
        bestStar = i;
      }
    }

    let bestMessier = -1;
    let bestMessierDot = -2;
    if (layers.messier) {
      for (let i = 0; i < messier.length; i++) {
        const dx = messierDirs[i * 3];
        const dy = messierDirs[i * 3 + 1];
        const dz = messierDirs[i * 3 + 2];
        if (!aboveHorizon(dx, dy, dz)) continue;
        const d = dir.x * dx + dir.y * dy + dir.z * dz;
        if (d > bestMessierDot) {
          bestMessierDot = d;
          bestMessier = i;
        }
      }
    }

    const messierHit = bestMessier >= 0 && bestMessierDot >= messierCos;
    const starHit = bestStar >= 0 && bestStarDot >= starCos;
    // a Messier marker is bigger, so let it win when it is genuinely closer
    if (messierHit && (!starHit || bestMessierDot >= bestStarDot)) {
      return { kind: "messier", obj: messier[bestMessier] };
    }
    if (starHit) return { kind: "star", star: stars[bestStar] };
    return null;
  };

  const toLocalDir = (e: ThreeEvent<PointerEvent>): THREE.Vector3 => {
    return localDir.current.copy(e.ray.direction).applyQuaternion(invQuat);
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const now = performance.now();
    if (now - lastHoverAt.current < 40) return; // ~25 Hz throttle
    lastHoverAt.current = now;
    const fov = (e.camera as THREE.PerspectiveCamera).fov;
    const sel = pick(toLocalDir(e), fov);
    setHover((prev) => (sameSelection(prev, sel) ? prev : sel));
    document.body.style.cursor = sel ? "pointer" : "auto";
  };

  const onPointerDownSphere = (e: ThreeEvent<PointerEvent>) => {
    pointerDown.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      t: performance.now(),
    };
  };

  const onPointerUpSphere = (e: ThreeEvent<PointerEvent>) => {
    const down = pointerDown.current;
    pointerDown.current = null;
    if (!down) return;
    const dx = e.nativeEvent.clientX - down.x;
    const dy = e.nativeEvent.clientY - down.y;
    // treat as a click only if the pointer barely moved (not a drag-to-rotate)
    if (Math.hypot(dx, dy) > 6 || performance.now() - down.t > 500) return;
    const fov = (e.camera as THREE.PerspectiveCamera).fov;
    onSelect(pick(toLocalDir(e), fov));
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  // reset cursor when the pointer leaves any interaction
  useEffect(() => {
    if (!hover) document.body.style.cursor = "auto";
  }, [hover]);

  return (
    <>
      <group quaternion={quaternion}>
        {layers.milkyWay && <MilkyWay />}
        <CelestialGrid show={layers.grid} />
        <ConstellationLines
          constellations={constellations}
          byId={byId}
          showLines={layers.constellationLines}
          showNames={layers.constellationNames}
        />
        <StarField stars={stars} localMode={localMode} upRow={upRow} />
        {layers.messier && (
          <MessierMarkers objects={messier} localMode={localMode} upRow={upRow} />
        )}

        <BrightStarLabels stars={stars} localMode={localMode} upRow={upRow} />

        {/* highlight rings for the selected + hovered objects */}
        <SelectionMarker selection={selected} strong />
        {!sameSelection(hover, selected) && <SelectionMarker selection={hover} />}

        {/* invisible dome that catches every ray, for manual picking */}
        <mesh
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDownSphere}
          onPointerUp={onPointerUpSphere}
        >
          <sphereGeometry args={[STAR_SPHERE_RADIUS * 0.95, 24, 16]} />
          <meshBasicMaterial
            side={THREE.BackSide}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            colorWrite={false}
          />
        </mesh>
      </group>

      {localMode && <HorizonScene />}
    </>
  );
}

/** Always-on labels for the brightest NAMED stars, capped for legibility. */
const MAX_BRIGHT_LABELS = 22;

function BrightStarLabels({
  stars,
  localMode,
  upRow,
}: {
  stars: Star[];
  localMode: boolean;
  upRow: readonly [number, number, number];
}) {
  const labeled = useMemo(() => {
    return stars
      .filter((s) => s.name)
      .sort((a, b) => a.mag - b.mag)
      .slice(0, MAX_BRIGHT_LABELS)
      .map((s) => {
        const dir = raDecToVector3(s.ra, s.dec, 1);
        return {
          id: s.id,
          name: s.name as string,
          dir,
          pos: raDecToVector3(s.ra, s.dec, STAR_SPHERE_RADIUS * 0.99),
        };
      });
  }, [stars]);

  return (
    <group>
      {labeled.map((l) => {
        if (localMode) {
          const up = upRow[0] * l.dir[0] + upRow[1] * l.dir[1] + upRow[2] * l.dir[2];
          if (up <= 0) return null; // below the horizon: hidden with its star
        }
        return (
          <Html
            key={l.id}
            position={l.pos}
            center
            zIndexRange={[9, 0]}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <div
              style={{
                whiteSpace: "nowrap",
                transform: "translate(12px, -2px)",
                fontFamily: "var(--font-plex-mono, monospace)",
                fontSize: 9.5,
                letterSpacing: "0.03em",
                color: "#c7ccdb",
                opacity: 0.7,
                textShadow: "0 1px 5px rgba(0,0,0,0.9)",
              }}
            >
              {l.name}
            </div>
          </Html>
        );
      })}
    </group>
  );
}

function sameSelection(a: Selection, b: Selection): boolean {
  if (a === null || b === null) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === "star" && b.kind === "star") return a.star.id === b.star.id;
  if (a.kind === "messier" && b.kind === "messier") return a.obj.m === b.obj.m;
  return false;
}

function SelectionMarker({
  selection,
  strong = false,
}: {
  selection: Selection;
  strong?: boolean;
}) {
  if (!selection) return null;
  const [ra, dec, label, color] =
    selection.kind === "star"
      ? [selection.star.ra, selection.star.dec, starLabel(selection.star), NIGHT_SKY_ACCENT]
      : [selection.obj.ra, selection.obj.dec, messierLabel(selection.obj), "#ffd479"];
  const pos = raDecToVector3(ra as number, dec as number, STAR_SPHERE_RADIUS * 0.98);

  return (
    <Html
      position={pos}
      center
      zIndexRange={[18, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div style={{ position: "relative", width: 0, height: 0 }}>
        <div
          style={{
            position: "absolute",
            left: -14,
            top: -14,
            width: 28,
            height: 28,
            borderRadius: "9999px",
            border: `1.5px solid ${color as string}`,
            opacity: strong ? 0.95 : 0.5,
            boxShadow: strong ? `0 0 10px ${color as string}66` : "none",
          }}
        />
        {strong && (
          <div
            style={{
              position: "absolute",
              left: 20,
              top: -8,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-plex-mono, monospace)",
              fontSize: 11,
              letterSpacing: "0.04em",
              color: "#edf0f5",
              textShadow: "0 1px 6px rgba(0,0,0,0.9)",
            }}
          >
            {label as string}
          </div>
        )}
      </div>
    </Html>
  );
}
