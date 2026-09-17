"use client";

import { useEffect, useRef, useState } from "react";
import {
  HERO_POSTER_SRC,
  HERO_VIDEO_CREDIT,
  HERO_VIDEO_LABEL,
  HERO_VIDEO_SRC,
  REAL_IMAGERY,
} from "./interstellarUi";

/**
 * The page's visual backbone: REAL, public-domain NASA/ESA footage (the silent
 * NASA/STScI galactic-center visualization) as a muted, looping full-bleed
 * background, with a dark gradient overlay for text legibility. This replaces the
 * old procedural starfield "comp" so the page reads as real cosmos.
 *
 * Honesty + accessibility: a small "real NASA/ESA footage" credit is pinned on the
 * backdrop; when the user prefers reduced motion (or the video cannot play) we
 * pause and show a real still (the Spitzer galactic-center image) instead of
 * animating. The <video> is client-only, muted, autoplays inline (allowed muted),
 * and is cleaned up on unmount. It never intercepts pointer events; the 3D
 * canvases and HUD render on top of it.
 */
export default function InterstellarBackdrop() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [reduced, setReduced] = useState(false);
  const [canPlay, setCanPlay] = useState(true);

  // Respect prefers-reduced-motion: pause the video and show the still instead.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  // Drive playback from the reduced-motion preference; ignore rejected play().
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (reduced) {
      el.pause();
    } else {
      void el.play().catch(() => setCanPlay(false));
    }
  }, [reduced]);

  const showStill = reduced || !canPlay;
  // The still and its own credit, so the caption can describe what is visible.
  const still = REAL_IMAGERY[0];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-abyss">
      {/* the real NASA/ESA galactic-center video (muted, looping, silent source) */}
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          showStill ? "opacity-0" : "opacity-100"
        }`}
        src={HERO_VIDEO_SRC}
        poster={HERO_POSTER_SRC}
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setCanPlay(false)}
        onCanPlay={() => setCanPlay(true)}
      />

      {/* reduced-motion / no-video fallback: a real still (Spitzer galactic center) */}
      {showStill && (
        <div
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_POSTER_SRC})` }}
        />
      )}

      {/* dark gradient wash for legibility of the HUD text on top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 30%, rgba(4,6,12,0.30) 0%, rgba(4,6,12,0.62) 55%, rgba(3,4,8,0.86) 100%)",
        }}
      />

      {/*
        Honesty credit pinned to the footage, and it credits WHAT IS ACTUALLY ON
        SCREEN. This block used to name the video unconditionally, including when
        the still was showing, which meant a photograph credited as footage
        whenever a visitor preferred reduced motion. On a site whose claim is
        that every asset is credited, crediting the wrong one is the one thing
        this panel must not do.
      */}
      <div className="absolute bottom-2 left-3 max-w-[300px] sm:bottom-3 sm:left-4">
        <p className="font-mono text-[9px] leading-snug text-faint/85">
          {showStill ? `Real NASA imagery: ${still.title}. ${still.fact}` : HERO_VIDEO_LABEL}
          <br />
          <span className="text-faint/70">
            {showStill ? still.credit : HERO_VIDEO_CREDIT}
          </span>
        </p>
      </div>
    </div>
  );
}
