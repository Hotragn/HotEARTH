import type { Metadata } from "next";
import OzoneShell from "@/components/ozone/OzoneShell";

export const metadata: Metadata = {
  title: "Ozone · H.O.T Earth",
  description:
    "The one global environmental problem the world agreed to fix, measured rather than celebrated. Three keyless records are committed and analysed in the browser: NASA Ozone Watch annual Antarctic hole area and minimum column from 1979, NOAA's Ozone Depleting Gas Index with ten gases measured in air, and total column from five NOAA Dobson stations running from 1963, a ladder from the South Pole to the Arctic. The signature exhibit is the gap between cause and effect. The chemicals are unambiguously falling: the index over Antarctica is down from 100 at its 2001 peak, and methyl chloroform is down 99 percent. The hole is not following, and this page computes the slope and its standard error rather than asserting a direction, because over every window from 1990 onward the trend in hole area is under two standard errors, and the correlation between the measured halogen loading and the measured hole area is near zero with the wrong sign. That is a statement about the noisiness of the headline metric, not about the Montreal Protocol. Also here: five ground stations showing that the South Pole lost about half its October column while Utqiagvik at 71 North, equally polar and equally dark, lost three percent, because the variable is the polar vortex; the CFC-11 decline slowing by a third from 2013 to 2018 and snapping back after enforcement, which is a treaty violation visible in background air; the 1980 benchmark solved from NOAA's own published columns and checked by rebuilding their index to five hundredths of an index point; the Dobson Unit as a real thickness, three millimetres for the whole layer and one inside the hole; and 1995 missing because no satellite flew. 52 tests validate it. No API keys.",
};

export default function OzonePage() {
  return <OzoneShell />;
}
