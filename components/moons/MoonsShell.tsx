"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Major Moons scene is client-only (WebGL, window, RAF) and dynamically
// imported with ssr:false so the r3f bundle only loads on this route; mirrors
// SolarShell / MoonShell / MarsShell. Keeps bundle growth off the other routes.
const MoonsApp = dynamic(() => import("./MoonsApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Major Moons" />,
});

export default function MoonsShell() {
  return <MoonsApp />;
}
