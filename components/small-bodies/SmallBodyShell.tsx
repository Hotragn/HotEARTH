"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Comets & Asteroids scene is client-only (WebGL, window, RAF for the orbit
// view) and dynamically imported with ssr:false so the r3f bundle only loads on
// this route; mirrors ExoShell / SolarShell / DwarfShell. Keeps bundle growth
// off the other routes.
const SmallBodyApp = dynamic(() => import("./SmallBodyApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Comets & Asteroids" />,
});

export default function SmallBodyShell() {
  return <SmallBodyApp />;
}
