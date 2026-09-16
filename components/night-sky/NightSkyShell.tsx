"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Night Sky scene is client-only (WebGL, window, RAF, OrbitControls) and
// dynamically imported with ssr:false so the react-three-fiber bundle only loads
// on this route; mirrors ExoShell / SolarShell / MoonsShell. Keeps bundle growth
// off the other 11 world routes.
const NightSkyApp = dynamic(() => import("./NightSkyApp"), {
  ssr: false,
  loading: () => <BootScreen label="Charting the sky" />,
});

export default function NightSkyShell() {
  return <NightSkyApp />;
}
