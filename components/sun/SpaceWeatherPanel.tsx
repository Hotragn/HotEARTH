"use client";

import { ArrowClockwise } from "@phosphor-icons/react";
import {
  auroraEquatorwardBoundaryDeg,
  gScaleFromKp,
  gScaleLabel,
  kpLabel,
  solarWindLabel,
  xrayFlareClass,
} from "@/lib/sun";
import type { MetricCategory } from "@/lib/sun-facts";
import { useSpaceWeather } from "./useSpaceWeather";
import SolarCycleChart from "./SolarCycleChart";

/** "…2026-07-18T21:11:00Z" → "07-18 21:11 UTC" (raw on parse failure). */
function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

const CATEGORY_STYLE: Record<MetricCategory, string> = {
  MEASURED: "border-[#3ecf8e]/40 text-[#3ecf8e]",
  FORECAST: "border-[#ffb24d]/40 text-[#ffb24d]",
  COMPUTED: "border-[#b98bff]/45 text-[#b98bff]",
};

function Tag({ category }: { category: MetricCategory }) {
  return (
    <span
      className={`rounded border px-1 py-px font-mono text-[8px] font-medium uppercase tracking-[0.14em] ${CATEGORY_STYLE[category]}`}
    >
      {category}
    </span>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
  category,
  time,
  live,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  category: MetricCategory;
  time?: string | null;
  live?: boolean;
}) {
  return (
    <div className="border-t border-line py-2.5 first:border-t-0">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          {live !== undefined && (
            <span
              className="font-mono text-[8px] uppercase tracking-[0.12em] text-faint"
              title={live ? "Live NOAA/SWPC feed" : "Committed snapshot fallback"}
            >
              {live ? "live" : "snap"}
            </span>
          )}
          <Tag category={category} />
        </div>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-display text-lg font-medium text-ice">{value}</span>
        {unit && <span className="text-[11px] text-faint">{unit}</span>}
        {sub && <span className="ml-auto text-[11px] text-dim">{sub}</span>}
      </div>
      {time && (
        <p className="mt-0.5 font-mono text-[9px] tracking-wide text-faint">{time}</p>
      )}
    </div>
  );
}

/**
 * The headline feature: live NOAA/SWPC space weather, fetched client-side with
 * the committed snapshot as a defensive fallback. Every row carries a
 * MEASURED / FORECAST / COMPUTED tag and a live/snapshot marker; nothing here is
 * our own prediction: the aurora line is explicitly SWPC's OVATION forecast,
 * and the oval latitude is COMPUTED from the measured Kp (labelled approximate).
 */
