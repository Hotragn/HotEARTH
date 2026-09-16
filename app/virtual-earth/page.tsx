import type { Metadata } from "next";
import ChronoShell from "@/components/chrono/ChronoShell";

export const metadata: Metadata = {
  title: "Virtual Earth · H.O.T Earth",
  description:
    "Virtual Earth: a deep-zoomable time-machine globe that plays through history. Real data drives what changes: city growth, world population, dated events (incl. the World Wars), industrial-era climate, and the axial-precession night sky (~25,772-yr cycle). Includes a clearly-labeled procedural 'Era Scenes' artistic layer.",
};

export default function VirtualEarthPage() {
  return <ChronoShell />;
}
