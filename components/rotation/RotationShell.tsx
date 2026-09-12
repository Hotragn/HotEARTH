"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the charts are computed from the committed record on load.
const RotationApp = dynamic(() => import("./RotationApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the Earth's rotation" />,
});

export default function RotationShell() {
  return <RotationApp />;
}
