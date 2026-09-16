"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { prepTexture } from "@/components/globe/useBaseTextures";
import { appearanceFor, type SmallBodyObject } from "@/lib/small-body-facts";

/**
 * Loads a small body's MAP texture from /textures/small-bodies/{file}.jpg: but
 * ONLY for the three bodies whose imagery is a wrappable equirectangular mosaic
 * (433 Eros, 4 Vesta, 101955 Bennu). Everything else renders an illustrative
 * procedural lump (no texture), and the single-view mission PHOTOS (Gaspra, Ida,
 * Didymos, 67P) are shown FLAT in the detail panel, never wrapped on the sphere:
 * so this hook never fetches for those. Mirrors useDwarfTexture: if a map 404s
 * the sphere falls back to the lump. Disposes on unmount; never throws.
 */
export interface SmallBodyTextureState {
  texture: THREE.Texture | null;
  ready: boolean;
  usingFallback: boolean;
}

export function useSmallBodyTexture(
  object: SmallBodyObject
): SmallBodyTextureState {
  const [state, setState] = useState<SmallBodyTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;
    const appearance = appearanceFor(object);

    // Only map-kind bodies get a wrapped surface texture.
    if (appearance.kind !== "map" || !appearance.texture) {
      setState({ texture: null, ready: true, usingFallback: true });
      return () => {
        cancelled = true;
      };
    }

    setState({ texture: null, ready: false, usingFallback: false });
    const loader = new THREE.TextureLoader();
    loader
      .loadAsync(appearance.texture)
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        setState({ texture: prepTexture(tex), ready: true, usingFallback: false });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ texture: null, ready: true, usingFallback: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [object]);

  // dispose the texture on unmount / when replaced
  useEffect(() => {
    return () => {
      state.texture?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.texture]);

  return state;
}
