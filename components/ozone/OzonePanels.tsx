"use client";

import {
  AREA_IS_A_NOISY_DETECTOR_NOTE,
  CAUSE_AND_EFFECT_NOTE,
  CFC11_NOTE,
  HCFC_TRADE_NOTE,
  LIFETIME_NOTE,
  MOONLIGHT_NOTE,
  NATURAL_SOURCES_NOTE,
  NOT_A_FORECAST_NOTE,
  NO_ARCTIC_HOLE_NOTE,
  SATELLITE_GAP_NOTE,
  SURFACE_OZONE_NOTE,
  THRESHOLD_IS_A_CONVENTION_NOTE,
  TYPICAL_COLUMN_DU,
  WINDOW_CHANGES_THE_ANSWER_NOTE,
  dobsonToMillimetres,
  type CrossCheck,
  type GasIndex,
  type HoleRecord,
  type IndexCheck,
  type OzoneData,
  type Station,
  type Trend,
} from "@/lib/ozone";
import {
  BENCHMARK_COLOR,
  CHEM_COLOR,
  COLUMN_COLOR,
  DOBSON_PAGE,
  DOCS_BASE,
  HOLE_COLOR,
  ODGI_PAGE,
  OZONE_WATCH_PAGE,
  fmtArea,
  fmtDu,
  fmtPercent,
  fmtPpt,
  fmtSlope,
  fullMonth,
  sigmaWords,
} from "./ozoneUi";

/** The layer as an actual thickness, which is the thing nobody pictures right. */
export function ThicknessCard({ hole }: { hole: HoleRecord }) {
  const worst = Math.min(...hole.minimumDu);
  const worstYear = hole.years[hole.minimumDu.indexOf(worst)];
  const latest = hole.minimumDu[hole.minimumDu.length - 1];
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        The whole ozone layer, as a thickness
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: COLUMN_COLOR }}
      >
        {dobsonToMillimetres(TYPICAL_COLUMN_DU)!.toFixed(1)} mm
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        A Dobson Unit is not an abstraction. It is a hundredth of a millimetre of pure ozone at sea
        level pressure, so a typical {TYPICAL_COLUMN_DU} DU column is about three millimetres of
        gas, and that is the entire thing standing between the biosphere and the ultraviolet.
      </p>
      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label={`Thinnest ever measured, ${worstYear}`}
          value={`${dobsonToMillimetres(worst)!.toFixed(2)} mm`}
          note={`${fmtDu(worst, 1)} over the Antarctic cap, about a third of normal`}
        />
        <Row
          label={`Thinnest in ${hole.years[hole.years.length - 1]}`}
          value={`${dobsonToMillimetres(latest)!.toFixed(2)} mm`}
          note={`${fmtDu(latest, 1)}, averaged over ${hole.minimumWindow}`}
        />
      </dl>
    </section>
  );
}

/** The falling chemicals, which is the part that is not in doubt. */
export function IndexCard({
  index,
  check,
  recovered,
  straightLine,
}: {
  index: GasIndex;
  check: IndexCheck | null;
  recovered: number | null;
  straightLine: number | null;
}) {
  const latest = index.odgi[index.odgi.length - 1];
  const latestYear = index.years[index.years.length - 1];
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        Ozone depleting gases over Antarctica, {latestYear}
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: CHEM_COLOR }}
      >
        {latest.toFixed(1)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        100 at the peak, 0 at the 1980 level. The halogen loading is{" "}
        <span className="text-ice">
          {recovered !== null ? `${recovered.toFixed(1)}%` : "unknown"}
        </span>{" "}
        of the way back, and this is a measurement of air rather than a count of what was
        manufactured.
      </p>
      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label={`Peak, ${index.peakYear}`}
          value={fmtPpt(index.peakEescPpt)}
          note="fourteen years after the Montreal Protocol was signed, because the gases take that long to get up there"
        />
        <Row
          label="The 1980 level"
          value={fmtPpt(index.benchmark1980Ppt, 1)}
          note="not published in the file: solved from the two columns that are, because the index is affine in them"
        />
        <Row
          label="Index rebuilt from those two"
          value={check ? `agrees to ${check.worst.toFixed(3)}` : "unknown"}
          note={
            check
              ? `across all ${check.n} years, against NOAA's own published index column`
              : undefined
          }
        />
        <Row
          label="Straight line to zero"
          value={straightLine !== null ? straightLine.toFixed(0) : "unknown"}
          note="arithmetic, not a forecast: the decay bends, and the assessments that model it get an earlier date"
        />
      </dl>
    </section>
  );
}

