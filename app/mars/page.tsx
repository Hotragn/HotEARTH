import type { Metadata } from "next";
import MarsShell from "@/components/mars/MarsShell";

export const metadata: Metadata = {
  title: "Mars · H.O.T Earth",
  description:
    "Mars in the H.O.T digital twin: real orbital mechanics (NASA GISS Mars24), areocentric season (Ls), Mars Sol Date and Coordinated Mars Time, a physically computed terminator, and a clearly-labeled seasonal dust climatology (not a live forecast).",
};

export default function MarsPage() {
  return <MarsShell />;
}
