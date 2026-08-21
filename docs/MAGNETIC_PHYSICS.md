# Magnetic: what is computed, what is a convention

**Honesty rule for this tab.** NOAA supplies 195 numbers per epoch and nothing else. The field at a
point, the declination, all three poles, the dipole moment, the century of pole drift and the South
Atlantic Anomaly are **synthesised in the browser** from those numbers. Nothing on the page is a
published answer copied across, which is exactly why every one of them can be checked.

Implemented in `lib/geomagnetism.ts`, validated by 45 unit tests in `lib/geomagnetism.test.ts` plus
3 cross-module checks in `lib/consistency.test.ts`.

## Data

| | |
| --- | --- |
| Model | **IGRF-14**, released November 2024 |
| Coefficients | Gauss coefficients g(n,m), h(n,m) in nT, degree and order 13 |
| Epochs | 1900.0 to 2025.0 every 5 years, plus a secular variation column in nT/year |
| Validity | 1900 to **2030**. Outside it, the functions return `null` |
| Licence | IAGA Working Group V-MOD, distributed by NOAA NCEI. Free with attribution |
| Committed mirror | **yes**, and never refreshed. See below |
| Payload | 28 KB |

### Why this mirror has no cron, when climate and carbon do

The climate and carbon tabs mirror a **state** that gets revised as observations arrive, so they are
refreshed monthly. This file is different in kind: a generation of the IGRF is a **frozen
publication**. IGRF-14's numbers will never change; IGRF-15 will be a different file with a different
name. There is nothing to poll and no staleness risk, so it is fetched once, committed, and cited.
The right cadence for a document that cannot change is none.

## 1. The synthesis, and how it is proved right

The field is the gradient of a potential expanded in Schmidt semi-normalised spherical harmonics.
Three things in that sentence are easy to get subtly and invisibly wrong:

- the **Legendre recursions**, including the derivative with respect to colatitude;
- the **geodetic to geocentric** conversion, because latitude on an ellipsoid is not the angle at the
  centre (the difference reaches about 0.19°, worth tens of nT);
- the **frame rotation** back to local north, east and down afterwards.

A wrong version of any of these still produces plausible five-figure numbers. So the test file does
not check plausibility. It checks against the **official pyIGRF14 reference implementation** (IAGA
V-MOD, MIT licence, Ciaran Beggan at BGS), run once locally at twelve places and dates spanning 1900
to 2029.9, sea level to 500 km altitude, both hemispheres and inside 4° of the north dip pole. The
agreement is to **0.05 nT and 0.001°**:

| | declination | total field |
| --- | --- | --- |
| London, 2025.0 | +0.9427° | 49,061.36 nT |
| Boston, 2026.5 | −13.9450° | 51,166.10 nT |
| Resolute, 2026.5 | −15.0531° | 57,250.38 nT |
| Sydney, 2026.5 | +12.8048° | 56,961.72 nT |

Those numbers are frozen in the test file, not regenerated, so a regression in the recursions fails
the suite rather than quietly redefining the answer.

Interpolation between epochs is linear, which is IGRF's own definition rather than a convenience.
After the last epoch the published secular variation is carried forward at a constant rate; that
reproduces the official 2030 column to floating-point, which was checked against the reference
implementation's own SHC file.

## 2. Three north poles, and the fourth thing that is not one

| | where | needs | how it moves |
| --- | --- | --- | --- |
| Geographic | 90.00° N | nothing | fixed |
| **Geomagnetic** | 80.86° N, 72.83° W | 3 coefficients, closed form | ~2° of latitude in 125 years |
| **North dip pole** | 85.40° N, 133.57° E | all 195, iterative search | 5 to 55 km a year, see below |
| South dip pole | 63.9° S, 135.1° E | all 195, iterative search | nowhere near antipodal |

(Computed for 2026.6. Positions move; the page recomputes them for whatever year is selected.)

Published anchors, from NOAA's *Wandering of the Geomagnetic Poles*: for 2025.0 the geomagnetic north
pole is at **80.79° N geocentric, 72.76° W** with the dipole axis tilted **9.21°**, and the north dip
pole is at **85.762° N, 139.298° E**. This module computes 80.79° N / 72.76° W, a tilt of 9.21°, and
a dip pole at 85.73° N / 138.6° E. The pole positions come from WMM2025 rather than IGRF-14, so the
~20 km disagreement up there is the honest measure of how far apart two current field models are,
not an error in either. The south dip pole agrees to 0.01°.

