"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the variant and gauge switches are interactive state.
const SeaLevelApp = dynamic(() => import("./SeaLevelApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the sea level record" />,
});

export default function SeaLevelShell() {
  return <SeaLevelApp />;
}
