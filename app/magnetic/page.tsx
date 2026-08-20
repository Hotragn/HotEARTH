import type { Metadata } from "next";
import MagneticShell from "@/components/magnetic/MagneticShell";

export const metadata: Metadata = {
  title: "Magnetic \u00b7 H.O.T Earth",
  description:
    "Your compass does not point north, and this page computes how wrong it is. The IGRF-14 spherical harmonic coefficients are committed (195 numbers per epoch, 1900 to 2030, IAGA V-MOD via NOAA NCEI, public domain) and everything else is synthesised in the browser: the declination and dip where you stand, a world map of compass error at 28,800 sample points including the two agonic lines where the error is exactly zero, the century-long walk of the north dip pole, the decline of the dipole moment, and the South Atlantic Anomaly found by sweeping the globe for the weakest total field. The headline is that there are three north poles and none of them is where the needle points: the geographic pole, the geomagnetic pole at 80.8 N which the auroral oval is centred on, and the dip pole near 86 N which needs all 195 coefficients to locate. The dip pole crawled about 5 km a year through the Canadian Arctic until the 1980s, sprinted at over 50 km a year across the top of the world in the 2000s, and has been slowing since. 45 tests validate the synthesis against the official pyIGRF14 reference implementation to a hundredth of a nanotesla at twelve places and dates, and against NOAA\u0027s published 2025 pole positions and 9.21 degree dipole tilt. Stated plainly: degree 13 means the crustal field is absent, so over volcanic ground the real declination can be degrees away from this; the field also wobbles daily and during storms; and the measured weakening of the dipole is not a countdown to a reversal. No API keys.",
};

export default function MagneticPage() {
  return <MagneticShell />;
}
