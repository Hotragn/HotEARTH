"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Exoplanets scene is client-only (WebGL, window, RAF for the architecture
// view) and dynamically imported with ssr:false so the r3f bundle only loads on
// this route; mirrors SolarShell / DwarfShell / MoonsShell. Keeps bundle growth
// off the other routes.
const ExoApp = dynamic(() => import("./ExoApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Exoplanets" />,
});

export default function ExoShell() {
  return <ExoApp />;
}
