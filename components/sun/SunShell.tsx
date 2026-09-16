"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Sun scene is client-only (WebGL, window, RAF, live fetch) and dynamically
// imported with ssr:false so the r3f bundle + SDO textures only load on this
// route; mirrors MarsShell / SolarShell. Keeps bundle growth off other routes.
const SunApp = dynamic(() => import("./SunApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading the Sun" />,
});

export default function SunShell() {
  return <SunApp />;
}
