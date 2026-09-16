"use client";

import { ArrowsClockwise, Sun, Moon } from "@phosphor-icons/react";
import { formatLatLon } from "@/lib/geo";
import type { WhereTheIssFix } from "@/lib/iss-facts";

export interface IssHudData {
  name: string;
  catalogNumber: number;
  /** live sub-point + telemetry, or null if no orbit resolves. */
  lat: number | null;
  lon: number | null;
  altitudeKm: number | null;
  velocityKmS: number | null;
  sunlit: boolean | null;
  periodMin: number | null;
  inclinationDeg: number | null;
  orbitsPerDay: number | null;
  footprintRadiusKm: number | null;
  /** TLE epoch + age at the current instant. */
  epoch: Date | null;
  ageDays: number | null;
  tleSource: "committed" | "live";
  fetchedAtLabel: string | null;
  /** wheretheiss.at cross-check: our SGP4 sub-point vs their fix, at their time. */
  crossCheck: { divergenceKm: number; theirs: WhereTheIssFix } | null;
  crossError: string | null;
}

export default function IssHud({
  data,
  altExaggeration,
  onAltExaggeration,
  onRefreshTle,
  refreshing,
  refreshError,
}: {
  data: IssHudData;
  altExaggeration: number;
  onAltExaggeration: (v: number) => void;
  onRefreshTle: () => void;
  refreshing: boolean;
  refreshError: string | null;
}) {
  const hasFix = data.lat !== null && data.lon !== null;

  return (
    <section
      aria-label="Live ISS telemetry"
      className="hud-scroll pointer-events-auto absolute left-3 top-20 z-10 max-h-[calc(100dvh-6.5rem)] w-[290px] overflow-y-auto animate-hud-in sm:left-5 sm:top-24"
    >
      <div className="hud-panel rounded-2xl p-4">
        {/* identity + live badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-faint">
              Live tracker
            </p>
            <h1 className="mt-1 font-display text-lg font-medium leading-tight text-ice">
              Space Station
            </h1>
            <p className="mt-0.5 font-mono text-[10px] text-faint">
              {data.name} · #{data.catalogNumber} · SGP4
            </p>
          </div>
          <span className="mt-1 flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-2 rounded-full bg-solar animate-pulse-dot" />
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-solar">
              live
            </span>
          </span>
        </div>

        {/* sub-point */}
        <div className="mt-3 border-t border-line pt-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            Sub-satellite point
          </p>
          <p className="mt-1 font-mono text-[15px] tracking-wide text-ice">
            {hasFix ? formatLatLon({ lat: data.lat as number, lon: data.lon as number }) : "–"}
          </p>
        </div>

        {/* telemetry grid */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-line pt-3">
          <Stat
            label="Altitude"
            value={data.altitudeKm !== null ? `${data.altitudeKm.toFixed(1)} km` : "–"}
            title="Geodetic height above the WGS72 ellipsoid, from SGP4."
          />
          <Stat
            label="Speed"
            value={data.velocityKmS !== null ? `${data.velocityKmS.toFixed(2)} km/s` : "–"}
            title="Inertial (ECI) speed: the ~7.66 km/s figure normally quoted for the ISS."
          />
          <Stat
            label="Period"
            value={data.periodMin !== null ? `${data.periodMin.toFixed(1)} min` : "–"}
            title="Orbital period from the TLE mean motion (~93 min)."
          />
          <Stat
            label="Inclination"
            value={data.inclinationDeg !== null ? `${data.inclinationDeg.toFixed(1)}°` : "–"}
            title="Orbital inclination from the TLE: bounds the ground track to ±this latitude (~51.6°)."
          />
          <Stat
            label="Orbits / day"
            value={data.orbitsPerDay !== null ? data.orbitsPerDay.toFixed(2) : "–"}
            title="Revolutions per day = 1440 / period (~16)."
          />
          <Stat
            label="Footprint"
            value={data.footprintRadiusKm !== null ? `~${data.footprintRadiusKm.toFixed(0)} km` : "–"}
            title="Ground radius of the circle from which the ISS is above the horizon right now (geometry from altitude)."
          />
        </div>

        {/* sunlit vs shadow */}
        <div
          className="mt-3 flex items-center gap-2.5 rounded-xl border border-line px-3 py-2"
          title="Whether the station is in sunlight or Earth's shadow now (cylindrical-umbra test, lib/iss). It drives whether a pass can be naked-eye visible."
        >
          {data.sunlit === null ? (
            <span className="font-mono text-[11px] text-faint">shadow state unavailable</span>
          ) : data.sunlit ? (
            <>
              <Sun size={16} weight="fill" className="text-solar" aria-hidden />
              <span className="text-xs text-ice">In sunlight</span>
            </>
          ) : (
            <>
              <Moon size={16} weight="fill" className="text-dim" aria-hidden />
              <span className="text-xs text-dim">In Earth&apos;s shadow</span>
            </>
          )}
        </div>

        {/* altitude scale control */}
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Altitude scale
            </p>
            <div className="flex gap-1">
              {[1, 6, 12].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onAltExaggeration(v)}
                  className={`cursor-pointer rounded-md border px-2 py-1 font-mono text-[10px] transition-colors duration-200 ${
                    altExaggeration === v
                      ? "border-solar/60 bg-solar/15 text-ice"
                      : "border-line text-dim hover:text-ice"
                  }`}
                >
                  {v === 1 ? "True" : `×${v}`}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
            {altExaggeration === 1
              ? "True scale: the ISS orbits at ~1.07 Earth radii, so it really does hug the globe."
              : `Altitude exaggerated ×${altExaggeration} for visibility (not to scale).`}
          </p>
        </div>

        {/* TLE age / honesty */}
        <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
              Orbital element set
            </p>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
                data.tleSource === "live"
                  ? "bg-solar/15 text-solar"
                  : "bg-white/5 text-dim"
              }`}
            >
              {data.tleSource === "live" ? "live refresh" : "committed"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
            <Stat
              label="Epoch"
              value={
                data.epoch
                  ? data.epoch.toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "–"
              }
              title="Reference time of the TLE (from line 1)."
            />
            <Stat
              label="Age"
              value={data.ageDays !== null ? `${data.ageDays.toFixed(2)} d` : "–"}
              title="Time since the TLE epoch. SGP4 error grows a few km per day."
            />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-faint">
            Position is computed by SGP4 from a real element set. Accuracy is ~1 km
            near the epoch and degrades ~1–3 km/day; a week-old TLE can be tens of km
            off. Mirror refreshed twice daily.
          </p>
          <button
            type="button"
            onClick={onRefreshTle}
            disabled={refreshing}
            className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-line bg-black/20 px-3 py-1.5 font-mono text-[10px] text-dim transition-colors duration-200 hover:text-ice disabled:cursor-wait disabled:opacity-60"
          >
            <ArrowsClockwise
              size={13}
              weight="bold"
              aria-hidden
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing…" : "Refresh TLE from CelesTrak"}
          </button>
          {refreshError && (
            <p className="mt-1.5 font-mono text-[9px] text-solar">{refreshError}</p>
          )}
          {data.tleSource === "live" && data.fetchedAtLabel && (
            <p className="mt-1.5 font-mono text-[9px] text-faint">
              Live TLE fetched {data.fetchedAtLabel}
            </p>
          )}
        </div>

        {/* wheretheiss.at cross-check */}
        <div className="mt-3 rounded-xl border border-line bg-white/[0.02] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint">
            Cross-check · wheretheiss.at
          </p>
          {data.crossCheck ? (
            <>
              <p className="mt-1.5 text-[11px] text-dim">
                Our SGP4 sub-point vs their live fix:{" "}
                <span
                  className={
                    data.crossCheck.divergenceKm > 25 ? "text-solar" : "text-ice"
                  }
                >
                  {data.crossCheck.divergenceKm.toFixed(1)} km apart
                </span>
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-faint">
                {data.crossCheck.divergenceKm > 25
                  ? "Divergence consistent with TLE age: not hidden."
                  : "In agreement (both propagate SGP4)."}
              </p>
            </>
          ) : (
            <p className="mt-1.5 text-[10px] leading-relaxed text-faint">
              {data.crossError ?? "Fetching independent live sub-point…"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div title={title}>
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-0.5 font-mono text-[12.5px] tracking-wide text-dim">{value}</p>
    </div>
  );
}
