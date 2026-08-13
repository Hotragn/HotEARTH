# Verifying this app

Three layers, deliberately separate. Each one catches a class of failure the
others are blind to.

## 1. `npm test` — the physics

1,300+ unit tests, pure and offline. Every physics module is checked against
**published values**, never against its own previous output: Meeus worked
examples, NOAA tables, Hanks & Kanamori moments, published day lengths,
elongation caps, the Gutenberg-Richter b-value, harmonic tidal constants.

`lib/consistency.test.ts` is the odd one out and the most important: it checks
the modules **against each other**. The two worst bugs this codebase has
produced were not wrong numbers, they were two right-*ish* numbers that
disagreed (two auroral oval models eight degrees apart, two great-circle
functions with different Earth radii). Nothing catches that except comparing
modules directly.

## 2. `npm run check:feeds` — the live data

Probes all 15 third-party endpoints for status, CORS, and per-feed sanity
(grid size, staleness, plausible ranges).

**Every probe sends an `Origin` header.** This is not a detail. Without one,
CelesTrak, Open-Meteo and wheretheiss all appear to have no CORS support, and
you will "fix" three feeds that were never broken.

Deliberately **not** in the unit suite: those stay pure and offline, and a
third-party outage must never fail a pull request.

## 3. `npm run check:routes` — what is actually on screen

```bash
npm run build && npx next start -p 3181
npm run check:routes -- --base http://localhost:3181
```

Drives every world in headless Chrome and looks for what tests cannot see. It
exists because **the Galaxies tab shipped with three of its four sections
rendering nothing in the middle of the screen.** Every panel sat in a 340px side
column, the entire centre of a 1440px display was a bare gradient, every test
passed, CI was green, and it stayed that way until a person opened it and said
"it's showing nothing".

So it samples a grid across the *centre band* of the viewport, avoiding the side
columns, and asks what is actually painted there. It also checks console errors,
failed requests, mobile overflow, and that the world switcher is **hit-testable**
rather than merely present in the DOM.

### Two false-positive traps

Both of these produced convincing bug reports that were entirely my own fault.
Read them before believing a failure.

**Stale build.** `next start` serves the build that existed when it booted.
Rebuild `.next` underneath a running server and it starts returning HTTP 500 for
its own hashed CSS and JS: every page hangs on its boot screen and the sweep
reports a catastrophe. The script now refuses to run until it has verified the
server's own assets load. If you see `cannot sweep: stale build`, rebuild **and
restart**.

**Below the fold.** `document.elementFromPoint` returns null for any point
outside the viewport, which is indistinguishable from "something is covering
this control". An early version reported occluded buttons on six routes; all six
were simply below the fold. Any occlusion claim must first prove the point is on
screen.

The general lesson, which has now cost real time twice: **when a harness reports
that everything is broken, suspect the harness first.** An earlier multi-tab nav
test reported all 15 tabs broken because it hit-tested a `md:hidden` button that
is zero-width at desktop width.
