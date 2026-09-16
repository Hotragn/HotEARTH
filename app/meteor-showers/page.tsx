import type { Metadata } from "next";
import MeteorShowersShell from "@/components/meteor-showers/MeteorShowersShell";

export const metadata: Metadata = {
  title: "Meteor Showers · H.O.T Earth",
  description:
    "The Meteor Showers tab in the H.O.T digital twin: the year's annual meteor showers plotted at their REAL radiants on the celestial sphere (IAU Meteor Data Center + IMO Working List), each with its real activity window, peak date, peak solar longitude, entry velocity and parent comet or asteroid. Showers are the debris of those parent bodies, so cross-links point back to Comets & Asteroids. ZHR is labelled as an idealised peak rate (radiant at the zenith, perfect dark sky): real observed rates are lower, and the tab computes the altitude-corrected estimate for your location and time, alongside the moon phase at peak and the best viewing time. A year calendar, a 'tonight / active now / next up' panel with a countdown, and illustrative meteor streaks emanating from each radiant complete the view. Peaks drift ~1 day/yr, so timing is keyed to solar longitude; meteor streaks and the debris-stream diagram are illustrative.",
};

export default function MeteorShowersPage() {
  return <MeteorShowersShell />;
}
