import type { Metadata } from "next";
import DwarfShell from "@/components/dwarf-planets/DwarfShell";

export const metadata: Metadata = {
  title: "Dwarf Planets · H.O.T Earth",
  description:
    "The dwarf planets in the H.O.T digital twin: a mini-orrery of Ceres, Pluto, Haumea, Makemake and Eris on their real, eccentric, radius-compressed orbits, with Neptune's orbit as the trans-Neptunian reference and Pluto's 3:2 Neptune resonance. Click-to-focus detail globes with computed day/night terminators: real New Horizons/Dawn maps for Pluto, Charon and Ceres; clearly-labelled illustrative spheres for the never-visited Eris, Haumea and Makemake (Haumea rendered as its real triaxial ellipsoid with its real ring). Dwarf planets have no weather: the honest substance is orbital mechanics, measured facts and real textures where they exist.",
};

export default function DwarfPlanetsPage() {
  return <DwarfShell />;
}
