"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { appearanceFor, type SmallBodyObject } from "@/lib/small-body-facts";
import SmallBodySphere from "./SmallBodySphere";
import { useSmallBodyTexture } from "./useSmallBodyTexture";

/** Rocky tint from albedo (carbonaceous dark → bright tan); icy grey for comets. */
function lumpTint(o: SmallBodyObject): [number, number, number] {
  if (o.kind === "comet") return [0.3, 0.33, 0.38];
  const a = o.physical.albedo;
  const t = a != null ? Math.min(1, Math.max(0, (a - 0.03) / 0.4)) : 0.4;
  const dark = [0.24, 0.22, 0.2];
  const light = [0.72, 0.66, 0.55];
  return [
    dark[0] + (light[0] - dark[0]) * t,
    dark[1] + (light[1] - dark[1]) * t,
    dark[2] + (light[2] - dark[2]) * t,
  ];
}

interface SmallBodyDetailCanvasProps {
  object: SmallBodyObject;
  /** reports whether a real MAP texture loaded (true = illustrative / fallback) */
  onFallback?: (usingFallback: boolean) => void;
}

/**
 * Full-viewport detail canvas for one small body. The Sun (a fixed directional
 * light) lights the body from one side while it tumbles, so the terminator reads.
 * MAP bodies (Eros/Vesta/Bennu) wear their real mosaic on a displaced sphere;
 * every other body is an illustrative lump. A prominent badge states which: and
 * for the single-view PHOTO bodies, points to the real flat photo in the HUD.
 */
export default function SmallBodyDetailCanvas({
  object,
  onFallback,
}: SmallBodyDetailCanvasProps) {
  const [interacted, setInteracted] = useState(false);
  const { texture, ready, usingFallback } = useSmallBodyTexture(object);
  const appearance = appearanceFor(object);
  const tint = lumpTint(object);

  useEffect(() => {
    if (ready) onFallback?.(usingFallback);
  }, [ready, usingFallback, onFallback]);

  const badge =
    appearance.kind === "map" && !usingFallback
      ? { top: "Real imagery", sub: "shape approximated, rendered on a sphere" }
      : appearance.kind === "photo"
        ? { top: "Illustrative shape", sub: "real mission photo shown in the panel" }
        : { top: "Illustrative", sub: "no detailed imagery of this body exists" };

  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 2]}
      camera={{ position: [0, 0.6, 3.4], fov: 42, near: 0.1, far: 200 }}
      gl={{ powerPreference: "high-performance", antialias: true, alpha: false }}
      onCreated={({ gl }) => gl.setClearColor("#05060a")}
    >
      <Stars radius={90} depth={45} count={4200} factor={2.6} saturation={0} fade speed={0.25} />

      {/* the Sun: a fixed key light, plus a hair of ambient so the dark limb reads */}
      <ambientLight intensity={0.14} />
      <directionalLight position={[4, 1.5, 2.5]} intensity={2.1} color="#fff3d6" />

      <SmallBodySphere
        appearance={appearance.kind}
        texture={texture}
        seedId={object.designation ?? object.name}
        tint={tint}
      />

      {/* prominent appearance badge */}
      <Html
        position={[0, 1.7, 0]}
        center
        distanceFactor={7}
        zIndexRange={[30, 0]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <div
          style={{
            whiteSpace: "nowrap",
            textAlign: "center",
            fontFamily: "var(--font-plex-mono, monospace)",
            padding: "5px 12px",
            borderRadius: 999,
            border:
              appearance.kind === "map" && !usingFallback
                ? "1px solid rgba(95,211,230,0.5)"
                : "1px solid rgba(242,166,59,0.5)",
            background:
              appearance.kind === "map" && !usingFallback
                ? "rgba(95,211,230,0.12)"
                : "rgba(242,166,59,0.12)",
            color:
              appearance.kind === "map" && !usingFallback ? "#5fd3e6" : "#f2a63b",
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            backdropFilter: "blur(4px)",
          }}
        >
          {badge.top}
          <div
            style={{
              marginTop: 2,
              fontSize: 8.5,
              letterSpacing: "0.03em",
              textTransform: "none",
              color: "#9aa2b1",
            }}
          >
            {badge.sub}
          </div>
        </div>
      </Html>

      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.45}
        zoomSpeed={0.65}
        minDistance={1.6}
        maxDistance={9}
        autoRotate={!interacted}
        autoRotateSpeed={0.24}
        onStart={() => setInteracted(true)}
      />
    </Canvas>
  );
}
