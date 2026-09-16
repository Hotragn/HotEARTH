"use client";

import { useEffect, useRef } from "react";
import { buildEraScene, type EraScene } from "@/lib/chrono-era";

/**
 * Experimental "Era Scene" vignette: the clearly-labeled ARTISTIC layer.
 * Renders a PROCEDURAL, stylized era panel to a small canvas: an
 * era-appropriate sky, abstract skyline silhouettes that grow from huts →
 * temples → towers → factories → skyscrapers as the year advances, and abstract
 * figure silhouettes. Purely generated from the year (+ region seed). No
 * external API, no photorealism, no data claim: the header says so.
 *
 * Only shown when zoomed close (parent gates on LOD) and the mode is enabled.
 * Redraws only when the era scene meaningfully changes (year rounded), so it
 * doesn't churn every frame.
 */

const W = 240;
const H = 150;

function draw(ctx: CanvasRenderingContext2D, scene: EraScene) {
  const { palette, structures, figures } = scene;

  // sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // a soft "sun/moon" disc, position varies subtly with development
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = palette.accent;
  const discX = W * (0.2 + scene.development * 0.5);
  ctx.beginPath();
  ctx.arc(discX, H * 0.3, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const groundY = H * 0.82;

  // skyline silhouettes
  ctx.fillStyle = palette.structure;
  for (const s of structures) {
    const bw = Math.max(6, s.width * W * 3);
    const bh = s.height * (groundY - 8);
    const bx = s.x * W - bw / 2;
    const by = groundY - bh;
    ctx.fillRect(bx, by, bw, bh);
    // roof shape by era vocabulary
    if (s.kind === "temple") {
      ctx.beginPath();
      ctx.moveTo(bx - 3, by);
      ctx.lineTo(bx + bw / 2, by - 8);
      ctx.lineTo(bx + bw + 3, by);
      ctx.closePath();
      ctx.fill();
    } else if (s.kind === "hut") {
      ctx.beginPath();
      ctx.moveTo(bx - 2, by);
      ctx.lineTo(bx + bw / 2, by - bh * 0.5);
      ctx.lineTo(bx + bw + 2, by);
      ctx.closePath();
      ctx.fill();
    } else if (s.kind === "factory") {
      // a chimney
      ctx.fillRect(bx + bw * 0.7, by - 10, Math.max(2, bw * 0.18), 10);
    }
    // lit accents (windows / fires)
    if (s.lit > 0.3) {
      ctx.save();
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.55 * s.lit;
      const cols = Math.max(1, Math.floor(bw / 6));
      const rows = Math.max(1, Math.floor(bh / 8));
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r * 7 + c * 13 + Math.floor(s.x * 100)) % 3 === 0) {
            ctx.fillRect(bx + 2 + c * 6, by + 3 + r * 8, 2, 3);
          }
        }
      }
      ctx.restore();
    }
  }

  // ground band
  ctx.fillStyle = palette.ground;
  ctx.fillRect(0, groundY, W, H - groundY);

  // abstract figure silhouettes in the foreground
  ctx.fillStyle = palette.structure;
  for (const f of figures) {
    const fx = f.x * W;
    const fh = 12 * f.scale;
    const fy = H - 4;
    // head
    ctx.beginPath();
    ctx.arc(fx, fy - fh, fh * 0.28, 0, Math.PI * 2);
    ctx.fill();
    // body
    ctx.fillRect(fx - fh * 0.16, fy - fh * 0.7, fh * 0.32, fh * 0.7);
  }
}

export default function EraScenePanel({
  year,
  regionSeed,
  onClose,
}: {
  year: number;
  regionSeed: number;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastKey = useRef<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // redraw only when the rounded year / region changes (no per-frame churn)
    const key = `${Math.round(year)}:${regionSeed}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    const scene = buildEraScene(year, regionSeed);
    draw(ctx, scene);
  }, [year, regionSeed]);

  return (
    <section
      aria-label="Era scene (artistic interpretation)"
      className="pointer-events-auto absolute right-3 top-20 w-[256px] animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between px-3 pt-2.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#b9a6ff]">
            Era scene
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hide era scene"
            className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-faint transition-colors hover:text-ice"
          >
            hide
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="mt-2 block w-full"
          style={{ imageRendering: "auto" }}
        />
        <p className="px-3 pb-3 pt-2 text-[10px] leading-relaxed text-faint">
          Artistic interpretation: procedurally generated, not data.
        </p>
      </div>
    </section>
  );
}
