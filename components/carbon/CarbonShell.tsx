"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the series switch is interactive state.
const CarbonApp = dynamic(() => import("./CarbonApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the Keeling record" />,
});

export default function CarbonShell() {
  return <CarbonApp />;
}
