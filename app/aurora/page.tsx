import type { Metadata } from "next";
import AuroraShell from "@/components/aurora/AuroraShell";

export const metadata: Metadata = {
  title: "Aurora · H.O.T Earth",
  description:
    "Where the aurora is right now, and whether you could see it from where you are standing. NOAA's OVATION Prime model grid is drawn on the globe at the real 110 km emission altitude, around the GEOMAGNETIC pole in the Canadian Arctic rather than the geographic one, which is the whole point: aurora does not care about your geographic latitude. lib/aurora computes what the feeds do not carry, in 39 unit tests against published values: centred-dipole geomagnetic coordinates from the IGRF-13 pole (Edinburgh and Moscow sit at the same geographic latitude and more than six degrees apart geomagnetically, which is why Scotland has aurora luck Moscow does not), the equatorward oval edge by Kp from NOAA's published table, the NOAA G storm scale, and the horizon geometry d = R·acos(R/(R+h)) that explains why a severe storm produces red glows reported from latitudes the oval never reached: the red emission at 300 km clears the horizon about seven degrees further than the green layer at 110 km. It also borrows the Tonight tab's darkness calculation, because a strong oval over a sky that never gets dark is not an aurora you will see. Honest limits stated on screen: OVATION is about one hour ahead and that is set by the solar wind's travel time from L1, Kp is a 3-hour planetary index rather than a local measurement, the dipole differs from operational corrected-geomagnetic coordinates by up to 3 degrees, and beyond an hour aurora forecasting is genuinely poor. No cloud cover, no light pollution, no API keys.",
};

export default function AuroraPage() {
  return <AuroraShell />;
}
