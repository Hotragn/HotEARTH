import type { Metadata } from "next";
import TidesShell from "@/components/tides/TidesShell";

export const metadata: Metadata = {
  title: "Tides · H.O.T Earth",
  description:
    "Newton's equilibrium tide computed from the real Moon and Sun, plotted against a live NOAA tide gauge, so you can see exactly how wrong a correct theory can be. The theory predicts about half a metre of range everywhere on Earth; Boston measures three metres and Eastport six, because real tides are a resonant response of each ocean basin rather than a global equilibrium. lib/tides computes the sub-lunar and sub-solar points, the (3cos^2-1)/2 tide-raising term that produces TWO high tides a day rather than one, the inverse-cube distance law that lets the Moon beat the Sun two to one despite the Sun pulling 178 times harder, and the spring-neap cycle from the real Sun-Moon elongation. 29 unit tests against textbook values: the 0.36 m lunar and 0.16 m solar coefficients, the perigee-to-apogee swing of 1.4x, springs at both new and full Moon, and a test that measures the period of the computed curve and checks it against the published M2 constituent of 12 h 25 m. Five NOAA stations spanning ranges from 0.3 m to 6 m. Public domain data, no API key. Do not navigate by it: NOAA publishes real harmonic predictions, and the page says so.",
};

export default function TidesPage() {
  return <TidesShell />;
}
