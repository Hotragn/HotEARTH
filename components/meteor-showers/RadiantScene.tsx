"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import {
  activityFraction,
  isActive,
  isNearPeak,
  radiantVector3,
  type MeteorShowerRecord,
} from "@/lib/meteor-facts";
import StarBackdrop from "./StarBackdrop";
import RadiantMarkers from "./RadiantMarkers";
import MeteorStreaks from "./MeteorStreaks";
import { METEOR_ACCENT, RADIANT_SPHERE_RADIUS } from "./constants";

const DEG2RAD = Math.PI / 180;
/** Cap on simultaneously-streaking showers, so a busy night stays smooth. */
const MAX_STREAK_SHOWERS = 4;

interface RadiantSceneProps {
  showers: MeteorShowerRecord[];
  backdrop: Float32Array | null;
  date: Date;
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
}

/**
 * The 3D centrepiece: real star backdrop, every shower's radiant as a labelled
 * marker, and illustrative streaks radiating from the active/selected radiants.
 * All picking is manual (nearest radiant direction to the look/click ray) against
 * an invisible dome: the same robust approach the Night Sky uses, because
 * OrbitControls + THREE.Points threshold-picking do not mix well.
 */
export default function RadiantScene({
  showers,
  backdrop,
  date,
  selectedCode,
  onSelect,
}: RadiantSceneProps) {
  const dateMs = date.getTime();

  const activeCodes = useMemo(() => {
    const set = new Set<string>();
    for (const s of showers) if (isActive(s, new Date(dateMs)) === true) set.add(s.code);
    return set;
  }, [showers, dateMs]);

  const nearPeakCodes = useMemo(() => {
    const set = new Set<string>();
    for (const s of showers) if (isNearPeak(s, new Date(dateMs), 2) === true) set.add(s.code);
    return set;
  }, [showers, dateMs]);

  // Unit radiant directions (equatorial frame) for manual picking.
  const dirs = useMemo(() => {
    const arr = new Float32Array(showers.length * 3);
    for (let i = 0; i < showers.length; i++) {
      const v = radiantVector3(showers[i], 1);
      if (v) {
        arr[i * 3] = v[0];
        arr[i * 3 + 1] = v[1];
        arr[i * 3 + 2] = v[2];
      }
    }
    return arr;
  }, [showers]);

  // Which radiants get streaks: the selected one plus the strongest active ones.
  const streakShowers = useMemo(() => {
    const chosen: MeteorShowerRecord[] = [];
    const seen = new Set<string>();
    const selected = showers.find((s) => s.code === selectedCode);
    if (selected) {
      chosen.push(selected);
      seen.add(selected.code);
    }
    const active = showers
      .filter((s) => activeCodes.has(s.code) && !seen.has(s.code))
      .sort((a, b) => (b.zhr ?? 0) - (a.zhr ?? 0));
    for (const s of active) {
      if (chosen.length >= MAX_STREAK_SHOWERS) break;
      chosen.push(s);
      seen.add(s.code);
    }
    return chosen.map((s) => {
      const v = radiantVector3(s, 1) ?? [0, 1, 0];
      const af = activityFraction(s, new Date(dateMs));
      const selectedHere = s.code === selectedCode;
      const intensity = selectedHere ? 1 : 0.35 + 0.65 * (af ?? 0.5);
      return { code: s.code, radiant: v as [number, number, number], intensity };
    });
  }, [showers, activeCodes, selectedCode, dateMs]);

  const [hovered, setHovered] = useState<string | null>(null);
  const lastHoverAt = useRef(0);
  const pointerDown = useRef<{ x: number; y: number; t: number } | null>(null);
  const lookDir = useRef(new THREE.Vector3());

  const pick = (dir: THREE.Vector3, fovDeg: number): string | null => {
    const thresholdRad = Math.max(0.02, fovDeg * DEG2RAD * 0.06);
    const minCos = Math.cos(thresholdRad);
    let best = -1;
    let bestDot = -2;
    for (let i = 0; i < showers.length; i++) {
      const d = dir.x * dirs[i * 3] + dir.y * dirs[i * 3 + 1] + dir.z * dirs[i * 3 + 2];
      if (d > bestDot) {
        bestDot = d;
        best = i;
      }
    }
    return best >= 0 && bestDot >= minCos ? showers[best].code : null;
  };

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const now = performance.now();
    if (now - lastHoverAt.current < 40) return;
    lastHoverAt.current = now;
    const fov = (e.camera as THREE.PerspectiveCamera).fov;
    const dir = lookDir.current.copy(e.ray.direction).normalize();
    const code = pick(dir, fov);
    setHovered((prev) => (prev === code ? prev : code));
    document.body.style.cursor = code ? "pointer" : "auto";
  };

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    pointerDown.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      t: performance.now(),
    };
  };

  const onPointerUp = (e: ThreeEvent<PointerEvent>) => {
    const down = pointerDown.current;
    pointerDown.current = null;
    if (!down) return;
    const dx = e.nativeEvent.clientX - down.x;
    const dy = e.nativeEvent.clientY - down.y;
    if (Math.hypot(dx, dy) > 6 || performance.now() - down.t > 500) return; // a drag
    const fov = (e.camera as THREE.PerspectiveCamera).fov;
    const dir = lookDir.current.copy(e.ray.direction).normalize();
    onSelect(pick(dir, fov));
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <>
      {backdrop && <StarBackdrop positions={backdrop} />}

      <RadiantMarkers
        showers={showers}
        activeCodes={activeCodes}
        nearPeakCodes={nearPeakCodes}
        selectedCode={selectedCode}
        hoveredCode={hovered}
      />

      {streakShowers.map((s) => (
        <MeteorStreaks
          key={s.code}
          radiant={s.radiant}
          color={METEOR_ACCENT}
          intensity={s.intensity}
        />
      ))}

      {/* invisible dome that catches every ray, for manual picking */}
      <mesh onPointerMove={onPointerMove} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <sphereGeometry args={[RADIANT_SPHERE_RADIUS * 0.95, 24, 16]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          colorWrite={false}
        />
      </mesh>
    </>
  );
}
