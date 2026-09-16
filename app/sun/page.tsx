import type { Metadata } from "next";
import SunShell from "@/components/sun/SunShell";

export const metadata: Metadata = {
  title: "Sun & space weather · H.O.T Earth",
  description:
    "The Sun in the H.O.T digital twin: real NASA/SDO full-disk imagery in six wavelengths (AIA 171/193/211/304, HMI continuum & magnetogram) with live NOAA/SWPC space weather, solar wind, planetary Kp and the G-scale, GOES X-ray flares, F10.7, the Solar Cycle 25 curve and the SWPC OVATION aurora forecast. Space weather is a real forecasting domain: we visualize and attribute SWPC's measurements and forecasts, we do not predict.",
};

export default function SunPage() {
  return <SunShell />;
}
