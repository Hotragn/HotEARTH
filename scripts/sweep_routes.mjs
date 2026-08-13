#!/usr/bin/env node
/**
 * sweep_routes.mjs — drive every world in a real browser and look for the
 * failures that unit tests and CI cannot see.
 *
 *   npm run build && npx next start -p 3181
 *   node scripts/sweep_routes.mjs                    # all routes
 *   node scripts/sweep_routes.mjs --only galaxies    # one, or a comma list
 *   node scripts/sweep_routes.mjs --json
 *
 * WHY THIS EXISTS
 *
 * The Galaxies tab shipped with three of its four sections rendering nothing in
 * the middle of the screen: every panel of content sat in a 340px side column
 * and the entire centre of a 1440px display was a bare gradient. Every unit test
 * passed, the build was clean, CI was green, and it stayed that way until a
 * person opened the tab and said "it's showing nothing". Nothing in the test
 * suite can see that, because the suite never renders anything.
 *
 * So this samples a grid of points across the CENTRE BAND of the viewport,
 * deliberately avoiding the side columns, and asks what is actually painted
 * there. A tab where the middle of the screen is empty is a tab with a bug,
 * whatever the tests say.
 *
 * WHAT IT CHECKS, per route
 *   1. centre-of-screen content (the bug above)
 *   2. OCCLUDED CONTROLS. This one has already earned its keep: the Interstellar
 *      "Skip intro" button sat at `absolute right-4 top-4`, which is exactly
 *      where NavShell puts Search, Worlds and About. The nav renders above the
 *      tab, so the button was completely unclickable at every width, and the
 *      only visible symptom was some text bleeding out from behind "Worlds".
 *      Every on-screen control is hit-tested against elementFromPoint.
 *   3. console errors and uncaught exceptions
 *   4. failed or 4xx/5xx network requests
 *   5. horizontal overflow at 390px
 *   6. the world switcher present AND hit-testable, not merely in the DOM
 *
 * TWO FALSE-POSITIVE TRAPS, both of which caught me while writing it. Read
 * these before believing a failure:
 *
 *   STALE BUILD. `next start` serves the build that existed when it booted. If
 *   you rebuild `.next` underneath a running server, it starts returning 500 for
 *   its own hashed CSS and JS, every page hangs on its boot screen, and the
 *   sweep reports a catastrophe that is entirely your own doing. This script
 *   now refuses to run until it has verified that the assets the server
 *   references actually load.
 *
 *   BELOW THE FOLD. document.elementFromPoint returns null for any point
 *   outside the viewport, which looks identical to "something is covering this
 *   control". An earlier version reported occluded buttons on six routes; all
 *   six were simply below the fold. Anything claiming occlusion must first
 *   prove the point is on screen.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
};
const BASE = arg("--base") || process.env.BASE || "http://localhost:3181";
const WAIT_MS = Number(arg("--wait") || process.env.WAIT_MS || 12000);
const HARD_MS = 90_000;
const ONLY = arg("--only")?.split(",").map((s) => s.trim());
const AS_JSON = process.argv.includes("--json");
const SHOTS = arg("--shots");

/** Read the route list from the registry, so a new world is swept automatically. */
function routesFromRegistry() {
  const src = readFileSync(join(REPO, "lib/worlds.ts"), "utf8");
  const re =
    /id:\s*"([a-z0-9-]+)",\s*\n\s*label:\s*"([^"]+)",\s*\n\s*href:\s*"([^"]+)"/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) out.push({ id: m[1], label: m[2], href: m[3] });
  return out;
}

/**
 * Refuse to sweep a server whose build has been deleted underneath it. Costs one
 * request and saves an afternoon of chasing bugs that are not there.
 */
