import type { Metadata } from "next";
import IssShell from "@/components/iss/IssShell";

export const metadata: Metadata = {
  title: "ISS Tracker · H.O.T Earth",
  description:
    "Track the International Space Station live in the H.O.T digital twin. A real orbital element set (TLE) from the US Space Force via CelesTrak is propagated client-side by SGP4 (satellite.js) to a live sub-satellite point, altitude (~420 km), speed (~7.66 km/s), ground track (split at the antimeridian) and footprint over a NASA Blue Marble / Black Marble globe with the same computed day/night terminator as the Earth tab. Rendered at TRUE altitude scale by default, the ISS orbits surprisingly low, with an optional exaggeration toggle. The headline feature is 'Spot the Station': the next visible passes over your location, flagging which are naked-eye visible (station sunlit, your sky dark) versus daytime or shadow passes. The TLE epoch and age are shown prominently because SGP4 accuracy degrades a few km per day. Positions, ground track, passes and the sunlit test are computed; the orbital elements are measured. Optional live cross-check: wheretheiss.at.",
};

export default function IssPage() {
  return <IssShell />;
}
