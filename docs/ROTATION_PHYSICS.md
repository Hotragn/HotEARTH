# Rotation: what is measured, what is a convention

**Honesty rule for this tab.** The IERS supplies daily length-of-day and UT1−UTC, plus the leap
second table. Every drift, mean, cycle, residual and estimate on the page is computed in the browser
from those. The headline claim is not asserted anywhere: it is an arithmetic identity the page
carries out in front of you.

Implemented in `lib/rotation.ts`, validated by 25 unit tests in `lib/rotation.test.ts`.

## Data

| | |
| --- | --- |
| Definitive | IERS **EOP 14 C04**, daily, from 1962. Lags by several months |
| Weekly | IERS **finals2000A**, current to a few days ago, with predictions ~1 year ahead |
| Leap seconds | IERS **Bulletin C** table (`Leap_Second.dat`) |
| Licence | IERS, Paris Observatory. Free with attribution |
| Committed mirror | **yes**, refreshed weekly, and a no-op when nothing changed |
| Payload | 82 KB |

The two EOP products publish the **same quantity in different units**: C04 gives length of day in
seconds, finals2000A in milliseconds. The overlap check below is what proves the conversion, rather
than a comment asserting it.

### What the fetch script refuses to write

- **Length of day outside −6 to +12 ms.** This is the check that catches a units error: a factor of
  1000 wrong and every value lands outside it immediately.
- **UT1−UTC outside ±1.5 s**, when the leap second system exists to hold it inside ±0.9.
- **A record not starting in 1962.**
- **A leap second step that is not exactly +1 s.** Every step in history has been a single positive
  second. The first negative or non-unit one is the single most important thing this tab could be
  asked to report, so the script stops rather than passing over it quietly.

### Splicing two products: a guard on the distribution, not the worst day

The first version of the overlap check refused to splice if **any** day disagreed by more than
0.35 ms. It failed instantly on 1973-01-02 at 2.71 ms — which turns out to be a filler zero in the
weekly series rather than a measurement.

Measured properly over 19,362 shared days, the two products agree to a **median of 0.015 ms** and a
**99th percentile of 0.19 ms**. Twenty-one days exceed 0.35 ms and every one is between 1973 and 1989,
when the measurements were far less precise. So the guard now tests median, p99, and the fraction of
loud days. A max-only check fails on one bad day in 1973 and tells you nothing about whether the two
products are the same quantity today.

Where both exist, the definitive values win.

## 1. The identity: leap seconds are the integral of the length of day

The SI second was pinned, by way of the ephemeris second from Newcomb's tables, to the mean solar day
of roughly **1820**. The Earth has been slowing since, so the real day has run long for most of the
atomic era, and a millisecond a day is a third of a second a year. At 0.9 s, a leap second is
inserted.

That is not a story this page tells. It is arithmetic it does:

| | |
| --- | --- |
| Integral of measured excess length of day, 1972–2025 | **26.875 s** |
| Leap seconds actually inserted over those years | **27** |
| Residual | **−0.125 s** |
| UT1−UTC standing today | **−0.116 s** |

Two IERS products, computed independently, landing on each other to a tenth of a second over
fifty-four years — and the leftover *is* the offset still on the books. This single test exercises the
measurement, the units, the sign convention and the arithmetic at once, which is why it is the
load-bearing test in the suite.

**28 rows, 27 leap seconds.** The first row of the IERS table is the initial 10-second offset set on
1 January 1972, which was not a leap second. Counting rows is the obvious way to get this wrong, and
10 + 27 = 37 is the check.

### The sign convention, checked rather than reasoned

Getting this backwards would invert the headline, so it was measured from the record: on days with an
excess above +0.2 ms, UT1−UTC moves **down** by 0.55 ms; on days below −0.2 ms it moves **up** by
0.57 ms. So a long day (slow Earth) drives UT1−UTC toward −0.9 and a **positive** leap second; a short
day (fast Earth) drives it toward +0.9 and a **negative** one.

## 2. The 2020s speed-up, and its reversal

From 2020 to 2024 the annual mean excess went negative — the Earth turning faster than the definition
of the second says it should — and the **shortest day ever measured was 5 July 2024 at −1.63 ms**. That
produced a wave of coverage about the first ever negative leap second.

**It has since partly unwound**, and that is the most current thing this page can say:

| | mean excess |
| --- | --- |
| the twelve measured months before | **−0.09 ms** |
| the last twelve measured months | **+0.24 ms** |

Every month of 2026 so far is positive, and UT1−UTC peaked in October 2025 and has been falling since.
A page written during the 2024 coverage would still be saying the Earth is speeding up. This one
recomputes from the record on every load, which is the only way a page about a wandering quantity
avoids going quietly stale.

The prospect of a negative leap second receding is an argument **for** the 2022 decision to abolish
the leap second by 2035, not against it: nobody wants a timekeeping rule whose next step depends on
guessing what the core is doing.

## 3. The year in the length of the day

The day is about a millisecond longer in **April** than in **July**, every year, with a swing of
1.1 ms. That is the atmosphere: winds move angular momentum between the air and the solid Earth, and
the total cannot change, so when the jet streams speed up the planet underneath them slows down.

It is the same shape of argument as the sawtooth on the Keeling curve — a seasonal signal in a global
measurement, caused by the hemispheres not being alike — and the swing is **larger than the spread in
annual means across the whole satellite era**, which is why a single month's figure says very little.

## 4. Two published rates for the long slowing, and why they differ

| | |
| --- | --- |
| Tidal braking, from lunar laser ranging | **2.3 ms/century** |
| Observed slowing, from ancient eclipse records | **1.8 ms/century** |

Both are published and both are right. The difference is the Earth still rebounding from the last ice
age: a less oblate planet spins faster, offsetting part of the Moon's braking. That is the **same
glacial isostatic adjustment** the sea level tab has to name for a different reason, and the tests
keep the two numbers apart rather than averaging them, because splitting the difference would destroy
the only interesting thing about the pair.

Both are also tiny next to the decadal wandering: a century of tidal braking is about 2 ms, and the
record swings that much in a few years. No long-term trend can be read off sixty years of this.

## 5. What is deliberately not done

- **No forecast.** The "at this rate" figures are labelled arithmetic. Multiplying today's excess out
  to a threshold assumes a rate that has never held for long — the record has changed sign twice in
  sixty years. The IERS itself announces leap seconds only six months ahead, for exactly this reason.
- **No negative-leap projection while the Earth is slow.** Asking when a negative leap second is due
  while the excess is positive is a malformed question, and the function returns `null` rather than a
  number.
- **No annual mean from a partial year**, and no monthly mean from a month with under 20 measured
  days.
- **Predictions are never averaged into a statement about what the Earth did.** The trailing means
  use measured days only, and predicted days are drawn differently.
- **No explanation of the decadal wandering.** It is core, ocean and atmosphere exchanging angular
  momentum with the crust, and which dominates when is not settled. The page shows the wandering and
  stops.

## Acknowledgment

Earth orientation data from the International Earth Rotation and Reference Systems Service (IERS),
Paris Observatory: EOP 14 C04 and finals2000A. Leap second table from IERS Bulletin C. Freely
available with attribution.
