"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Moon scene is client-only (WebGL, window, RAF) and dynamically imported
// with ssr:false so the r3f bundle only loads on this route; mirrors
// MarsShell / GlobeShell. Keeps bundle growth off the other routes.
const MoonApp = dynamic(() => import("./MoonApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading the Moon" />,
});

export default function MoonShell() {
  return <MoonApp />;
}
