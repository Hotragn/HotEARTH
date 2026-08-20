import type { Metadata } from "next";
import AirShell from "@/components/air/AirShell";

export const metadata: Metadata = {
  title: "Air · H.O.T Earth",
  description:
    "What you are breathing, and why two countries would score the same air differently. Live Copernicus CAMS concentrations via Open-Meteo, keyless, and everything else computed by lib/air in 36 unit tests against published tables: the US EPA AQI breakpoints as revised in 2024 (the Good band now ends at 9.0 rather than 12.0), the EEA European band edges, and the conversion between mass concentration and mixing ratio at the EPA reference state. The load-bearing point is that an air quality index is not a measurement but a national policy judgement wrapped around one: 12.4 micrograms of PM2.5 is Moderate on the US scale and comfortably Fair on the European one, and the tab flags the disagreement when it happens. Both indices are a maximum over pollutants, so the pollutant responsible is named next to the number instead of hidden by it, and every concentration is shown against the WHO 2021 guideline, whose annual PM2.5 figure of 5 sits well inside the band the US index still calls Good. Stated plainly: these are modelled kilometre-scale concentrations, not a sensor at your address, and the US PM2.5 table is defined on a 24-hour average being applied here to hourly values. No API keys."
};

export default function AirPage() {
  return <AirShell />;
}
