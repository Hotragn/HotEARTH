import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import Companion from "@/components/companion/Companion";
import TourHint from "@/components/ui/TourHint";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://h-o-t-earth.vercel.app"),
  title: "H.O.T Earth",
  description:
    "A living digital twin of Earth — real physics, real data. Live NASA satellite imagery, a physically accurate day/night terminator, and point forecasts anywhere on the planet.",
  openGraph: {
    title: "H.O.T Earth",
    description:
      "A living digital twin of Earth and the cosmos. Real physics, real data, no fake numbers.",
    type: "website",
    siteName: "H.O.T EARTH",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexMono.variable}`}
    >
      <body>
        {children}
        <Companion />
        <TourHint />
        {/*
          Vercel Web Analytics. Anonymous page counts only: no cookies, no
          cross-site identifiers, and nothing that could identify a visitor. It
          is named in the About panel for the same reason every data source is,
          and it is the only third-party script the app loads.
        */}
        <Analytics />
      </body>
    </html>
  );
}
