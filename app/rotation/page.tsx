import type { Metadata } from "next";
import RotationShell from "@/components/rotation/RotationShell";

export const metadata: Metadata = {
  title: "Rotation \u00b7 H.O.T Earth",
  description:
    "The day is not 86,400 seconds. The SI second was pinned to the mean solar day of about 1820 and the Earth has not kept to it since, so the real day runs a millisecond or two long, those milliseconds pile up, and a leap second is what takes them away. IERS Earth orientation data is committed and analysed in the browser: the definitive EOP 14 C04 series from 1962 and the weekly finals2000A with its predictions flagged, plus the IERS leap second table. The signature exhibit is an arithmetic identity rather than a picture. Integrating the measured excess length of day from 1972 to 2025 gives 26.9 seconds of accumulated drift; the number of leap seconds actually inserted over those years is 27; the residual is a tenth of a second, which is the UT1-UTC offset standing today. Two IERS products, computed independently, landing on each other over fifty-four years. Also here: the shortest day ever measured, 5 July 2024; the 2020 to 2024 speed-up that produced headlines about a first ever negative leap second, and its partial reversal since, which this page recomputes rather than repeats; the seasonal cycle in day length, about a millisecond between April and July, which is the atmosphere trading angular momentum with the solid Earth; and the two published rates for the long-term slowing that disagree, 2.3 ms per century from lunar laser ranging against 1.8 from ancient eclipse records, the difference being post-glacial rebound. 25 tests validate it, including the integral identity and the fact that 28 rows in the leap second table mean 27 leap seconds. No API keys.",
};

export default function RotationPage() {
  return <RotationShell />;
}