**None of the three is where your compass points.** The needle follows the local horizontal field
along a curved field line. That is the whole reason declination exists as a separate quantity.

### The dip pole's sprint, and its recent easing

The pole is found by a two-stage search: a coarse sweep of the polar cap to bracket the zero in
horizontal intensity, then a Newton iteration on (X, Y) = (0, 0) stepping in **local kilometres**
rather than in degrees. The first version skipped the sweep and started Newton at the geomagnetic
pole; it failed, because in 2025 the two poles are ~700 km apart with the geographic pole between
them, and a linearised step that has to cross the pole is not a step the linearisation describes.

Computed speed of the north dip pole, per five-year step:

```
1900s   5 km/yr     1950s  13 km/yr     2000    46 km/yr
1920s   9 km/yr     1975    6 km/yr     2005    56 km/yr
1930s  12 km/yr     1990   16 km/yr     2015    54 km/yr
1945   14 km/yr     1995   22 km/yr     2025    40 km/yr
```

Two facts worth separating. The **acceleration** is famous: a tenfold increase from the 1900s to the
2000s, and NRCan's last survey measured the pole moving north-northwest at about 55 km a year, which
matches. The **slowdown** since about 2015 is less well known and is in the same data. This page
reports both and forecasts neither.

## 3. What weakening does and does not mean

The dipole moment is computed from the first three coefficients as 4π a³ |m| / μ₀ with a = 6371.2 km,
the IGRF reference radius (**not** the WGS84 radius: substituting it shifts the moment by 0.2%, an
error that never announces itself). The result falls from **8.32 to 7.68 × 10²² A m²** between 1900
and now, a drop of 7.7%, and it falls in every single published epoch. The present value matches the
commonly quoted 7.7 × 10²².

That is genuinely fast for a core process. It is **not** a countdown. Reversals take thousands of
years, the field has had excursions of this size before without reversing, and the present rate says
nothing reliable about whether one is starting. The tab reports the decline and stops.

The South Atlantic Anomaly is found by sweeping the globe for the minimum of total intensity and then
refining. It currently sits near **26° S, 60° W at about 22,000 nT**, against 50,000 nT at
mid-latitudes: weak, not absent. In 1900 the minimum was 25,400 nT and 23° of longitude further east,
so the anomaly has both deepened and drifted west, which is why spacecraft operators care. It is not
a hole, a crack, or an opening.

## 4. The limit that matters most

**Degree 13 means the shortest wavelength in the model is roughly 3,000 km.** The crustal field, the
magnetised rock under your feet, is not in it at all. Over a basalt province the real declination can
be several degrees from this figure and no amount of arithmetic here would reveal it. IGRF describes
the field of the core, accurately, and is silent about the ground.

Two more, stated on the page rather than buried:

- **This is a quiet-day average.** The real field wobbles by tens of nT over a day as the ionosphere
  heats and cools, and by hundreds during a magnetic storm, which is the same disturbance the Aurora
  tab is watching.
- **Past 2025 the model is a straight line by construction.** That is what a secular variation
  column is. It is why a generation of IGRF expires, and why this page returns nothing for 2040
  instead of a number.

## 5. What is deliberately not done

- **No reversal forecast**, for the reason above.
- **No crustal or anomaly map**, because the model cannot supply one and a smooth field drawn at
  street resolution would imply an accuracy it does not have.
- **No compass calibration advice.** Local iron, a car, a phone case and a magnetised belt buckle
  all beat declination for size, and none of them is in any model.
- **No coastlines on the declination map.** It is a picture of the field, and outlines would invite
  reading it as a geographic chart with an accuracy claim attached.

## Acknowledgment

IGRF-14 coefficients: International Association of Geomagnetism and Aeronomy, Working Group V-MOD,
an international collaboration of geomagnetism institutes, distributed by NOAA National Centers for
Environmental Information. Validation values generated with pyIGRF14 (MIT licence, Ciaran Beggan,
British Geological Survey), the official reference implementation distributed alongside the
coefficients. Published pole positions and dipole tilt from NOAA NCEI, *Wandering of the Geomagnetic
Poles*.