async function assertServerHealthy() {
  const res = await fetch(BASE + "/", { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${BASE}/ returned HTTP ${res.status}`);
  const html = await res.text();
  const assets = [...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)]
    .map((m) => m[1])
    .slice(0, 6);
  if (assets.length === 0) throw new Error("no /_next/static assets referenced; is this the app?");
  for (const a of assets) {
    const r = await fetch(BASE + a, { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) {
      throw new Error(
        `stale build: ${a} returns HTTP ${r.status}.\n` +
          `  The server is serving a build that no longer exists on disk.\n` +
          `  Rebuild AND restart it: npm run build && npx next start -p <port>`
      );
    }
  }
}

/** Runs inside the page. */
const PROBE = () => {
  const meaningful = (el) => {
    let n = el;
    for (let d = 0; n && d < 4; d++, n = n.parentElement) {
      const tag = n.tagName.toLowerCase();
      if (["canvas", "svg", "img", "video"].includes(tag)) return tag;
    }
    return (el.textContent || "").trim().length > 0 ? "text" : el.tagName.toLowerCase();
  };

  const W = window.innerWidth;
  const H = window.innerHeight;
  // The centre band only: 35% to 65% of the width misses the 340px side
  // columns at every viewport this app targets.
  const xs = [0.35, 0.45, 0.5, 0.55, 0.65].map((f) => Math.round(W * f));
  const ys = [0.3, 0.45, 0.6, 0.75].map((f) => Math.round(H * f));
  const hits = [];
  for (const x of xs) {
    for (const y of ys) {
      const el = document.elementFromPoint(x, y);
      hits.push(el ? meaningful(el) : null);
    }
  }

  const inViewport = (r) =>
    r.x + r.width / 2 >= 0 &&
    r.y + r.height / 2 >= 0 &&
    r.x + r.width / 2 <= window.innerWidth &&
    r.y + r.height / 2 <= window.innerHeight;

  const clippedByScrollAncestor = (el, r) => {
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (!/auto|scroll|hidden/.test(cs.overflow + cs.overflowY + cs.overflowX)) continue;
      const ar = a.getBoundingClientRect();
      if (cy < ar.top - 1 || cy > ar.bottom + 1 || cx < ar.left - 1 || cx > ar.right + 1) {
        return true;
      }
    }
    return false;
  };

  // Every interactive control that is actually on screen must be reachable by
  // a click at its own centre. A control covered by other chrome is invisible
  // to every test in the suite and to the type checker.
  const occluded = [];
  for (const el of document.querySelectorAll(
    "button, input, select, a[href], [role='tab']"
  )) {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    if (!inViewport(r)) continue; // below the fold is not occlusion
    // Nor is being scrolled out of a panel. A row inside an overflow-y-auto
    // column still reports a rect at its layout position even when it is
    // clipped out of sight, and the hit test then lands on whatever IS painted
    // there. That produced five "occluded" rows on the Seismic Earth list which
    // were simply scrolled past the bottom of their own panel.
    if (clippedByScrollAncestor(el, r)) continue;
    const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (top && (el.contains(top) || top.contains(el))) continue;
    occluded.push({
      label: (el.getAttribute("aria-label") || el.textContent || el.tagName)
        .trim()
        .slice(0, 40),
      at: [Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2)],
      coveredBy: top
        ? `${top.tagName.toLowerCase()}.${(typeof top.className === "string" ? top.className : "").split(" ").slice(0, 2).join(".")}`
        : "nothing",
    });
  }

  const navButtons = [...document.querySelectorAll("nav[aria-label='Worlds'] button")].filter(
    (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 2 && r.height > 2;
    }
  );

  return {
    occluded,
    centreHits: hits,
    centreSubstantive: hits.filter((h) =>
      ["canvas", "svg", "img", "video", "text"].includes(h)
    ).length,
    centreTotal: hits.length,
    canvases: document.querySelectorAll("canvas").length,
    textLen: (document.body.innerText || "").length,
    navButtons: navButtons.length,
    // Hit-tested, and only for controls actually on screen: see the
    // below-the-fold trap in the header.
    navReachable:
      navButtons.length > 0 &&
      navButtons.every((el) => {
        const r = el.getBoundingClientRect();
        if (!inViewport(r)) return true;
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!top && (el.contains(top) || top.contains(el));
      }),
  };
};

const launch = () =>
  puppeteer.launch({
    headless: true,
    protocolTimeout: 180_000,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

const withTimeout = (p, ms, label) =>
  Promise.race([
    p,
    new Promise((_, rej) =>
      setTimeout(() => rej(new Error(`timed out after ${ms}ms (${label})`)), ms)
    ),
  ]);

async function sweepRoute(browser, route) {
  // A fresh page per route. Sharing one page means a heavy WebGL tab that hangs
  // takes the whole session with it, and every route after it reports a failure
  // it did not have.
  const page = await browser.newPage();
  const errors = [];
  const netFails = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 160)));
  page.on("requestfailed", (r) =>
    netFails.push(`${r.failure()?.errorText} ${r.url().slice(0, 80)}`)
  );
  page.on("response", (r) => {
    if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url().slice(0, 80)}`);
  });

  try {
    await page.setViewport({ width: 1600, height: 1000 });
    await page.goto(BASE + route.href, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await new Promise((r) => setTimeout(r, WAIT_MS));

    const desktop = await page.evaluate(PROBE);
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: join(SHOTS, `${route.id}.png`) }).catch(() => {});
    }

    await page.setViewport({ width: 390, height: 844 });
    await new Promise((r) => setTimeout(r, 3000));
    const mobile = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));

    return {
      ...route,
      ...desktop,
      overflow: mobile.scrollW - mobile.clientW,
      errors: [...new Set(errors)].slice(0, 4),
      netFails: [...new Set(netFails)].slice(0, 4),
    };
  } finally {
    await page.close().catch(() => {});
  }
}

