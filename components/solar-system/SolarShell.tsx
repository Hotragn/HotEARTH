"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Solar System scene is client-only (WebGL, window, RAF) and dynamically
// imported with ssr:false so the r3f bundle only loads on this route; mirrors
// MarsShell / MoonShell. Keeps bundle growth off the other routes.
const SolarApp = dynamic(() => import("./SolarApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Solar System" />,
});

export default function SolarShell() {
  return <SolarApp />;
}
