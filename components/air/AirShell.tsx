"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the reading is for the visitors own location and clock.
const AirApp = dynamic(() => import("./AirApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the air where you are" />,
});

export default function AirShell() {
  return <AirApp />;
}
