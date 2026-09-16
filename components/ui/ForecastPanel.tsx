"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Drop, Wind, X } from "@phosphor-icons/react";
import { formatLatLon, type LatLon } from "@/lib/geo";
import {
  describeWeatherCode,
  fetchForecast,
  type ForecastResult,
} from "@/lib/openmeteo";
import WeatherIcon from "./WeatherIcon";

const COMPASS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

function compass(bearing: number): string {
  return COMPASS[Math.round(((bearing % 360) + 360) % 360 / 22.5) % 16];
}

function weekday(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
  });
}

interface ForecastPanelProps {
  picked: LatLon | null;
  onClose: () => void;
  /** kicker above the header (defaults to "Point forecast") */
  label?: string;
  /** optional display title (city name on the Living Earth tab) */
  title?: string;
  /** optional line under the title (country · population) */
  subtitle?: string;
  /** extra content rendered after the forecast (e.g. simulated activity) */
  extra?: React.ReactNode;
}

/**
 * Click-anywhere point forecast. Data comes straight from the browser to
 * Open-Meteo (CORS-enabled, keyless): see lib/openmeteo.ts for the terms.
 * The Living Earth tab reuses this same panel for city weather via the
 * optional label/title/subtitle/extra props.
 */
export default function ForecastPanel({
  picked,
  onClose,
  label = "Point forecast",
  title,
  subtitle,
  extra,
}: ForecastPanelProps) {
  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0); // bump to refetch after an error

  useEffect(() => {
    if (!picked) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchForecast(picked.lat, picked.lon, controller.signal)
      .then((result) => {
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "forecast failed");
        setLoading(false);
      });
    return () => controller.abort();
  }, [picked, nonce]);

  if (!picked) return null;

  const current = data?.current;
  const wmo = current ? describeWeatherCode(current.weatherCode) : null;
  const weekMin = data ? Math.min(...data.daily.map((d) => d.tempMin)) : 0;
  const weekMax = data ? Math.max(...data.daily.map((d) => d.tempMax)) : 1;
  const span = Math.max(weekMax - weekMin, 0.1);

  return (
    <aside
      aria-label="Point forecast"
      className="hud-panel pointer-events-auto absolute inset-x-3 bottom-40 max-h-[52dvh] overflow-hidden rounded-2xl animate-hud-in sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-20 sm:max-h-[calc(100dvh-11rem)] sm:w-[330px]"
    >
      <div className="hud-scroll flex max-h-[inherit] flex-col overflow-y-auto p-4 sm:p-5">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              {label}
            </p>
            {title && (
              <p className="mt-1 font-display text-lg font-medium tracking-tight text-ice">
                {title}
              </p>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-dim">{subtitle}</p>}
            <p className="mt-1.5 font-mono text-xs text-dim">
              {formatLatLon(picked)}
            </p>
            {data && (
              <p className="mt-0.5 font-mono text-[10px] text-faint">
                {data.timezone} · {Math.round(data.elevation)} m
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close forecast panel"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors duration-200 hover:bg-white/5 hover:text-ice focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
          >
            <X size={16} weight="light" aria-hidden />
          </button>
        </div>

        {/* body */}
        {loading && (
          <div className="mt-5 space-y-3" aria-label="Loading forecast">
            <div className="h-12 w-32 animate-pulse rounded-lg bg-white/5" />
            <div className="h-4 w-44 animate-pulse rounded bg-white/5" />
            <div className="h-28 w-full animate-pulse rounded-lg bg-white/5" />
          </div>
        )}

        {error && !loading && (
          <div className="mt-5">
            <p className="text-sm leading-relaxed text-dim">
              Could not reach Open-Meteo ({error}).
            </p>
            <button
              type="button"
              onClick={() => setNonce((n) => n + 1)}
              className="mt-3 cursor-pointer rounded-full bg-white/5 px-4 py-2 text-xs text-ice transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-solar/70"
            >
              Retry
            </button>
          </div>
        )}

        {current && wmo && !loading && !error && (
          <>
            {/* current conditions */}
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <p className="font-display text-5xl font-medium tracking-tight text-ice">
                  {Math.round(current.temperature)}°
                </p>
                <p className="mt-1 text-sm text-dim">{wmo.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-faint">
                  feels like {Math.round(current.apparentTemperature)}°C
                </p>
              </div>
              <div className="mt-1 text-dim">
                <WeatherIcon kind={wmo.icon} isDay={current.isDay} size={44} />
              </div>
            </div>

            {/* wind + humidity */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                  <Wind size={13} weight="light" aria-hidden /> Wind
                </p>
                <p className="mt-1 font-mono text-sm text-ice">
                  {Math.round(current.windSpeed)}
                  <span className="text-faint"> km/h </span>
                  {compass(current.windDirection)}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
                <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
                  <Drop size={13} weight="light" aria-hidden /> Humidity
                </p>
                <p className="mt-1 font-mono text-sm text-ice">
                  {Math.round(current.humidity)}
                  <span className="text-faint"> %</span>
                </p>
              </div>
            </div>

            {/* 7-day strip */}
            {data && data.daily.length > 0 && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
                  Next 7 days
                </p>
                <ul className="mt-3 space-y-2">
                  {data.daily.map((day, i) => {
                    const left = ((day.tempMin - weekMin) / span) * 100;
                    const width = Math.max(
                      ((day.tempMax - day.tempMin) / span) * 100,
                      4
                    );
                    const dayWmo = describeWeatherCode(day.weatherCode);
                    return (
                      <li
                        key={day.date}
                        className="grid grid-cols-[3rem_1.5rem_2.2rem_1fr_2.2rem] items-center gap-2"
                      >
                        <span className="text-xs text-dim">
                          {weekday(day.date, i)}
                        </span>
                        <span className="text-dim">
                          <WeatherIcon
                            kind={dayWmo.icon}
                            size={16}
                            className="opacity-80"
                          />
                        </span>
                        <span className="text-right font-mono text-[11px] text-faint">
                          {Math.round(day.tempMin)}°
                        </span>
                        <span
                          className="relative h-1 rounded-full bg-white/8"
                          aria-hidden
                        >
                          <span
                            className="absolute top-0 h-1 rounded-full"
                            style={{
                              left: `${left}%`,
                              width: `${width}%`,
                              background:
                                "linear-gradient(to right, #5f83ad, #f2a63b)",
                            }}
                          />
                        </span>
                        <span className="text-right font-mono text-[11px] text-ice">
                          {Math.round(day.tempMax)}°
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {extra}

            {/* source label: honest-forecasting rule */}
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="group mt-5 flex items-center gap-1 font-mono text-[10px] tracking-wide text-faint transition-colors duration-200 hover:text-dim"
            >
              Forecast: Open-Meteo (CC-BY 4.0)
              <ArrowUpRight
                size={11}
                weight="light"
                aria-hidden
                className="transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px"
              />
            </a>
          </>
        )}
      </div>
    </aside>
  );
}
