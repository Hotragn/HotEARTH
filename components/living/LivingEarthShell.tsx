"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only WebGL scene, dynamically imported so the Living Earth bundle
// (three.js scene, city layer, sim) never loads on the Earth tab or the
// server: same pattern as components/globe/GlobeShell.tsx.
const LivingEarthApp = dynamic(() => import("./LivingEarthApp"), {
  ssr: false,
  loading: () => <BootScreen label="Waking the cities" />,
});

export default function LivingEarthShell() {
  return <LivingEarthApp />;
}
