"use client";

/**
 * Honest framing banner (the theme of this phase). Space weather is the one
 * genuine forecasting domain in the project: NOAA SWPC issues real operational
 * forecasts. This tab VISUALISES measured data and SWPC's own forecasts, both
 * attributed: it does not predict. Shown centered at the top on wide screens;
 * on narrower screens the same honesty rides in each panel's caption + footer.
 */
export default function SunFramingBanner() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-[4.25rem] hidden max-w-[480px] -translate-x-1/2 animate-hud-in text-center lg:block">
      <div className="hud-panel rounded-full px-4 py-2">
        <p className="text-[11px] leading-snug text-dim">
          <span className="text-ice">Space weather is a real forecasting domain.</span>{" "}
          This shows measured data (NASA/SDO · NOAA GOES/DSCOVR) and NOAA SWPC&apos;s
          own forecasts, attributed: we visualize them, we don&apos;t predict.
        </p>
      </div>
    </div>
  );
}
