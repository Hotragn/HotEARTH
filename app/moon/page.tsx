import type { Metadata } from "next";
import MoonShell from "@/components/moon/MoonShell";

export const metadata: Metadata = {
  title: "Moon · H.O.T Earth",
  description:
    "The Moon in the H.O.T digital twin: no atmosphere, no weather. Real geometry instead: computed lunar phase, illumination and a day/night terminator (Meeus lunar theory), optical libration (the monthly nod that reveals ~59% of the surface), and the LRO Diviner-measured ~300 K day-night surface-temperature swing.",
};

export default function MoonPage() {
  return <MoonShell />;
}
