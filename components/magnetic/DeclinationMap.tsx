"use client";

import { useEffect, useRef, useState } from "react";
import {
  coefficientsAt,
  fieldAt,
  fieldFromCoefficients,
  type IgrfModel,
} from "@/lib/geomagnetism";
import { AGONIC_COLOR, EAST_COLOR, MAGNETIC_ACCENT, WEST_COLOR } from "./magneticUi";

/**
 * The whole planet's compass error, computed in the browser.
 *
 * Every pixel here is a spherical harmonic synthesis: about ten thousand of
 * them, from 195 numbers, in around a tenth of a second. Nothing is a picture
 * of a chart. That is why the map can be drawn for any year the model covers,
 * and why the agonic lines move when you change the year.
 *
 * The agonic lines are the important feature and are drawn explicitly rather
 * than left to the colour scale: they are where declination is exactly zero, the
 * only places on Earth where a compass tells the truth. There are two, one
 * running through the Americas and one through Asia, and they move a few
 * kilometres a year.
 */

const W = 720;
const H = 360;
/**
 * Sampling step in degrees. Each sample is a full degree-13 synthesis at about
 * ten microseconds, so 1.5 degrees is 28,800 of them and roughly a third of a
 * second: fine enough that the agonic lines are smooth, coarse enough that the
 * map appears rather than arrives.
 */
const STEP = 1.5;

