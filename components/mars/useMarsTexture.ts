"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { prepTexture } from "@/components/globe/useBaseTextures";

/**
 * Expected Mars surface texture path.
 *
 * The texture is an equirectangular colorized MOLA shaded relief from the NASA
 * Scientific Visualization Studio, and it lives in one place.
 *
 * THERE USED TO BE THREE CANDIDATE PATHS, from when the asset had not been
 * delivered yet and the loader probed for wherever it might land. It has landed.
 * Two of those paths held byte-identical copies of the same 2.2 MB JPEG and the
 * third did not exist, so every deployment shipped the image twice to guard
 * against a 404 it could not actually suffer: all three candidates were static
 * files inside the same immutable deployment, so if one were missing the others
 * would be too.
 *
 * The procedural fallback below is the resilience that does something, and it
 * stays: if this file is missing or corrupt the globe renders a tinted rusty
 * Mars rather than breaking the scene.
 */
export const MARS_TEXTURE_CANDIDATES = ["/textures/mars-mola-colorized.jpg"] as const;

export interface MarsTextureState {
  /** the loaded surface texture, or null if none of the candidates exist yet */
  texture: THREE.Texture | null;
  /** true once we've finished probing (loaded or fell back) */
  ready: boolean;
  /** true when no real texture was found → shader uses the procedural fallback */
  usingFallback: boolean;
}

/**
 * Tries each candidate path in order; the first that loads wins. If none load
 * (data agent hasn't landed the texture yet) we return usingFallback = true and
 * the shader tints procedurally. Never throws, never blocks the scene.
 */
export function useMarsTexture(): MarsTextureState {
  const [state, setState] = useState<MarsTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();

    (async () => {
      for (const path of MARS_TEXTURE_CANDIDATES) {
        try {
          const tex = await loader.loadAsync(path);
          if (cancelled) {
            tex.dispose();
            return;
          }
          setState({ texture: prepTexture(tex), ready: true, usingFallback: false });
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
