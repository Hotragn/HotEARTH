"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the hemisphere switch is interactive state.
const IceApp = dynamic(() => import("./IceApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the sea ice record" />,
});

export default function IceShell() {
  return <IceApp />;
}
