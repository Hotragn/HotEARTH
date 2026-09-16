"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

/**
 * Loads the Earth base day texture for the Virtual Earth globe, read-only from
 * the existing public path (owned by the Earth data pipeline: we do NOT create
 * or edit it). If it 404s we fall back to a plain earthy sphere via the shader
 * (usingFallback = true). Never throws, never blocks the scene; mirrors the
 * Mars useMarsTexture defensive pattern.
 */
export const EARTH_DAY_TEXTURE = "/textures/earth-day-blue-marble.jpg";

function prep(tex: THREE.Texture): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping; // avoid the ±180° seam
  tex.anisotropy = 8;
  return tex;
}

export interface ChronoTextureState {
  texture: THREE.Texture | null;
  ready: boolean;
  usingFallback: boolean;
}

export function useChronoTexture(): ChronoTextureState {
  const [state, setState] = useState<ChronoTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader
      .loadAsync(EARTH_DAY_TEXTURE)
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        setState({ texture: prep(tex), ready: true, usingFallback: false });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ texture: null, ready: true, usingFallback: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // dispose on unmount
  useEffect(() => {
    return () => {
      state.texture?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.texture]);

  return state;
}
