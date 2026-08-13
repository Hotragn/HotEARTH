#!/usr/bin/env node
/**
 * check_feeds.mjs — probe every live endpoint this app depends on at runtime.
 *
 *   node scripts/check_feeds.mjs          # human-readable table
 *   node scripts/check_feeds.mjs --json   # machine-readable
 *
 * The app is keyless and reads several third-party feeds directly from the
 * browser. That means two things can break without any code changing: an
 * endpoint can move or start failing, and it can quietly stop sending
 * `Access-Control-Allow-Origin`, which breaks it in the browser while leaving
 * curl perfectly happy.
 *
 * So every probe here sends an Origin header. That is not a detail: checking
 * without one is how you conclude a working feed is broken, or worse, that a
 * CORS-less feed is fine.
 *
 * This is deliberately NOT part of the unit suite. Those tests are pure and
 * offline; a third-party outage should never fail a pull request. Run this when
 * a tab looks empty, before a release, or on a schedule.
 */

const ORIGIN = "https://h-o-t-earth.vercel.app";
const S = "https://services.swpc.noaa.gov";
const TIMEOUT_MS = 30_000;

/**
 * Every feed, with what it is for and what a healthy answer looks like.
 * `check` returns a short status string, or throws to fail the probe.
 */
const FEEDS = [
  {
    name: "usgs-quakes-day",
    tab: "Seismic Earth",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    check: (d) => {
      if (!Array.isArray(d?.features)) throw new Error("no features array");
      const ageMin = (Date.now() - d.metadata.generated) / 60000;
      if (ageMin > 120) throw new Error(`feed is ${ageMin.toFixed(0)} min stale`);
      return `${d.features.length} events, generated ${ageMin.toFixed(0)} min ago`;
    },
  },
  {
    name: "usgs-quakes-week",
    tab: "Seismic Earth",
    url: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    check: (d) => {
      const n = d?.features?.length ?? 0;
      // A week with under 500 located events worldwide would mean the feed is
      // truncated, not that the planet went quiet.
      if (n < 500) throw new Error(`only ${n} events in a week`);
      return `${n} events`;
    },
  },
  {
    name: "swpc-kp-1m",
    tab: "Aurora",
    url: `${S}/json/planetary_k_index_1m.json`,
    check: (d) => {
      const last = d?.[d.length - 1];
      if (!last?.time_tag) throw new Error("no rows");
      const ageMin = (Date.now() - Date.parse(last.time_tag + "Z")) / 60000;
      if (ageMin > 90) throw new Error(`last sample ${ageMin.toFixed(0)} min old`);
      return `${d.length} rows, kp=${last.estimated_kp}, ${ageMin.toFixed(0)} min old`;
    },
  },
  {
    name: "swpc-kp-forecast",
    tab: "Aurora",
    url: `${S}/products/noaa-planetary-k-index-forecast.json`,
    check: (d) => {
      if (!Array.isArray(d) || d.length < 20) throw new Error("short forecast");
      const predicted = d.filter((r) => r.observed === "predicted").length;
      if (predicted === 0) throw new Error("no predicted rows");
      return `${d.length} rows, ${predicted} predicted`;
    },
  },
  {
    name: "swpc-kp-legacy",
    tab: "Sun",
    url: `${S}/products/noaa-planetary-k-index.json`,
    check: (d) => {
      if (!Array.isArray(d) || d.length < 2) throw new Error("empty");
      return `${d.length} rows`;
    },
  },
  {
    name: "swpc-ovation",
    tab: "Aurora, Sun",
    url: `${S}/json/ovation_aurora_latest.json`,
    check: (d) => {
      const c = d?.coordinates;
      if (!Array.isArray(c) || c.length !== 65160) {
        throw new Error(`expected a 360x181 grid, got ${c?.length}`);
      }
      const validMin = (Date.parse(d["Forecast Time"]) - Date.now()) / 60000;
      const peak = c.reduce((m, x) => (x[2] > m ? x[2] : m), 0);
      return `65,160 pts, peak ${peak}%, valid ${validMin > 0 ? "+" : ""}${validMin.toFixed(0)} min`;
    },
  },
  {
    name: "swpc-wind-speed",
    tab: "Aurora, Sun",
    url: `${S}/products/summary/solar-wind-speed.json`,
    check: (d) => {
      const v = d?.[0]?.proton_speed;
      if (!Number.isFinite(v)) throw new Error("no proton_speed");
      if (v < 150 || v > 1200) throw new Error(`implausible speed ${v}`);
      return `${v} km/s`;
    },
  },
  {
    name: "swpc-wind-mag",
    tab: "Aurora, Sun",
    url: `${S}/products/summary/solar-wind-mag-field.json`,
    check: (d) => {
      const bz = d?.[0]?.bz_gsm;
      if (!Number.isFinite(bz)) throw new Error("no bz_gsm");
      return `bt=${d[0].bt} nT, bz=${bz} nT`;
    },
  },
  {
    name: "swpc-xray-6h",
    tab: "Sun",
    url: `${S}/json/goes/primary/xrays-6-hour.json`,
    check: (d) => {
      if (!Array.isArray(d) || d.length === 0) throw new Error("empty");
      return `${d.length} samples`;
    },
  },
  {
    name: "swpc-xray-flares",
    tab: "Sun",
    url: `${S}/json/goes/primary/xray-flares-latest.json`,
    check: (d) => `class ${d?.[0]?.current_class ?? "?"}`,
  },
  {
    name: "swpc-f107",
    tab: "Sun",
    url: `${S}/json/f107_cm_flux.json`,
    check: (d) => {
      if (!Array.isArray(d) || d.length === 0) throw new Error("empty");
      return `${d.length} rows, latest flux ${d[d.length - 1]?.flux}`;
    },
  },
  {
    name: "celestrak-iss-tle",
    tab: "ISS, Tonight",
    url: "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",
    text: true,
    check: (t) => {
      const lines = t.trim().split("\n");
      if (lines.length < 3) throw new Error("not a 3-line TLE");
      if (!lines[1].startsWith("1 25544")) throw new Error("wrong catalogue number");
      return `${lines[0].trim()}, epoch field ${lines[1].slice(18, 32)}`;
    },
  },
  {
    name: "wheretheiss",
    tab: "ISS",
    url: "https://api.wheretheiss.at/v1/satellites/25544",
    check: (d) => {
      if (!Number.isFinite(d?.latitude)) throw new Error("no latitude");
      return `lat ${d.latitude.toFixed(2)}, alt ${Math.round(d.altitude)} km`;
    },
  },
  {
    name: "open-meteo",
    tab: "Earth",
    url: "https://api.open-meteo.com/v1/forecast?latitude=42.36&longitude=-71.06&current=temperature_2m,wind_speed_10m",
    check: (d) => {
      const t = d?.current?.temperature_2m;
      if (!Number.isFinite(t)) throw new Error("no current temperature");
      return `${t} C, wind ${d.current.wind_speed_10m}`;
    },
  },
  {
    name: "nasa-gibs-wms",
    tab: "Earth, Living Earth",
    url:
      "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap" +
      "&SRS=EPSG:4326&BBOX=-180,-90,180,90&WIDTH=256&HEIGHT=128&FORMAT=image/jpeg" +
      "&LAYERS=BlueMarble_ShadedRelief_Bathymetry",
    binary: true,
    check: (buf) => {
      // JPEG magic: FF D8 FF
      if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("not a JPEG");
      return `JPEG, ${buf.length} bytes`;
    },
  },
];

