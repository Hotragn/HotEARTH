"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: every trend, correlation and lifetime fit on this tab is
// computed in the browser from the committed record on load.
const OzoneApp = dynamic(() => import("./OzoneApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the ozone record" />,
});

export default function OzoneShell() {
  return <OzoneApp />;
}
