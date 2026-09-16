"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { prepTexture } from "@/components/globe/useBaseTextures";
import { hasRealMap, type DwarfBodyName } from "@/lib/dwarf-facts";

/**
 * Loads a dwarf-planet surface texture from `/textures/dwarf-planets/{name}.jpg`,
 * but ONLY for the three bodies that have a real spacecraft map: Pluto and
 * Charon (New Horizons 2015) and Ceres (Dawn 2015). Mirrors usePlanetTexture /
 * useMoonSurfaceTexture, with one honest twist:
 *
 *   Eris, Haumea and Makemake have NEVER been visited; there is no map on
 *   purpose. For those bodies this hook never fetches anything; it returns
 *   `usingFallback: true` immediately so the globe renders a clearly-labelled
 *   ILLUSTRATIVE sphere. No 404 noise, no pretend imagery.
 *
 * For the imaged bodies the texture is a grayscale albedo mosaic (real data, not
 * colourised); if it 404s the globe still falls back gracefully. Disposes the
 * texture on unmount / when replaced; never throws, never blocks the scene.
 */
export interface DwarfTextureState {
  texture: THREE.Texture | null;
  ready: boolean;
  usingFallback: boolean;
}

export function dwarfTexturePath(name: DwarfBodyName): string {
  return `/textures/dwarf-planets/${name.toLowerCase()}.jpg`;
}

export function useDwarfTexture(name: DwarfBodyName): DwarfTextureState {
  const [state, setState] = useState<DwarfTextureState>({
    texture: null,
    ready: false,
    usingFallback: false,
  });

  useEffect(() => {
    let cancelled = false;

    // Never-visited bodies: no map exists, go straight to the illustrative sphere.
    if (!hasRealMap(name)) {
      setState({ texture: null, ready: true, usingFallback: true });
      return () => {
        cancelled = true;
      };
    }

    setState({ texture: null, ready: false, usingFallback: false });
    const loader = new THREE.TextureLoader();
    loader
      .loadAsync(dwarfTexturePath(name))
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
