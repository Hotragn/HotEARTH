"use client";

import { useEffect, useState } from "react";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import { DEFAULT_CHANNEL_ID, getChannel } from "@/lib/sun-facts";
import SunCanvas from "./SunCanvas";
import SunHud from "./SunHud";
import SpaceWeatherPanel from "./SpaceWeatherPanel";
import SunWavelengthSwitcher from "./SunWavelengthSwitcher";
import SunFramingBanner from "./SunFramingBanner";
import SunAttributionFooter from "./SunAttributionFooter";
import { useSunTextures } from "./useSunTextures";

/**
 * Sun tab shell, mirrors MarsApp / SolarApp: a full-viewport WebGL scene (the
 * SDO full-disk image on a camera-facing disk with a limb glow) under a HUD
 * overlay. The headline feature is the live NOAA/SWPC space-weather panel, which
 * fetches client-side and falls back to the committed snapshot. Everything is
 * honestly framed: measured data + SWPC's own forecasts, attributed, never our
 * own prediction.
 */
export default function SunApp() {
  const { textures, ready, manifest } = useSunTextures();

  const [channelId, setChannelId] = useState<string>(DEFAULT_CHANNEL_ID);
  const channel = getChannel(channelId);

  // 1 Hz wall-clock tick for the HUD readouts (Carrington rotation etc.).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {ready ? (
        <SunCanvas channel={channel} textures={textures} />
      ) : (
        <BootScreen label="Loading the Sun" />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="sun" />
        <SunFramingBanner />
        <SunHud nowMs={nowMs} />
        <SpaceWeatherPanel />
        <SunWavelengthSwitcher
          active={channelId}
          onSelect={setChannelId}
          channel={channel}
          manifest={manifest}
        />
        <SunAttributionFooter />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
