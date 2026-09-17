"use client";

import { GIBS_LAYERS } from "@/lib/gibs";
import type { ActiveLayer } from "@/components/globe/GlobeApp";

interface LayerOption {
  slug: ActiveLayer;
  title: string;
  description: string;
}

const OPTIONS: LayerOption[] = [
  {
    slug: "blue-marble",
    title: "Blue Marble",
    description:
      "NASA Blue Marble Next Generation with shaded relief and bathymetry. The timeless base map.",
  },
  ...GIBS_LAYERS.map((l) => ({
    slug: l.slug as ActiveLayer,
    title: l.title,
    description: l.description,
  })),
];

interface LayerSwitcherProps {
  active: ActiveLayer;
  onSelect: (layer: ActiveLayer) => void;
  onRetry: () => void;
  loading: boolean;
  error: string | null;
  imageryDate: string | null;
  /** wind particle layer — combinable with any imagery layer */
  windActive: boolean;
  onToggleWind: () => void;
  windLoading: boolean;
  windError: string | null;
  /** GFS cycle, pre-formatted ("2026-07-06 06z"), when data is loaded */
  windCycle: string | null;
  /** True when the live mirror was unreachable and the committed copy is
   * being drawn, which may be considerably older than its cycle suggests. */
  windIsFallback?: boolean;
}

/**
 * Data layer selector. Vertical panel on the left at sm+, horizontal chip
 * strip above the time control on phones.
 */
export default function LayerSwitcher({
  active,
  onSelect,
  onRetry,
  loading,
  error,
  imageryDate,
  windActive,
  onToggleWind,
  windLoading,
  windError,
  windCycle,
  windIsFallback = false,
}: LayerSwitcherProps) {
  return (
    <section
      aria-label="Data layers"
      className="pointer-events-auto absolute inset-x-3 bottom-24 animate-hud-in sm:inset-x-auto sm:bottom-auto sm:left-5 sm:top-1/2 sm:w-60 sm:-translate-y-1/2"
    >
      <div className="hud-panel rounded-2xl p-1.5 sm:p-2">
        <p className="hidden px-2.5 pb-1 pt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-faint sm:block">
          Data layer
        </p>
        <div className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
          <div
            role="radiogroup"
            aria-label="Active data layer"
            className="flex gap-1 sm:flex-col"
          >
            {OPTIONS.map((opt) => {
              const isActive = active === opt.slug;
              return (
                <button
                  key={opt.slug}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  title={opt.description}
                  onClick={() => onSelect(opt.slug)}
                  className={`group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 sm:w-full sm:py-2.5 ${
                    isActive
                      ? "bg-white/10 text-ice"
                      : "text-dim hover:bg-white/5 hover:text-ice"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                      isActive
                        ? "bg-solar"
                        : "bg-white/20 group-hover:bg-white/40"
                    }`}
                  />
                  <span className="whitespace-nowrap font-medium sm:whitespace-normal">
                    {opt.title}
                  </span>
                  {isActive && loading && (
                    <span
                      aria-label="loading imagery"
                      className="ml-auto h-3 w-3 shrink-0 animate-spin rounded-full border border-white/20 border-t-solar"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* wind particles — a toggle, not a radio: combines with imagery */}
          <button
            type="button"
            role="switch"
            aria-checked={windActive}
            title="Animated global wind at 10 m, advected from the latest NOAA GFS analysis. Combines with any imagery layer."
            onClick={onToggleWind}
            className={`group flex shrink-0 cursor-pointer items-center gap-2.5 rounded-xl border-l border-line px-3 py-2 text-left text-xs transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70 sm:w-full sm:border-l-0 sm:border-t sm:py-2.5 ${
              windActive
                ? "bg-white/10 text-ice"
                : "text-dim hover:bg-white/5 hover:text-ice"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200 ${
                windActive
                  ? "bg-solar animate-pulse-dot"
                  : "bg-white/20 group-hover:bg-white/40"
              }`}
            />
            <span className="whitespace-nowrap font-medium sm:whitespace-normal">
              Wind · GFS 10m
            </span>
            {windActive && windLoading && (
              <span
                aria-label="loading wind field"
                className="ml-auto h-3 w-3 shrink-0 animate-spin rounded-full border border-white/20 border-t-solar"
              />
            )}
          </button>
        </div>

        {/* status line */}
        <div className="hidden border-t border-line px-2.5 pb-1.5 pt-2 sm:block">
          {error ? (
            <p className="font-mono text-[10px] leading-relaxed text-solar">
              Imagery unavailable — showing Blue Marble.{" "}
              <button
                type="button"
                onClick={onRetry}
                className="cursor-pointer underline decoration-solar/50 underline-offset-2 hover:text-ice"
              >
                Retry
              </button>
            </p>
          ) : imageryDate ? (
            <p className="font-mono text-[10px] tracking-wide text-faint">
              Imagery {imageryDate} · NASA GIBS
            </p>
          ) : (
            <p className="font-mono text-[10px] tracking-wide text-faint">
              Static basemap · NASA Visible Earth
            </p>
          )}

          {/* wind status: GFS cycle time from meta.cycle when the layer is on */}
          {windActive &&
            (windError ? (
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-solar">
                Wind data unavailable ({windError}).
              </p>
            ) : windCycle ? (
              <p className="mt-1 font-mono text-[10px] tracking-wide text-faint">
                Wind cycle {windCycle} · NOAA GFS
                {windIsFallback ? " · committed copy, the live mirror did not answer" : ""}
              </p>
            ) : null)}
        </div>
      </div>
    </section>
  );
}
