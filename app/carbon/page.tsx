import type { Metadata } from "next";
import CarbonShell from "@/components/carbon/CarbonShell";

export const metadata: Metadata = {
  title: "Carbon · H.O.T Earth",
  description:
    "The Keeling curve, and the wobble on it. NOAA GML monthly means are committed and analysed in the browser: CO2 at Mauna Loa from March 1958 (the longest continuous atmospheric measurement there is), CO2 globally averaged over marine surface sites from 1979, and methane globally averaged from 1983. The headline exhibit is the seasonal sawtooth. Mauna Loa swings about 6.5 ppm every year as northern vegetation grows and rots, and the obvious guess is that averaging the whole planet cancels it, since the southern hemisphere breathes in antiphase. Measured, it does not: the global marine average still swings about 4.4 ppm, only a third less, and peaks a month earlier, because most of the world's land is north of the equator, so the southern cycle trims the northern signal rather than opposing it evenly. The northern spring is visible in the average CO2 of the entire planet. Also here: growth per decade, which went from under 1 ppm a year in the 1960s to over 2 in the 2010s, current values as multiples of pre-industrial, and methane's global warming potential shown as a table over 20, 100 and 500 years rather than a single number, because the number is a choice of horizon. 33 tests validate it against published values, starting from Keeling's first reading of 315.71 ppm. Seasonal decomposition, growth rates and the amplitude comparison are computed here, not copied. No API keys.",
};

export default function CarbonPage() {
  return <CarbonShell />;
}
