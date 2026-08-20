"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the baseline switch is interactive state.
const ClimateApp = dynamic(() => import("./ClimateApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the temperature record" />,
});

export default function ClimateShell() {
  return <ClimateApp />;
}