export default function SpaceWeatherPanel() {
  const { view, status, anyLive, liveError, refresh } = useSpaceWeather();

  const kp = view?.kp.value ?? null;
  const gLabel = kp !== null ? gScaleLabel(kp) : null;
  const gScale = kp !== null ? gScaleFromKp(kp) : null;
  const windLbl = view?.windSpeed.value != null ? solarWindLabel(view.windSpeed.value) : null;
  const flareClass =
    view?.xrayFlux.value != null
      ? xrayFlareClass(view.xrayFlux.value)
      : view?.currentFlareClass ?? null;
  const auroraBoundary = kp !== null ? auroraEquatorwardBoundaryDeg(kp) : null;

  const updated =
    fmtTime(view?.kp.time ?? view?.windSpeed.time ?? view?.xrayFlux.time ?? null) ??
    fmtTime(view?.generatedUtc ?? null);

  return (
    <section
      aria-label="Live space weather"
      className="pointer-events-auto absolute right-3 top-20 w-[300px] animate-hud-in sm:right-5 sm:top-24"
    >
      <div className="hud-panel flex max-h-[calc(100dvh-8.5rem)] flex-col rounded-2xl">
        {/* header + live/snapshot badge */}
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Space weather
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  anyLive ? "bg-[#3ecf8e] animate-pulse-dot" : "bg-[#ffb24d]"
                }`}
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
                {status === "loading" ? "loading…" : anyLive ? "live · NOAA/SWPC" : "snapshot"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh live space weather"
            title="Re-fetch live NOAA/SWPC feeds"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <ArrowClockwise size={15} weight="light" aria-hidden />
          </button>
        </div>

        <div className="hud-scroll overflow-y-auto px-4 pb-3">
          {!view ? (
            <p className="py-6 font-mono text-[11px] text-dim">Loading…</p>
          ) : (
            <>
              <Metric
                label="Solar wind speed"
                value={view.windSpeed.value != null ? view.windSpeed.value.toFixed(0) : "–"}
                unit="km/s"
                sub={windLbl ?? undefined}
                category="MEASURED"
                time={fmtTime(view.windSpeed.time)}
                live={view.windSpeed.source === "live"}
              />
              <Metric
                label="IMF Bz · Bt (GSM)"
                value={
                  view.bz.value != null
                    ? `${view.bz.value >= 0 ? "+" : ""}${view.bz.value.toFixed(1)}`
                    : "–"
                }
                unit="nT"
                sub={
                  view.bt.value != null
                    ? `Bt ${view.bt.value.toFixed(1)} · ${view.bz.value != null && view.bz.value < 0 ? "southward" : "northward"}`
                    : undefined
                }
                category="MEASURED"
                time={fmtTime(view.bz.time)}
                live={view.bz.source === "live"}
              />
              <Metric
                label="Planetary Kp"
                value={kp != null ? kp.toFixed(2) : "–"}
                sub={
                  kp != null
                    ? `${kpLabel(kp) ?? ""}${gScale ? ` · ${gLabel}` : " · below G1"}`
                    : undefined
                }
                category="MEASURED"
                time={fmtTime(view.kp.time)}
                live={view.kp.source === "live"}
              />
              <Metric
                label="GOES X-ray (0.1–0.8 nm)"
                value={flareClass ?? "–"}
                sub={
                  view.xrayFlux.value != null
                    ? `${view.xrayFlux.value.toExponential(1)} W/m²`
                    : undefined
                }
                category="MEASURED"
                time={fmtTime(view.xrayFlux.time)}
                live={view.xrayFlux.source === "live"}
              />
              {(view.largestFlareClass || view.largestFlareTime) && (
                <div className="border-t border-line py-2 font-mono text-[10px] leading-relaxed text-dim">
                  Largest recent flare:{" "}
                  <span className="text-ice">{view.largestFlareClass ?? "–"}</span>
                  {view.largestFlareTime && (
                    <span className="text-faint"> · {fmtTime(view.largestFlareTime)}</span>
                  )}
                </div>
              )}
              <Metric
                label={`Sunspot number${view.sunspotMonth ? ` · ${view.sunspotMonth}` : ""}`}
                value={view.sunspotNumber.value != null ? view.sunspotNumber.value.toFixed(0) : "–"}
                sub="NOAA count (monthly)"
                category="MEASURED"
                live={false}
              />
              <Metric
                label={`F10.7 radio flux${view.f107Month ? ` · ${view.f107Month}` : ""}`}
                value={view.f107.value != null ? view.f107.value.toFixed(0) : "–"}
                unit="sfu"
                category="MEASURED"
                live={false}
              />

              {/* Aurora, SWPC's own forecast + a computed oval latitude */}
              <div className="mt-1 rounded-xl border border-line bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
                    Aurora tonight
                  </p>
                  <Tag category="FORECAST" />
                </div>
                <p className="mt-1 text-xs text-dim">
                  SWPC OVATION nowcast: max{" "}
                  <span className="text-ice">
                    {view.auroraMaxProbPct.value != null
                      ? `${view.auroraMaxProbPct.value.toFixed(0)}%`
                      : "–"}
                  </span>{" "}
                  aurora probability (their model, not ours).
                </p>
                {auroraBoundary != null && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-dim">
                    <span className="shrink-0">
                      <Tag category="COMPUTED" />
                    </span>
                    <span>
                      may reach{" "}
                      <span className="text-ice">~{auroraBoundary.toFixed(0)}° geomag lat</span>{" "}
                      (approx, derived from Kp {kp?.toFixed(1)})
                    </span>
                  </p>
                )}
                {view.auroraForecastTime && (
                  <p className="mt-1 font-mono text-[9px] tracking-wide text-faint">
                    forecast {fmtTime(view.auroraForecastTime)}
                  </p>
                )}
              </div>

              {/* solar-cycle chart */}
              <SolarCycleChart />

              {/* status footer */}
              <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-faint">
                {liveError ? (
                  <>{liveError}. </>
                ) : anyLive ? (
                  <>Live NOAA/SWPC feeds. </>
                ) : (
                  <>Committed snapshot. </>
                )}
                {updated && <>Updated {updated}. </>}
                Measured (NASA/GOES/DSCOVR) &amp; SWPC forecasts: attributed, not
                our own.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
