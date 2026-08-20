"use client";

import {
  AVERAGING_WINDOW_NOTE,
  EU_CATEGORIES,
  INDEX_IS_POLICY_NOTE,
  MAX_NOT_MEAN_NOTE,
  MODEL_NOT_MONITOR_NOTE,
  NO_CIGARETTES_NOTE,
  POLLUTANT_LABEL,
  POLLUTANT_SOURCE,
  US_PM25_BREAKPOINTS,
  WHO_ANCHOR_NOTE,
  WHO_GUIDELINE_UGM3,
  type AirReading,
  type AirVerdict,
  type SubIndex,
} from "@/lib/air";
import {
  AIR_ACCENT,
  CAMS_CREDIT,
  DOCS_BASE,
  EU_CATEGORY_COLOR,
  OPEN_METEO_PAGE,
  POLLUTANT_SHORT,
  US_CATEGORY_COLOR,
  fmtAqi,
  fmtPpb,
  fmtUgm3,
  fmtWhen,
  fmtWho,
} from "./airUi";

/** The headline: the same air, scored twice. */
export function VerdictCard({
  reading,
  verdict,
}: {
  reading: AirReading | null;
  verdict: AirVerdict;
}) {
  const usColor = verdict.usCategory ? US_CATEGORY_COLOR[verdict.usCategory] : AIR_ACCENT;
  const euColor = verdict.euCategory ? EU_CATEGORY_COLOR[verdict.euCategory] : AIR_ACCENT;

  return (
    <section className="hud-panel rounded-2xl p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* US */}
        <div className="rounded-xl border border-line/60 p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            United States, EPA AQI
          </p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span
              className="font-display text-4xl font-medium tracking-tight"
              style={{ color: usColor }}
            >
              {fmtAqi(verdict.usAqi)}
            </span>
            <span className="text-[12px] leading-snug" style={{ color: usColor }}>
              {verdict.usCategory ?? "unknown"}
            </span>
          </div>
          {verdict.usDriver && (
            <p className="mt-1 font-mono text-[10px] text-faint">
              driven by {POLLUTANT_LABEL[verdict.usDriver]}
            </p>
          )}
        </div>

        {/* Europe */}
        <div className="rounded-xl border border-line/60 p-3.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
            Europe, EEA index
          </p>
          <div className="mt-1 flex items-baseline gap-2.5">
            <span
              className="font-display text-4xl font-medium tracking-tight"
              style={{ color: euColor }}
            >
              {verdict.euCategory ?? "--"}
            </span>
          </div>
          {verdict.euDriver && (
            <p className="mt-1 font-mono text-[10px] text-faint">
              band {verdict.euIndex! + 1} of {EU_CATEGORIES.length}, driven by{" "}
              {POLLUTANT_LABEL[verdict.euDriver]}
            </p>
          )}
        </div>
      </div>

      {verdict.scalesDisagree && (
        <p className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.05] p-3 text-[12px] leading-relaxed text-dim">
          <span className="text-amber-200/90">The two scales disagree right now. </span>
          One of them calls this air clean and the other does not, from the same
          concentrations. That is not a contradiction to resolve: it is two
          countries having drawn their first line in different places.
        </p>
      )}

      {/* the feed's own numbers, as a cross-check rather than as the answer */}
      {reading && (reading.feedUsAqi !== null || reading.feedEuAqi !== null) && (
        <p className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[10px] leading-relaxed text-faint">
          Cross-check: the feed publishes its own indices, US{" "}
          <span className="text-dim">{fmtAqi(reading.feedUsAqi)}</span> and European{" "}
          <span className="text-dim">{fmtAqi(reading.feedEuAqi)}</span>. Ours are
          computed here from the concentrations and the published breakpoint
          tables, so small differences are expected: the tables were revised in
          2024 and the averaging windows differ. A gap of a few points is the two
          methods, not a fault.
        </p>
      )}
    </section>
  );
}

