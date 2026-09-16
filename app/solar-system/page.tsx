import type { Metadata } from "next";
import SolarShell from "@/components/solar-system/SolarShell";

export const metadata: Metadata = {
  title: "Solar System · H.O.T Earth",
  description:
    "The Solar System in the H.O.T digital twin: a real Keplerian orrery (JPL approximate positions) of all eight planets, plus click-to-focus detail globes for Mercury, Venus, Jupiter, Saturn, Uranus and Neptune, real textures, computed terminators and axial tilts, and only measured dynamic data (gas-giant zonal winds, Mercury's temperature extremes, Venus super-rotation). No invented weather.",
};

export default function SolarSystemPage() {
  return <SolarShell />;
}