// ─────────────────────────────────── run ─────────────────────────────────────

try {
  await assertServerHealthy();
} catch (e) {
  console.error(`\n  cannot sweep: ${e.message}\n`);
  process.exit(2);
}

const all = routesFromRegistry();
const routes = ONLY ? all.filter((r) => ONLY.includes(r.id)) : all;
if (routes.length === 0) {
  console.error(`  no routes matched --only ${ONLY?.join(",")}`);
  process.exit(2);
}

let browser = await launch();
const results = [];

for (const route of routes) {
  if (!AS_JSON) process.stdout.write(`  ${route.href.padEnd(20)}`);
  try {
    const r = await withTimeout(sweepRoute(browser, route), HARD_MS, route.href);
    results.push(r);
    if (!AS_JSON) {
      const flags = [];
      if (r.centreSubstantive === 0) flags.push("EMPTY-CENTRE");
      else if (r.centreSubstantive <= 2) flags.push("thin-centre");
      if (r.overflow > 0) flags.push(`overflow+${r.overflow}px`);
      if (!r.navReachable) flags.push("NAV-BLOCKED");
      if (r.occluded.length) flags.push(`${r.occluded.length}-OCCLUDED`);
      if (r.errors.length) flags.push(`${r.errors.length}err`);
      if (r.netFails.length) flags.push(`${r.netFails.length}net`);
      console.log(
        `${String(r.centreSubstantive).padStart(2)}/${r.centreTotal} centre  ` +
          (flags.length ? flags.join(" ") : "ok")
      );
    }
  } catch (e) {
    if (!AS_JSON) console.log(`HARNESS-FAIL: ${e.message.slice(0, 60)}`);
    results.push({ ...route, harnessFail: e.message.slice(0, 140) });
    // A dead browser session poisons every route after it.
    await browser.close().catch(() => {});
    browser = await launch();
  }
}
await browser.close().catch(() => {});

const real = results.filter((r) => !r.harnessFail);
const flagged = real.filter(
  (r) =>
    r.centreSubstantive === 0 ||
    r.overflow > 0 ||
    !r.navReachable ||
    r.occluded.length > 0 ||
    r.errors.length > 0 ||
    r.netFails.length > 0
);
const harness = results.filter((r) => r.harnessFail);

if (AS_JSON) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(
    `\n  ${real.length - flagged.length}/${real.length} clean` +
      (flagged.length ? `, ${flagged.length} flagged` : "") +
      (harness.length ? `, ${harness.length} harness failures (NOT app bugs)` : "") +
      "\n"
  );
  for (const b of flagged) {
    console.log(`  ${b.href}`);
    if (b.centreSubstantive === 0)
      console.log(`      EMPTY CENTRE  ${JSON.stringify(b.centreHits.slice(0, 8))}`);
    if (b.overflow > 0) console.log(`      mobile overflow +${b.overflow}px`);
    if (!b.navReachable) console.log(`      world switcher not hit-testable`);
    for (const o of b.occluded)
      console.log(`      OCCLUDED "${o.label}" at ${o.at.join(",")} under ${o.coveredBy}`);
    for (const e of b.errors) console.log(`      err: ${e}`);
    for (const n of b.netFails) console.log(`      net: ${n}`);
  }
  for (const h of harness) console.log(`  ${h.href} -> harness: ${h.harnessFail}`);
}

process.exit(flagged.length > 0 ? 1 : 0);
