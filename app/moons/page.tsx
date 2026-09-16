import type { Metadata } from "next";
import MoonsShell from "@/components/moons/MoonsShell";

export const metadata: Metadata = {
  title: "Major Moons · H.O.T Earth",
  description:
    "The major moons in the H.O.T digital twin: per-parent mini-orreries (Jupiter's Galileans, Saturn's Titan/Enceladus/Mimas/Iapetus, Neptune's retrograde Triton) at real relative orbital speeds, the Io:Europa:Ganymede 1:2:4 Laplace resonance, and click-to-focus detail globes with computed day/night terminators for tidally-locked bodies. Most moons have no weather: the honest substance is orbital mechanics, measured spacecraft phenomena and real public-domain textures. Only Titan has genuine (methane) weather.",
};

export default function MoonsPage() {
  return <MoonsShell />;
}