/** The load-bearing panel: the cause is clear, the effect is not. */
export function DetectionCard({
  fit,
  fullFit,
  correlation,
  windowStart,
}: {
  fit: Trend | null;
  fullFit: Trend | null;
  correlation: { area: number; minimum: number; n: number } | null;
  windowStart: number;
}) {
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        The chemicals are falling. The hole has not noticed yet.
      </h2>
      <dl className="mt-3 font-mono text-[11px]">
        <Row
          label={`Hole area, ${fullFit?.firstYear ?? "?"} onward`}
          value={fmtSlope(fullFit?.slope ?? null, fullFit?.stderr ?? null, "Mkm²/yr")}
          note={`${sigmaWords(fullFit?.sigma ?? null)}, and growing, because this window contains the onset`}
        />
        {/* Only when the reader has moved off the full record. Otherwise this is
            the row above with a second, contradictory-sounding note under it. */}
        {fullFit && windowStart !== fullFit.firstYear && (
          <Row
            label={`Hole area, ${windowStart} onward`}
            value={fmtSlope(fit?.slope ?? null, fit?.stderr ?? null, "Mkm²/yr")}
            note={`${sigmaWords(fit?.sigma ?? null)}: the line moves the area ${
              fit ? Math.abs(fit.span).toFixed(1) : "?"
            } against a scatter of ${fit ? fit.residualSd.toFixed(1) : "?"}`}
          />
        )}
        <Row
          label="Chlorine against hole area"
          value={correlation ? `r = ${correlation.area >= 0 ? "+" : ""}${correlation.area.toFixed(2)}` : "unknown"}
          note={
            correlation
              ? `over ${correlation.n} shared years, and the sign is the wrong way round`
              : undefined
          }
        />
      </dl>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {CAUSE_AND_EFFECT_NOTE}
      </p>
    </section>
  );
}

/** Two instruments, three decades apart in design, agreeing anyway. */
export function CrossCheckCard({
  check,
  station,
}: {
  check: CrossCheck | null;
  station: Station | undefined;
}) {
  if (!check || !station) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        A hut at the pole against a satellite
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: BENCHMARK_COLOR }}
      >
        r = {check.r.toFixed(2)}
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        {fullMonth(check.month)} mean total column at {station.name}, against NASA&apos;s minimum
        anywhere on the Antarctic cap, over {check.n} shared years from {check.firstYear}. Different
        instruments, different quantities, no shared calibration, and nothing here was fitted to
        make them agree.
      </p>
      <dl className="mt-3 border-t border-line/60 pt-2.5 font-mono text-[11px]">
        <Row
          label="Observations at this station"
          value={station.observations.toLocaleString()}
          note={`from ${station.months[0]} to ${station.months[station.months.length - 1]}, each one a person pointing an instrument`}
        />
        <Row
          label="Measured by moonlight"
          value={(station.kinds["Direct_Moon"] ?? 0).toLocaleString()}
          note="because the sun is below the horizon for half the year and the column still had to be measured"
        />
      </dl>
    </section>
  );
}

/** CFC-11: a treaty violation and its correction, in three numbers. */
export function ViolationCard({
  before,
  during,
  after,
}: {
  before: { pptPerYear: number } | null;
  during: { pptPerYear: number } | null;
  after: { pptPerYear: number } | null;
}) {
  if (!before || !during || !after) return null;
  return (
    <section className="hud-panel rounded-2xl p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-faint">
        How the world found out somebody had restarted production
      </h2>
      <dl className="mt-3 font-mono text-[11px]">
        <Row
          label="CFC-11 decline, 2002 to 2012"
          value={`${before.pptPerYear.toFixed(2)} ppt/yr`}
          note="falling steadily, as a banned gas with a fifty year lifetime should"
        />
        <Row
          label="CFC-11 decline, 2013 to 2018"
          value={`${during.pptPerYear.toFixed(2)} ppt/yr`}
          note={`${(100 * (1 - during.pptPerYear / before.pptPerYear)).toFixed(0)} percent of the expected fall simply not happening, for six years running`}
        />
        <Row
          label="CFC-11 decline, 2019 onward"
          value={`${after.pptPerYear.toFixed(2)} ppt/yr`}
          note="back to the old rate once the source was located and shut down"
        />
      </dl>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {CFC11_NOTE}
      </p>
    </section>
  );
}

