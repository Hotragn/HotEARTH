import type { Metadata } from "next";
import ExoShell from "@/components/exoplanets/ExoShell";

export const metadata: Metadata = {
  title: "Exoplanets · H.O.T Earth",
  description:
    "The Exoplanets tab in the H.O.T digital twin: a system explorer for real exoplanet systems from the NASA Exoplanet Archive. Browse 62 systems by nearest or notable, then open a system's architecture: the host star at centre, planets on their real relative orbits (radius-compressed, animating at correct relative speeds), a computed Kopparapu (2013) habitable zone shaded in green, and an overlay of our own Solar System's orbits to grasp how compact systems like TRAPPIST-1 really are. Every planet's appearance is illustrative: no exoplanet has been imaged in surface detail; the seven directly-imaged planets are unresolved points of light, not surface maps. The honest substance is measured parameters, system architecture and computed habitable zones. Data acknowledgment: NASA Exoplanet Archive (Caltech/IPAC).",
};

export default function ExoplanetsPage() {
  return <ExoShell />;
}
