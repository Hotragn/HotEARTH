# Tides: a correct theory that gets the answer wrong

**Honesty rule for this tab.** The curve this app computes is Newton's equilibrium tide. It is real
physics, derived correctly, and it is **wrong about the sea level at every coast on Earth**. The tab
exists to show that rather than describe it, by plotting the theory against a live tide gauge.

**Do not navigate by it.** NOAA publishes real predictions for these stations from a harmonic fit to
each station's own record. Those are the numbers to use.

Implemented in `lib/tides.ts`, validated by 29 unit tests in `lib/tides.test.ts`.

## Data

| | |
| --- | --- |
| Gauge | NOAA CO-OPS `water_level`, measured, 6-minute samples |
| Licence | public domain (US Government work) |
| Key required | none |
| Everything else | computed here from `lib/lunar`, `lib/solar`, `lib/planets`, `lib/celestial` |

The gauge is the only thing fetched. The tide curve, the spring-neap state and the amplification
factor are all computed from positions this app already had.

## 1. The tide-raising force, and why the Moon wins

The equilibrium tide coefficient for a body:

$$ A = \frac{M_{body}}{M_\oplus} \left(\frac{R_\oplus}{d}\right)^3 R_\oplus $$

The **cube** is the whole story. Tidal force is a *difference* in gravity across the Earth's
diameter, not gravity itself, so it falls off as $d^{-3}$ rather than $d^{-2}$.

| | Pull on Earth | Distance | Tidal effect |
| --- | --- | --- | --- |
| Sun | ~178× the Moon's | 390× further | **0.16 m** |
| Moon | 1× | 1× | **0.36 m** |

Those two coefficients are the values every physical oceanography text quotes, and the tests pin
both, along with the ratio (~0.46) and the exact $2^3 = 8$ falloff on doubling the distance.

Because $d$ is the *real* distance each instant, lunar perigee raises the coefficient about **1.4×**
above apogee — the published perigean spring tide effect, also tested.

## 2. Two high tides a day, not one

$$ \zeta = A \cdot \frac{3\cos^2\psi - 1}{2} $$

with $\psi$ the body's zenith angle. That Legendre term is **positive both where the body is overhead
and where it is underfoot**: the near side is pulled toward the Moon, and on the far side the solid
Earth is pulled away from the water. A one-bulge picture predicts one daily high tide, which nobody
observes. The tests assert the two bulges are equal to 6 decimal places and that the ring 90° away
is drawn down.

## 3. Springs and neaps

Springs occur when the Sun and Moon pull along the **same line** — which is both new Moon *and* full
Moon, because alignment is what matters, not which side. Neaps come at the quarters.

$$ \text{alignment} = \frac{1 + \cos(2\theta)}{2} $$

**A bug worth recording**, because it survived my first pass: I wrote $|\cos 2\theta|$, which has a
period of 90° and therefore reads 1 at the *quarters* as well, calling every neap a spring. The
unsigned form is what carries the physics: the solar term **adds** at syzygy and **subtracts** at
quadrature. The tests now check the quarters explicitly and measure the cycle length against the
published 14.765-day fortnight.

## 4. What the theory gets right: the rhythm

The strongest test in the file measures the **period of the computed curve** by timing successive
maxima, and checks it against the published M2 constituent of **12 h 25.2 m**. That exercises the
entire chain at once — lunar position, sidereal time, sub-lunar point, zenith angle, Legendre term —
rather than any single formula in isolation. A separate test counts peaks to confirm ~1.93 highs per
day rather than one.

M2 is half a **lunar** day, not half a solar day, which is why high tide slides about 50 minutes
later each day.

## 5. What it gets wrong: the size

Measured on real gauges, against the same window of computed theory:

| Station | Measured range | Theory | Factor |
| --- | --- | --- | --- |
| Eastport, Maine (Bay of Fundy) | 7.07 m | 0.71 m | **10×** |
| Boston | 3.90 m | 0.74 m | 5.3× |
| Honolulu | 0.87 m | 0.85 m | **1.02×** |
| Galveston | 0.77 m | 0.83 m | 0.93× |

*(a real reading from 2026-08-13; these change with the fortnight)*

The Honolulu row is the one that proves the point. Mid-ocean, far from any resonant shelf, the real
tide matches the equilibrium theory **almost exactly**. The theory is not broken. It describes a
global ocean with no basins, and where the ocean most nearly resembles that, it is right.

Everywhere else, tides are a **resonant response**: a small periodic push, and each basin answers
according to its own size, depth and shape, amplifying where its natural period is near the forcing
and cancelling where it is not. Continents, shelves and Coriolis turn the result into waves rotating
around amphidromic points. None of that is in the equilibrium theory, and no amount of care with the
potential will put it there. That is what harmonic analysis is for.

## 6. The phase lag

The two curves do not peak together, and that offset is real. An ocean basin does not respond
instantly; the water has to be moved and it arrives late. Mariners have called that delay the *age
of the tide*, or the *establishment of the port*, for centuries, and it is a fixed local number per
harbour. A theory with no basins has nothing to lag, so this is another thing the equilibrium picture
cannot give you.

## 7. Two vertical scales, said out loud

The chart draws the two traces **on different scales, marked on each side**, and says so in the
caption. This is deliberate. The gauge is measured against a local tidal datum (MLLW) and the theory
is a displacement about zero, so their absolute levels were never comparable — only the range and
the timing are. Normalising both to one scale would have been the flattering choice and would have
hidden the one number the tab exists to show.

## 8. Parsing the gauge: two traps

- Values arrive as **strings**, and a missing reading is an **empty string**, not a null. Straight
  into `Number()` that becomes `NaN` and onto the chart.
- Time tags have **no zone marker**. Appending `"Z"` and trusting `new Date` is a trap:
  `new Date("badTtime:00Z")` returns **2000-01-01**, not an Invalid Date, so a corrupt row sails past
  a `Number.isFinite(getTime())` guard and lands mid-chart looking plausible. Timestamps go through
  `parseUtcTimestamp` in `lib/utils`, which checks the shape with a regex first. `lib/aurora` had the
  same pattern and was fixed with it.

Dropped rows are **counted and shown on screen** rather than silently discarded.

## What is deliberately not done

- **No harmonic analysis.** Fitting constituents to a station record is precisely the thing this tab
  is pointing at; doing it here would defeat the demonstration.
- **No tide predictions.** See the top.
- **No currents, no storm surge, no wave setup.** The gauge measures all of them mixed in with the
  tide, which is part of why a measured range is not a pure tidal range.
- **No solid-Earth tide, no ocean loading.** Real and measurable, and far below the level this tab
  operates at.
