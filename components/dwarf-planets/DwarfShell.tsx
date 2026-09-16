"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Dwarf Planets scene is client-only (WebGL, window, RAF) and dynamically
// imported with ssr:false so the r3f bundle only loads on this route; mirrors
// SolarShell / MoonsShell / MoonShell / MarsShell. Keeps bundle growth off the
// other routes.
const DwarfApp = dynamic(() => import("./DwarfApp"), {
  ssr: false,
  loading: () => <BootScreen label="Loading Dwarf Planets" />,
});

export default function DwarfShell() {
  return <DwarfApp />;
}
