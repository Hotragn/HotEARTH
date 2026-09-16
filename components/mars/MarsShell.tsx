"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Mars scene is client-only (WebGL, window, RAF) and dynamically imported
// with ssr:false so the r3f bundle only loads on this route; mirrors
// GlobeShell for Earth. Keeps bundle growth off the other routes.
const MarsApp = dynamic(() => import("./MarsApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Mars" />,
});

export default function MarsShell() {
  return <MarsApp />;
}