export default function DeclinationMap({
  model,
  year,
  markerLat,
  markerLon,
  markerLabel,
}: {
  model: IgrfModel;
  year: number;
  markerLat: number;
  markerLon: number;
  markerLabel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cost, setCost] = useState<{ ms: number; points: number } | null>(null);
  const [hover, setHover] = useState<{
    lat: number;
    lon: number;
    declination: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = Math.round(360 / STEP);
    const rows = Math.round(180 / STEP);
    const cw = W / cols;
    const ch = H / rows;

    // Interpolate the coefficients ONCE. Doing it inside the loop instead, which
    // is what fieldAt does, allocates a fresh 195-element array per sample.
    const coeffs = coefficientsAt(model, year);
    if (!coeffs) return;

    const dec = new Float64Array(cols * rows);
    let cancelled = false;
    let frame = 0;
    let computeMs = 0;

    ctx.clearRect(0, 0, W, H);

    /**
     * The sweep is spread across animation frames rather than run in one block.
     *
     * Warm, the whole pass is a few hundred milliseconds. On the FIRST render of
     * a fresh page it is closer to two seconds, because none of this arithmetic
     * has been JIT-compiled yet, and two seconds in one block freezes scrolling
     * on the tab's headline visual.
     *
     * Each frame paints only the band it just computed. The first attempt
     * repainted the entire raster every frame, which turned fifteen frames into
     * fifteen full redraws and made the wall-clock time four times WORSE than the
     * blocking version it replaced. Doing less per frame was the whole point.
     */
    const BAND = 10;

    const paintBand = (fromRow: number, toRow: number) => {
      const n = toRow - fromRow;
      if (n <= 0) return;
      // Drawn as an image at sample resolution and scaled up, rather than as one
      // filled rectangle per sample. The rectangles were a mistake worth
      // recording: drawn a pixel oversized to avoid hairline seams, and since
      // each carries an alpha under 1, every overlap composited twice and the
      // map picked up a visible lattice of darker dots.
      const off = document.createElement("canvas");
      off.width = cols;
      off.height = n;
      const offCtx = off.getContext("2d");
      if (!offCtx) return;
      const img = offCtx.createImageData(cols, n);
      for (let i = 0; i < cols * n; i++) {
        const d = dec[fromRow * cols + i];
        const px = i * 4;
        if (!Number.isFinite(d)) {
          img.data[px + 3] = 0;
          continue;
        }
        const [r8, g8, b8, a8] = shadeRgba(d);
        img.data[px] = r8;
        img.data[px + 1] = g8;
        img.data[px + 2] = b8;
        img.data[px + 3] = a8;
      }
      offCtx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, 0, fromRow * ch, W, n * ch);
    };

    /** The agonic lines and the graticule, once the field is finished. */
    const paintOverlay = () => {
      ctx.fillStyle = AGONIC_COLOR;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols - 1; c++) {
          const a = dec[r * cols + c];
          const b = dec[r * cols + c + 1];
          if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
          // A sign change across a 90 degree jump is the atan2 branch cut near
          // the poles, not a zero crossing.
          if (a === 0 || (a < 0 !== b < 0 && Math.abs(a - b) < 90)) {
            // Interpolate to where the sign actually flips instead of marking
            // the whole cell: at 1.5 degree sampling a filled cell is three
            // pixels of staircase, and this line is the one feature on the map
            // worth drawing precisely.
            const frac = a === b ? 0.5 : a / (a - b);
            const x = (c + 0.5 + Math.max(0, Math.min(1, frac))) * cw;
            const y = (r + 0.5) * ch;
            ctx.beginPath();
            ctx.arc(x, y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      for (let lat = -60; lat <= 60; lat += 30) {
        const y = ((90 - lat) / 180) * H;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let lon = -120; lon <= 120; lon += 60) {
        const x = ((lon + 180) / 360) * W;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();
    };

    const sweep = (fromRow: number) => {
      if (cancelled) return;
      const until = Math.min(rows, fromRow + BAND);
      const t0 = performance.now();
      for (let r = fromRow; r < until; r++) {
        const lat = 90 - (r + 0.5) * STEP;
        for (let c = 0; c < cols; c++) {
          const lon = -180 + (c + 0.5) * STEP;
          const f = fieldFromCoefficients(coeffs, model.maxDegree, lat, lon, 0);
          dec[r * cols + c] = f ? f.declination : NaN;
        }
      }
      computeMs += performance.now() - t0;
      paintBand(fromRow, until);
      if (until < rows) {
        frame = requestAnimationFrame(() => sweep(until));
        return;
      }
      paintOverlay();
      // The synthesis time, not the wall clock: the frames in between are the
      // browser being allowed to do its job, and counting them here would be
      // reporting politeness as cost.
      setCost({ ms: Math.round(computeMs), points: cols * rows });
    };

    sweep(0);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [model, year]);

  const mx = ((markerLon + 180) / 360) * 100;
  const my = ((90 - markerLat) / 180) * 100;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    const lon = fx * 360 - 180;
    const lat = 90 - fy * 180;
    const f = fieldAt(model, lat, lon, 0, year);
    setHover(f ? { lat, lon, declination: f.declination } : null);
  };

  return (
    <figure className="hud-panel rounded-2xl p-4">
      <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-base font-medium tracking-tight text-ice">
          How wrong a compass is, everywhere, in {Math.floor(year)}
        </h2>
        <p className="font-mono text-[10px] text-faint">
          {cost
            ? `${cost.points.toLocaleString()} field syntheses in ${cost.ms} ms`
            : "computing"}
        </p>
      </figcaption>

      <div
        className="relative overflow-hidden rounded-xl border border-line/60"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full"
          aria-label={`World map of magnetic declination for ${Math.floor(
            year
          )}, computed from the IGRF-14 coefficients. Blue where a compass points east of true north, orange where it points west, with pale agonic lines through the Americas and Asia where the error is zero.`}
        />

        {/* your location */}
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${mx}%`, top: `${my}%` }}
        >
          <span
            className="block h-2.5 w-2.5 rounded-full border-2"
            style={{ borderColor: MAGNETIC_ACCENT, backgroundColor: "rgba(0,0,0,0.4)" }}
          />
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex items-center gap-2 font-mono text-[10px] text-faint">
          <span style={{ color: WEST_COLOR }}>west</span>
          <span
            className="h-2 w-28 rounded-full"
            style={{
              // Sampled from the same function the map uses, so the key cannot
              // drift away from the picture it is describing.
              background: `linear-gradient(90deg, ${[-30, -20, -10, 0, 10, 20, 30]
                .map((d) => declinationCss(d))
                .join(", ")})`,
            }}
          />
          <span style={{ color: EAST_COLOR }}>east</span>
          <span>· pale line: declination exactly zero</span>
        </div>
        <p className="font-mono text-[10px] text-dim">
          {hover
            ? `${Math.abs(hover.lat).toFixed(0)}° ${hover.lat >= 0 ? "N" : "S"}, ${Math.abs(
                hover.lon
              ).toFixed(0)}° ${hover.lon >= 0 ? "E" : "W"}: ${Math.abs(
                hover.declination
              ).toFixed(1)}° ${hover.declination >= 0 ? "east" : "west"}`
            : `marker: ${markerLabel}`}
        </p>
      </div>

      <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-faint">
        Equirectangular, no coastlines: this is the field, not a geographical map.
        Near the poles the colours saturate because declination there runs to
        every value at once, which is exactly why a compass is useless above
        about 80 degrees and polar navigation uses a gyro or the sky.
      </p>
    </figure>
  );
}

/**
 * Diverging colour scale, saturating at 30 degrees.
 *
 * Deliberately not a rainbow: the sign is the information, so the scale puts
 * east and west on opposite hues and lets zero fall away to the background.
 *
 * The first version blended toward white at zero AND dropped the opacity, which
 * turned everything between about 5 and 15 degrees into indistinguishable grey.
 * Keeping the hue pure and ramping only the opacity reads properly on a dark
 * page: the agonic band is where the colour runs out, and the pale line drawn
 * over it marks exactly where the sign flips.
 */
function shadeRgba(deg: number): [number, number, number, number] {
  const t = Math.max(-1, Math.min(1, deg / 30));
  const a = Math.abs(t);
  const [r, g, b] = t >= 0 ? [111, 211, 255] : [255, 139, 107];
  // sqrt so the first few degrees are already visible: most of the inhabited
  // world sits under 20 degrees and a linear ramp hides all of it.
  return [r, g, b, Math.round(255 * (0.1 + 0.8 * Math.sqrt(a)))];
}

/** The same scale as a CSS colour, for the legend. */
export function declinationCss(deg: number): string {
  const [r, g, b, a] = shadeRgba(deg);
  return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`;
}
