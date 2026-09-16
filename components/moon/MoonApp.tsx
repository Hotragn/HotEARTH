"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import MoonCanvas from "./MoonCanvas";
import MoonHud from "./MoonHud";
import MoonTimeControl from "./MoonTimeControl";
import MoonTemperaturePanel from "./MoonTemperaturePanel";
import MoonAttributionFooter from "./MoonAttributionFooter";
import { useMoonTexture } from "./useMoonTexture";

/**
 * Moon tab shell, mirrors MarsApp: full-viewport canvas + HUD overlay.
 * Everything is honest: illumination & libration are COMPUTED (Meeus lunar
 * theory, lib/lunar); surface temperature is a MODEL anchored to MEASURED LRO
 * Diviner data. The Moon has NO atmosphere → NO weather (no wind/clouds/
 * precip/pressure/storms), and this shell says so prominently.
 */
export default function MoonApp() {
  const { texture, ready, usingFallback } = useMoonTexture();

  // Synodic-month scrub position in Earth days relative to now (0 = live/now).
  // The globe reads this via a ref per-frame; state drives the HUD readouts.
  const timeOffsetDaysRef = useRef(0);
  const [offsetDays, setOffsetDaysState] = useState(0);
  const setOffsetDays = useCallback((days: number) => {
    timeOffsetDaysRef.current = days;
    setOffsetDaysState(days);
  }, []);

  // 1Hz wall-clock tick shared by all HUD readouts (no per-frame React work).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {ready ? (
        <MoonCanvas
          surfaceTexture={texture}
          usingFallback={usingFallback}
          timeOffsetDaysRef={timeOffsetDaysRef}
        />
      ) : (
        <BootScreen label="Loading the Moon" />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="moon" />
        <MoonHud nowMs={nowMs} offsetDays={offsetDays} />
        <MoonTemperaturePanel />
        <MoonTimeControl
          offsetDays={offsetDays}
          onChange={setOffsetDays}
          nowMs={nowMs}
        />
        <NoWeatherNote />
        <MoonAttributionFooter usingFallbackTexture={usingFallback} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}

/**
 * Prominent honesty note: the Moon has no atmosphere, so there is no weather.
 * This is the single most important honesty rule for the Moon tab
 * (docs/MOON_PHYSICS.md). Placed centre-top, under the nav.
 */
function NoWeatherNote() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[68px] flex justify-center px-3 sm:top-[76px]">
      <p className="hud-panel max-w-[92vw] rounded-full px-4 py-1.5 text-center font-mono text-[10px] leading-snug tracking-wide text-dim animate-hud-in sm:text-[11px]">
        The Moon has no atmosphere, no weather. Shown: illumination, libration,
        and Diviner-measured surface temperature.
      </p>
    </div>
  );
}
