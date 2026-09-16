"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The whole globe app is client-only: WebGL, window, requestAnimationFrame.
// `ssr: false` requires a client-component parent in Next 15; that is this
// file's entire job.
const GlobeApp = dynamic(() => import("./GlobeApp"), {
  ssr: false,
  loading: () => <BootScreen />,
});

export default function GlobeShell() {
  return <GlobeApp />;
}