/** The Arctic comparison, which is the physics. */
export function VortexCard({
  south,
  north,
}: {
  south: { code: string; name: string; month: number; percent: number } | null;
  north: { code: string; name: string; month: number; percent: number } | null;
}) {
  if (!south || !north) return null;
  const ratio = Math.abs(south.percent) / Math.max(Math.abs(north.percent), 0.01);
  return (
    <section className="hud-panel rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">
        Two polar stations, one planet&apos;s worth of chlorine
      </p>
      <p
        className="mt-1 font-display text-4xl font-medium tracking-tight"
        style={{ color: HOLE_COLOR }}
      >
        {ratio.toFixed(0)}×
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-dim">
        {south.name} lost {Math.abs(south.percent).toFixed(1)}% of its {fullMonth(south.month)}{" "}
        column. {north.name}, equally polar and equally dark in winter, lost{" "}
        {Math.abs(north.percent).toFixed(1)}% in {fullMonth(north.month)}. Same chemicals, the same
        sunlight coming back after a long night, and a factor of {ratio.toFixed(0)} between them.
      </p>
      <p className="mt-3 border-t border-line/60 pt-2.5 text-[11px] leading-relaxed text-dim">
        {NO_ARCTIC_HOLE_NOTE}
      </p>
    </section>
  );
}

/** The load-bearing honesty block. */
export function OzoneHonesty({
  data,
  generated,
}: {
  data: OzoneData;
  generated: Date | null;
}) {
  const stations = data.stations.length;
  return (
    <section className="hud-panel rounded-2xl border border-amber-400/25 p-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-200/90">
        Where the numbers stop, and what this cannot tell you
      </h2>
      <p className="mt-2 text-[12px] font-medium leading-snug text-ice">
        {THRESHOLD_IS_A_CONVENTION_NOTE}
      </p>
      <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-dim">
        <Item tag="A noisy detector:" cls="text-amber-200/90" body={AREA_IS_A_NOISY_DETECTOR_NOTE} />
        <Item tag="Pick a window, pick an answer:" cls="text-sky-300/90" body={WINDOW_CHANGES_THE_ANSWER_NOTE} />
        <Item tag="Lifetimes, published and measured:" cls="text-violet-300/90" body={LIFETIME_NOTE} />
        <Item tag="What the treaty cannot reach:" cls="text-emerald-300/90" body={NATURAL_SOURCES_NOTE} />
        <Item tag="The replacement:" cls="text-rose-300/90" body={HCFC_TRADE_NOTE} />
        <Item tag="A missing year:" cls="text-amber-200/90" body={SATELLITE_GAP_NOTE} />
        <Item tag="Measured by moonlight:" cls="text-sky-300/90" body={MOONLIGHT_NOTE} />
        <Item tag="Good up there, bad down here:" cls="text-violet-300/90" body={SURFACE_OZONE_NOTE} />
        <Item tag="Not a forecast:" cls="text-emerald-300/90" body={NOT_A_FORECAST_NOTE} />
      </ul>

      <p className="mt-3 border-t border-line/60 pt-2 text-[10px] leading-relaxed text-faint">
        Antarctic ozone hole area and minimum column from NASA Ozone Watch, Goddard Space Flight
        Center. Ozone Depleting Gas Index from the NOAA Global Monitoring Laboratory (Montzka,
        Dutton and Vimont). Total column from {stations} stations of the NOAA Dobson network, the
        longest of them running since 1963. All three are free to use with credit and none needs a
        key. Every trend, correlation, lifetime fit and percentage here is computed by lib/ozone
        from that mirror.{" "}
        <a
          href={OZONE_WATCH_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          Ozone Watch
        </a>
        {" · "}
        <a
          href={ODGI_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          ODGI
        </a>
        {" · "}
        <a
          href={DOBSON_PAGE}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          Dobson network
        </a>
        {" · "}
        <a
          href={`${DOCS_BASE}/OZONE_PHYSICS.md`}
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-amber-200/80 transition-colors duration-200 hover:text-amber-100"
        >
          the method
        </a>
        {generated ? ` · mirror built ${generated.toLocaleDateString()}` : ""}
      </p>
    </section>
  );
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t border-line/60 pt-1.5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <dt className="text-faint">{label}</dt>
        <dd className="text-ice">{value}</dd>
      </div>
      {note && <p className="mt-0.5 text-[10px] leading-snug text-faint">{note}</p>}
    </div>
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

/** Exported so the app can render the hole summary without duplicating format. */
export function HoleSummary({ hole }: { hole: HoleRecord }) {
  const last = hole.years.length - 1;
  return (
    <p className="text-[12px] leading-relaxed text-dim">
      In {hole.years[last]} the hole covered {fmtArea(hole.areaMillionKm2[last])} averaged over{" "}
      {hole.areaWindow}, and the column got down to {fmtDu(hole.minimumDu[last], 1)}.
      Both numbers are areas and minima inside a line drawn at {hole.thresholdDu} DU.
    </p>
  );
}
