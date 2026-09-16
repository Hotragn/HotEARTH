"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { prepTexture } from "@/components/globe/useBaseTextures";

/**
 * Expected Moon surface texture path(s).
 *
 * Another process is dropping a real public-domain lunar basemap (NASA SVS CGI
 * Moon Kit: LROC WAC 4k color, or a Kaguya mosaic; see
 * docs/MOON_DATA_SOURCES.md §1). Preferred: an equirectangular (2:1) JPEG,
 * 4096×2048, from the LROC WAC global mosaic (public domain, credit
 * "NASA SVS / LROC / ASU"). Until it lands, the loader 404s and the globe
 * renders a procedural grey cratered Moon so the build/scene never breaks.
 *
 * Candidate paths (probed in order; first that loads wins):
 *   /data/moon/moon-color.jpg     ← preferred, alongside the diurnal artifact
 *   /textures/moon-lroc.jpg       ← alt location, matches Earth/Mars textures
 */
export const MOON_TEXTURE_CANDIDATES = [
  "/data/moon/moon-color.jpg",
  "/textures/moon-lroc.jpg",
] as const;

export interface MoonTextureState {
  /** the loaded surface texture, or null if none of the candidates exist yet */
  texture: THREE.Texture | null;
  /** true once we've finished probing (loaded or fell back) */
  ready: boolean;
  /** true when no real texture was found → shader uses the procedural fallback */
  usingFallback: boolean;
}

/**
 * Tries each candidate path in order; the first that loads wins. If none load
 * (texture hasn't landed yet) we return usingFallback = true and the shader
 * tints procedurally. Never throws, never blocks the scene. Disposes the
 * texture on unmount. Mirrors useMarsTexture.
 */
export function useMoonTexture(): MoonTextureState {
  const [state, setState] = useState<MoonTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    (async () => {
      for (const path of MOON_TEXTURE_CANDIDATES) {
        try {
          const tex = await loader.loadAsync(path);
          if (cancelled) {
            tex.dispose();
            return;
          }
          setState({
            texture: prepTexture(tex),
            ready: true,
            usingFallback: false,
          });
          return;
        } catch {
          // try the next candidate
        }
      }
      if (!cancelled) {
        setState({ texture: null, ready: true, usingFallback: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // dispose the texture on unmount
  useEffect(() => {
    return () => {
      state.texture?.dispose();
    };
    // only dispose the final texture instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.texture]);

  return state;
}
