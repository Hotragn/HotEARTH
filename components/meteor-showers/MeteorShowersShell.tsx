"use client";

import dynamic from "next/dynamic";
import BootScreen from "@/components/ui/BootScreen";

// The Meteor Showers scene is client-only (WebGL, window, RAF, OrbitControls) and
// dynamically imported with ssr:false so the react-three-fiber bundle only loads
// on this route; mirrors NightSkyShell / ExoShell. Keeps bundle growth off the
// other 12 world routes.
const MeteorShowersApp = dynamic(() => import("./MeteorShowersApp"), {
  ssr: false,
  loading: () => <BootScreen label="Tracking the streams" />,
});

export default function MeteorShowersShell() {
  return <MeteorShowersApp />;
}
