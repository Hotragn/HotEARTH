"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { solarLongitude } from "@/lib/mars-time";
import BootScreen from "@/components/ui/BootScreen";
import NavShell from "@/components/ui/NavShell";
import AboutModal from "@/components/ui/AboutModal";
import MarsCanvas from "./MarsCanvas";
import MarsHud from "./MarsHud";
import MarsTimeControl from "./MarsTimeControl";
import MarsClimatologyPanel from "./MarsClimatologyPanel";
import MarsAttributionFooter from "./MarsAttributionFooter";
import { useMarsTexture } from "./useMarsTexture";

const SOL_MS = 88_775_244;

/**
 * Mars tab shell, mirrors GlobeApp: full-viewport canvas + HUD overlay.
 * Everything is honest, real orbital mechanics (NASA GISS Mars24). The
 * climatology panel is clearly labeled as seasonal averages, not a forecast.
 */
export default function MarsApp() {
  const { texture, ready, usingFallback } = useMarsTexture();

  // Mars-year scrub position in sols relative to now (0 = live/now). The globe
  // reads this via a ref per-frame; state drives the HUD readouts only.
  const timeOffsetSolsRef = useRef(0);
  const [offsetSols, setOffsetSolsState] = useState(0);
  const setOffsetSols = useCallback((sols: number) => {
    timeOffsetSolsRef.current = sols;
    setOffsetSolsState(sols);
  }, []);

  // 1Hz wall-clock tick shared by all HUD readouts (no per-frame React work).
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [aboutOpen, setAboutOpen] = useState(false);

  const currentLs = solarLongitude(new Date(nowMs + offsetSols * SOL_MS));

  return (
    <main className="fixed inset-0 overflow-hidden bg-abyss">
      {ready ? (
        <MarsCanvas
          surfaceTexture={texture}
          usingFallback={usingFallback}
          timeOffsetSolsRef={timeOffsetSolsRef}
        />
      ) : (
        <BootScreen label="Loading Mars terrain" />
      )}

      <div className="pointer-events-none absolute inset-0 z-10">
        <NavShell onAbout={() => setAboutOpen(true)} active="mars" />
        <MarsHud nowMs={nowMs} offsetSols={offsetSols} />
        <MarsClimatologyPanel currentLs={currentLs} />
        <MarsTimeControl
          offsetSols={offsetSols}
          onChange={setOffsetSols}
          nowMs={nowMs}
        />
        <MarsAttributionFooter usingFallbackTexture={usingFallback} />
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </main>
  );
}
