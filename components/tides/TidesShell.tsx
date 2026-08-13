"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// Client-only: the gauge is fetched in the browser and the whole page is
// computed for one instant, so there is nothing meaningful to render on the
// server.
const TidesApp = dynamic(() => import("./TidesApp"), {
  ssr: false,
  loading: () => <BootScreen label="Reading a real tide gauge" />,
});

export default function TidesShell() {
  return <TidesApp />;
}
