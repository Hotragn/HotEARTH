"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { prepTexture } from "@/components/globe/useBaseTextures";
import type { DetailPlanetName } from "@/lib/planet-facts";

/**
 * Loads a planet's equirectangular surface texture from
 * `/textures/planets/{name}.jpg` (public-domain NASA/JPL/USGS for
 * Mercury/Venus/Jupiter; CC BY 4.0 Solar System Scope for Saturn/Uranus/Neptune,
 * see the attribution footer). Mirrors useMarsTexture/useMoonTexture: if the
 * texture 404s the globe falls back to a procedurally-tinted sphere so the
 * scene never breaks. Disposes the texture on unmount; never throws.
 */
export interface PlanetTextureState {
  texture: THREE.Texture | null;
  ready: boolean;
  usingFallback: boolean;
}

export function planetTexturePath(name: DetailPlanetName): string {
  return `/textures/planets/${name.toLowerCase()}.jpg`;
}

export function usePlanetTexture(name: DetailPlanetName): PlanetTextureState {
  const [state, setState] = useState<PlanetTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ texture: null, ready: false, usingFallback: false });
    const loader = new THREE.TextureLoader();
    loader
      .loadAsync(planetTexturePath(name))
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
  }, [name]);

  // dispose the texture on unmount / when it is replaced
  useEffect(() => {
    return () => {
      state.texture?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.texture]);

  return state;
}
