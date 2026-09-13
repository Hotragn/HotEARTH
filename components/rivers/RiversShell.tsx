"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: every curve, interval and probability on this tab is computed in
// the browser from the committed record on load.
const RiversApp = dynamic(() => import("./RiversApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading the flood record" />,
});

export default function RiversShell() {
  return <RiversApp />;
}
