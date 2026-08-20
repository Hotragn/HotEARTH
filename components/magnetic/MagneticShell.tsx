"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the year slider, the location and a canvas the browser computes.
const MagneticApp = dynamic(() => import("./MagneticApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the field of the core" />,
});

export default function MagneticShell() {
  return <MagneticApp />;
}