/** Every pollutant, its sub-index on both scales, and what it usually means. */
export function PollutantTable({ subs }: { subs: SubIndex[] }) {
  if (subs.length === 0) {
    return (
      <section className="hud-panel rounded-2xl p-4">
        <p className="text-[12px] text-dim">No pollutant concentrations in the feed.</p>
      </section>
    );
  }
  const worstUs = Math.max(...subs.map((s) => s.usAqi ?? -1));

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        What is actually in the air
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{MAX_NOT_MEAN_NOTE}</p>

      <ul className="mt-3">
        {subs.map((s) => {
          const isDriver = s.usAqi !== null && s.usAqi === worstUs;
          return (
            <li
              key={s.pollutant}
              className="border-t border-line/60 py-2.5 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="min-w-[3.5rem] font-mono text-[13px]"
                  style={{ color: isDriver ? AIR_ACCENT : undefined }}
                >
                  {POLLUTANT_SHORT[s.pollutant]}
                </span>
                <span className="font-mono text-[12px] text-ice">{fmtUgm3(s.ugm3)}</span>
                {s.ppb !== null && (
                  <span className="font-mono text-[10px] text-faint">
                    = {fmtPpb(s.ppb)}
                  </span>
                )}
                {s.usAqi !== null && s.usCategory && (
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: US_CATEGORY_COLOR[s.usCategory] }}
                  >
                    US {s.usAqi}
                  </span>
                )}
                {s.euCategory && (
                  <span
                    className="font-mono text-[11px]"
                    style={{ color: EU_CATEGORY_COLOR[s.euCategory] }}
                  >
                    EU {s.euCategory}
                  </span>
                )}
                {isDriver && (
                  <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-faint">
                    sets the index
                  </span>
                )}
              </div>
              <p className="mt-1 text-[10px] leading-snug text-faint">
                {POLLUTANT_SOURCE[s.pollutant]}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-faint">
                {fmtWho(s.timesWho)}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The WHO comparison, which is the number that actually means something. */
export function WhoCard({ subs }: { subs: SubIndex[] }) {
  const pm = subs.find((s) => s.pollutant === "pm2_5");
  const annual = WHO_GUIDELINE_UGM3.pm2_5?.annual ?? 5;
  const usGoodEdge = US_PM25_BREAKPOINTS[0].cHigh;

  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint">
        Against the WHO guideline
      </h2>
      <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{WHO_ANCHOR_NOTE}</p>

      {pm && (
        <dl className="mt-3 space-y-1.5 font-mono text-[11px]">
          <Row label="PM2.5 here now" value={fmtUgm3(pm.ugm3)} />
          <Row label="WHO 24-hour guideline" value={`${WHO_GUIDELINE_UGM3.pm2_5?.daily} µg/m³`} />
          <Row label="WHO annual guideline" value={`${annual} µg/m³`} />
          <Row
            label="Top of the US Good band"
            value={`${usGoodEdge} µg/m³, which is ${(usGoodEdge / annual).toFixed(1)}x the annual guideline`}
          />
        </dl>
      )}

      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-snug text-faint">
        {NO_CIGARETTES_NOTE}
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-line/60 pt-1.5 first:border-t-0 first:pt-0">
      <dt className="text-faint">{label}</dt>
      <dd className="text-ice">{value}</dd>
    </div>
  );
}

/** The load-bearing panel. */
export function AirHonesty({ reading }: { reading: AirReading | null }) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        What is real, what is a judgement call
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {INDEX_IS_POLICY_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="A model, not a monitor:" cls="text-amber-200/90" body={MODEL_NOT_MONITOR_NOTE} />
        <Item tag="Averaging window:" cls="text-sky-300/90" body={AVERAGING_WINDOW_NOTE} />
        <Item tag="Worst, not average:" cls="text-emerald-300/90" body={MAX_NOT_MEAN_NOTE} />
      </ul>
      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        {CAMS_CREDIT} The breakpoint tables, the band edges, the unit conversions,
        the pollutant attribution and the WHO comparison are all computed by
        lib/air.{" "}
        <a
          href={OPEN_METEO_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the feed
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/AIR_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the method
        </a>
        {reading ? ` · reading for ${fmtWhen(reading.time)}` : ""}
      </p>
    </section>
  );
}

function Item({ tag, cls, body }: { tag: string; cls: string; body: string }) {
  return (
    <li className="border-t border-line/60 pt-2 first:border-t-0 first:pt-0">
      <span className={cls}>{tag} </span>
      {body}
    </li>
  );
}
