"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The ISS scene is client-only (WebGL, window, RAF, a 1 Hz clock, optional live
// fetch) and dynamically imported with ssr:false so the r3f bundle + Blue/Black
// Marble textures only load on this route; mirrors SunShell / MarsShell.
const IssApp = dynamic(() => import("./IssApp"), {
  ssr: false,
  loading: () => <BootScreen label="Acquiring the station" />,
});

export default function IssShell() {
  return <IssApp />;
}
