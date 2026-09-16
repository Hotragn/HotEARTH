import type { Metadata } from "next";
import NightSkyShell from "@/components/night-sky/NightSkyShell";

export const metadata: Metadata = {
  title: "Night Sky · H.O.T Earth",
  description:
    "The Night Sky tab in the H.O.T digital twin: a real star map / celestial sphere. About 9,000 stars are rendered at their real measured positions, brightnesses and colours (HYG v4.4, from Hipparcos / Yale Bright Star / Gliese), each coloured by its physical black-body temperature (from the B-V index) and sized by apparent magnitude. Constellation stick figures are drawn as a clearly-labelled cultural overlay: the stars are real, the connecting lines are a human construct (modern IAU set, Marc van der Sluys, CC BY 4.0). Messier deep-sky objects (OpenNGC, CC BY-SA 4.0) are marked by type. A galactic-frame Milky Way panorama (ESO/S. Brunier, CC BY 4.0) is rotated into the equatorial frame to register with the stars. A 'sky from your location' mode uses real local-sidereal-time astronomy to show what is actually above you now, hiding stars below the horizon. J2000 epoch; proper motion and precession are ignored for present-day display.",
};

export default function NightSkyPage() {
  return <NightSkyShell />;
}
