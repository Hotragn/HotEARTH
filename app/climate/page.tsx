import type { Metadata } from "next";
import ClimateShell from "@/components/climate/ClimateShell";

export const metadata: Metadata = {
  title: "Climate · H.O.T Earth",
  description:
    "The instrumental temperature record, built around the difference between a number and a trend. Two independent analyses are committed and rebased live: NASA GISTEMP v4 (public domain, 1880 onwards) and Met Office HadCRUT5 (Open Government Licence, 1850 onwards, with its published uncertainty). Change the reference period and every headline number moves by up to half a degree while every trend stays identical to twelve decimal places, because rebasing subtracts one constant from every year and a constant cannot tilt a line. That is proved by unit tests rather than asserted. The headline exhibit: for 2024 NASA published 1.28 C and the Met Office 1.51 C, which looks like a 0.23 C disagreement between two major climate groups and is almost entirely a difference of baseline. Put both on a common 1961-1990 reference and they read 1.18 and 1.16, and their trends since 1975 agree to a thousandth of a degree per decade. 31 tests validate it against published values including the IPCC AR6 figure of about 1.09 C for 2011-2020 against 1850-1900, reproduced here from HadCRUT5. Stated plainly: these are anomalies and not absolute temperatures, the 19th century record is thin and its uncertainty is five times wider, one year is weather rather than climate, and this tab measures without attributing. No API keys.",
};

export default function ClimatePage() {
  return <ClimateShell />;
}
