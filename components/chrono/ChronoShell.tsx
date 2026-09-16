"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Virtual Earth scene is client-only (WebGL, window, RAF) and dynamically
// imported with ssr:false so the r3f bundle only loads on this route; mirrors
// GlobeShell/MarsShell. Keeps bundle growth off the other routes.
const ChronoApp = dynamic(() => import("./ChronoApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Virtual Earth" />,
});

export default function ChronoShell() {
  return <ChronoApp />;
}
