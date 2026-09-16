"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  MANIFEST_PATH,
  SUN_CHANNELS,
  type SunManifest,
} from "@/lib/sun-facts";

export interface SunTextureState {
  /** channel id → loaded texture (populated as each JPEG resolves). */
  textures: Record<string, THREE.Texture | null>;
  /** true once the default channel's texture is ready (scene can render). */
  ready: boolean;
  /** parsed public/textures/sun/manifest.json (observation timestamps), or null. */
  manifest: SunManifest | null;
}

function prepDisk(tex: THREE.Texture): THREE.Texture {
  // Full-disk SDO images are square photos, NOT wrapped maps: clamp edges (no
  // seam repeat) and decode sRGB so the false-colour palettes read correctly.
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

/**
 * Loads the six committed SDO channel images in parallel and the manifest.
 * Mirrors useBaseTextures / useMarsTexture: never throws, disposes every loaded
 * texture on unmount. The scene becomes `ready` as soon as the default channel
 * resolves; the rest populate the map as they finish (instant switching).
 */
export function useSunTextures(): SunTextureState {
  const [textures, setTextures] = useState<Record<string, THREE.Texture | null>>(
    () => Object.fromEntries(SUN_CHANNELS.map((c) => [c.id, null])),
  );
  const [ready, setReady] = useState(false);
  const [manifest, setManifest] = useState<SunManifest | null>(null);
  const loadedRef = useRef<THREE.Texture[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const defaultId = SUN_CHANNELS[0].id;

    for (const channel of SUN_CHANNELS) {
      loader
        .loadAsync(channel.file)
        .then((tex) => {
          if (cancelled) {
            tex.dispose();
            return;
          }
          loadedRef.current.push(prepDisk(tex));
          setTextures((prev) => ({ ...prev, [channel.id]: tex }));
          if (channel.id === defaultId) setReady(true);
        })
        .catch(() => {
          // a missing channel just stays null; the disk shows a warm fallback.
          if (!cancelled && channel.id === defaultId) setReady(true);
        });
    }

    // Manifest is a nice-to-have (timestamps); tolerate its absence.
    fetch(MANIFEST_PATH)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setManifest(json as SunManifest);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      for (const t of loadedRef.current) t.dispose();
      loadedRef.current = [];
    };
  }, []);

  return { textures, ready, manifest };
}