async function probe(feed) {
  const started = Date.now();
  try {
    const res = await fetch(feed.url, {
      headers: { Origin: ORIGIN },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const cors = res.headers.get("access-control-allow-origin");
    const ms = Date.now() - started;

    if (!res.ok) {
      return { ...feed, ok: false, status: res.status, cors, ms, detail: `HTTP ${res.status}` };
    }
    // A missing CORS header is a real failure for this app even though the
    // request itself succeeded: the browser would refuse the response.
    if (cors !== "*" && cors !== ORIGIN) {
      return { ...feed, ok: false, status: res.status, cors, ms, detail: "no CORS header" };
    }

    let payload;
    if (feed.binary) payload = Buffer.from(await res.arrayBuffer());
    else if (feed.text) payload = await res.text();
    else payload = await res.json();

    return { ...feed, ok: true, status: res.status, cors, ms, detail: feed.check(payload) };
  } catch (err) {
    return {
      ...feed,
      ok: false,
      status: null,
      cors: null,
      ms: Date.now() - started,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

const results = await Promise.all(FEEDS.map(probe));
const failed = results.filter((r) => !r.ok);

if (process.argv.includes("--json")) {
  console.log(
    JSON.stringify(
      results.map(({ name, tab, url, ok, status, cors, ms, detail }) => ({
        name,
        tab,
        url,
        ok,
        status,
        cors,
        ms,
        detail,
      })),
      null,
      2
    )
  );
} else {
  console.log(`\n  H.O.T EARTH live feed check  (${new Date().toISOString()})\n`);
  for (const r of results) {
    const mark = r.ok ? "ok  " : "FAIL";
    console.log(
      `  ${mark} ${r.name.padEnd(20)} ${String(r.ms).padStart(5)}ms  ${r.detail}`
    );
    if (!r.ok) console.log(`       ${r.tab} · ${r.url}`);
  }
  console.log(
    `\n  ${results.length - failed.length}/${results.length} healthy` +
      (failed.length ? `, ${failed.length} FAILING\n` : "\n")
  );
}

process.exit(failed.length > 0 ? 1 : 0);
