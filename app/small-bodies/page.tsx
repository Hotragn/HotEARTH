import type { Metadata } from "next";
import SmallBodyShell from "@/components/small-bodies/SmallBodyShell";

export const metadata: Metadata = {
  title: "Comets & Asteroids · H.O.T Earth",
  description:
    "The Comets & Asteroids tab in the H.O.T digital twin: an inner-Solar-System view of real comet and near-Earth-asteroid orbits from the NASA/JPL Small-Body Database. Draws the planet reference orbits (Mercury→Jupiter) plus each small body's real orbit, closed ellipses for bound asteroids and comets, open arcs for the hyperbolic/interstellar visitors 'Oumuamua and Borisov, with illustrative anti-sunward comet tails. Browse and filter 45 objects (comets, near-Earth asteroids, PHAs, spacecraft-visited, interstellar), open any object for its real orbital elements, physical parameters and classification, and read the real JPL/CNEOS close approaches. Hazard facts are stated plainly: Apophis's 2029 pass is a real ~31,600 km close approach, naked-eye visible, with impact ruled out. Appearances are illustrative procedural rocks except the labelled real images (Eros/Vesta/Bennu maps; Gaspra/Ida/Didymos/67P mission photos). Data: NASA/JPL SBDB + CNEOS.",
};

export default function SmallBodiesPage() {
  return <SmallBodyShell />;
}
