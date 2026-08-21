import type { Metadata } from "next";
import IceShell from "@/components/ice/IceShell";

export const metadata: Metadata = {
  title: "Ice \u00b7 H.O.T Earth",
  description:
    "How much sea ice is there? Two answers, a third apart. The NSIDC Sea Ice Index (Version 4, public domain) is committed and analysed in the browser: monthly extent and area for both hemispheres and all twelve months since 1979, daily curves against NOAA\u0027s own 1981 to 2010 percentile band, trends with standard errors, and the gap between the two ways of counting. The headline is that extent counts a grid cell as ice if 15 percent of it is ice while area sums the fractions, so extent is always larger, at the September minimum by about a third, and the 15 percent is a convention chosen for signal reliability rather than anything the ocean does. The second headline is that the poles never told the same story: Arctic September ice falls 0.76 million square km per decade at 13 times its own standard error, while Antarctic February ice ROSE 0.13 per decade to 2014 and then fell 0.92 per decade after, seven times steeper in the opposite direction, leaving a full-record trend of 1.5 sigma which is no signal at all. One series holding a real rise, a real fall and a total indistinguishable from zero. 36 tests validate it against published values including the record low September of 2012 at 3.57 million square km, the record low Antarctic February of 2023, and NSIDC\u0027s published 12.2 percent per decade decline, which this reproduces when the window ends where theirs did. Stated plainly: melting sea ice does not raise sea level because it already floats; this is area and not volume, and volume has fallen further; there is a hole in the data over the pole that is assumed to be ice; December 1987 and January 1988 are missing because the satellite failed, and are left empty rather than interpolated. No API keys.",
};

export default function IcePage() {
  return <IceShell />;
}
