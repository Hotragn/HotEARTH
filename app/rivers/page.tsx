import type { Metadata } from "next";
import RiversShell from "@/components/rivers/RiversShell";

export const metadata: Metadata = {
  title: "Rivers \u00b7 H.O.T Earth",
  description:
    "A hundred year flood is a flood with a one percent chance of being exceeded in any given year. It does not mean once a century, it is not a schedule, and a river that had one last year is exactly as likely to have one this year. The arithmetic that follows is exact and surprises people: a one percent flood has a 26 percent chance of turning up inside a thirty year mortgage, a 63 percent chance inside a century rather than a certainty, and two of them five years apart is a one in a thousand coincidence at one gauge, which across thousands of gauges happens constantly. Eight USGS annual peak streamflow records are committed and analysed in the browser, the longest running since 1844, fitted with log-Pearson Type III by method of moments, the Bulletin 17C distribution, using a Wilson-Hilferty frequency factor checked in the tests against exact Erlang quantiles derived from scratch rather than quoted from a table. The signature exhibit is how much of each answer is extrapolation: resampling puts the hundred year flood on the shortest record here somewhere between 39,000 and 122,000 cubic feet a second, a top three times its bottom, while the longest record is five times tighter. Also here: the USGS qualification flags most analyses discard, which say that Glen Canyon Dam closed in 1963 and every Colorado peak since is regulated, that the three largest Willamette floods were reconstructed from high water marks rather than gauged, that forty Mississippi peaks are daily averages rather than instantaneous peaks, and that one gauge has been regulated for all ninety six years of its record and so has no natural half to compare against. Fitting one curve across the Glen Canyon break gives a hundred year flood higher than either half on its own, because mixing two populations inflates the spread. 39 tests validate it. No API keys.",
};

export default function RiversPage() {
  return <RiversShell />;
}
