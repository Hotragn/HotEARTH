"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the globe needs WebGL and the four SWPC feeds are read in the
// browser, so there is nothing meaningful to render on the server.
const AuroraApp = dynamic(() => import("./AuroraApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading NOAA space weather" />,
});

export default function AuroraShell() {
  return <AuroraApp />;
}
