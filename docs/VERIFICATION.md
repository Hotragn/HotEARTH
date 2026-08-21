# Verifying this app

Three layers, deliberately separate. Each one catches a class of failure the
others are blind to.

## 1. `npm test` — the physics

1,480+ unit tests, pure and offline. Every physics module is checked against
**published values**, never against its own previous output: Meeus worked
examples, NOAA tables, Hanks & Kanamori moments, published day lengths,
elongation caps, the Gutenberg-Richter b-value, harmonic tidal constants,
Keeling's first monthly mean, NOAA's published geomagnetic pole positions, NSIDC's
published sea ice decline, NOAA's own sea level trend from its file headers.

One module is checked a second way as well. A spherical harmonic synthesis
(`lib/geomagnetism.ts`) returns plausible five-figure numbers even when the
Legendre recursion, the geodetic conversion or the frame rotation is wrong, so
plausibility proves nothing there. Its expected values are the frozen output of
the **official pyIGRF14 reference implementation** distributed with the IGRF
coefficients, run once locally at twelve places and dates, and agreement is
required to 0.05 nT out of 50,000. Where a reference implementation exists,
checking against it beats checking against a range.

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

### The false-positive traps, in full

Six of these have now cost real time. Every one is guarded in `sweep_routes.mjs`
with the reason written next to the guard, because each produced a confident bug
report that was wrong.

| Trap | What it looked like | What it was |
| --- | --- | --- |
| Stale build | every page hung on its boot screen, 500s on hashed CSS/JS | I rebuilt `.next` under a running `next start` |
| Below the fold | occluded buttons on six routes | `elementFromPoint` returns null outside the viewport |
| Clipped by a scroll ancestor | five dead rows in the Seismic Earth list | rows scrolled past the bottom of their own panel |
| First-run overlay | three dead rows on Eclipses | the dismissible "First time here?" tour hint, by design |
| Wrapped inline link | a credit link buried under the globe canvas | union rect of a two-line link, centre in the gap between lines |
| Aborted media request | a failed video request on Interstellar | the video reached `readyState 4` and was playing |

Two of the six were mine to fix in the app; four were the harness lying. The
habit that catches them: **before believing a failure, prove the thing is
actually broken by doing what a user would do.** For a control, dispatch a real
mouse click at the point and check the state changed. That is how the Play
button was confirmed genuinely dead (`aria-label` stayed `Play`) and how the
"data sources" link was cleared (both of its line boxes hit-tested fine).
