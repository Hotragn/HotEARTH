import type { Metadata } from "next";
import SeaLevelShell from "@/components/sealevel/SeaLevelShell";

export const metadata: Metadata = {
  title: "Sea level \u00b7 H.O.T Earth",
  description:
    "In some places the sea is going down. There is no single quantity called sea level: a satellite altimeter measures the sea surface against the centre of the Earth, while a tide gauge measures it against the land it is bolted to, and the land moves. Both are committed here and analysed in the browser. NOAA Laboratory for Satellite Altimetry global mean sea level since 1992, in all four published variants, and PSMSL Revised Local Reference annual means for ten gauges reaching back to Brest in 1807. The satellites give about 3.2 mm a year for the planet. The gauges, over the same decades, give Skagway minus 18 mm a year because the land is rebounding from Little Ice Age glaciers, Stockholm and Oslo minus 3, and Manila plus 13 because the groundwater was pumped out from under it: a spread of over 30 mm a year in the same ocean. Also computed: the acceleration, 0.081 mm per year per year, which matches the published figure and means the rise has roughly doubled since 1992, so the average rate describes neither the start nor the present; the same acceleration shown as three straight lines over three decades with no curve assumed; and the calibration seams, because the record is five satellites and where two flew at once they disagreed by one to two millimetres against a signal of three millimetres a year. 29 tests validate against NOAA\u0027s own trend from its file headers, the published acceleration, and the known post-glacial rebound stations. Stated plainly: gauge values are millimetres above an arbitrary local datum so only the slope means anything; the glacial isostatic adjustment of +0.3 mm a year is named but not applied; there is no projection to 2100, because that needs ice sheet physics; and mean sea level is not a flood forecast. No API keys.",
};

export default function SeaLevelPage() {
  return <SeaLevelShell />;
}
