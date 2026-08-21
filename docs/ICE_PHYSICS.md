# Ice: what is measured, what is a convention

**Honesty rule for this tab.** NSIDC supplies extent and area. Every trend, error bar, rank,
percentage and gap on the page is computed here from those two columns. The one thing that is *not*
computed here is the percentile band, and that distinction is the point: a percentile of daily extent
needs the full thirty-year daily record, this tab mirrors a few years of it, so the band is NSIDC's
own numbers rather than something reconstructed from data we do not have.

Implemented in `lib/seaice.ts`, validated by 36 unit tests in `lib/seaice.test.ts`.

## Data

| | |
| --- | --- |
| Source | NSIDC **Sea Ice Index, Version 4**, National Snow and Ice Data Center, Boulder |
| Monthly | extent and area, both hemispheres, all twelve months, from 1979 |
| Daily | extent for recent years and the record-low year, both hemispheres |
| Climatology | NSIDC's **1981–2010** daily percentiles: 10th, 25th, 50th, 75th, 90th |
| Licence | US Government work, free to use with credit |
| Committed mirror | **yes**, refreshed monthly |
| Payload | 78 KB |

### Why this is mirrored, and why the cron is honest about doing nothing

NSIDC does not send CORS headers, so a browser cannot read the CSVs. Mirroring is defensible for the
same reason it is on the climate and carbon tabs and the opposite reason it is refused for
earthquakes: **a monthly mean extent is a state, revised when the record is reprocessed, not a list of
events.** A mirror a few weeks old still describes the ice correctly. A stale list of earthquakes is a
lie about right now.

The fetch script compares everything except its own build timestamp before writing. Without that, the
timestamp alone produces a diff every run, the workflow's "nothing changed" branch becomes dead code,
and the repository collects a commit a month whether or not NSIDC published anything.

### What the fetch script refuses to write

26 files are fetched and all of them validated before any of it is committed:

- **The exact first year of every month.** November and December start in **1978**; the other ten
  start in **1979**. The record begins 26 October 1978, and October 1978 has no monthly value at all,
  because six days is not a month and NSIDC will not average one. (The carbon tab applies the same
  rule to partial years.) A shifted start means the layout changed, not that history did.
- **Extent inside 1–22 million km²**, which brackets both hemispheres in every season.
- **Area never exceeding extent.** Extent counts a partly covered cell in full, so this is
  structural; if it ever fails, the columns have been swapped upstream and nothing downstream is
  safe. The test suite checks this on all 1,100-plus rows.
- **Strictly increasing years**, with gaps recorded rather than rejected, because there is a real one.
- **Percentiles ordered on every day** of the climatology, which is cheap and catches a whole class of
  silent column-misread.

## 1. The convention: two answers, a third apart

**Extent** counts a grid cell as ice if at least **15%** of it is ice. **Area** adds up the actual
fractions. Extent is therefore always the larger number:

| Arctic September | extent | area | counted as ice but is water |
| --- | --- | --- | --- |
| 1979 | 7.05 | 4.58 | 35% |
| 1996 | 7.58 | 5.62 | 26% |
| 2012 | 3.57 | 2.41 | 32% |
| 2025 | 4.75 | 3.08 | 35% |

The 15% exists because that is where the passive microwave signal becomes trustworthy, not because
15% ice is meaningfully different from 14%. **Almost every headline number ever published about sea
ice is extent.** The gap is the leads, the melt ponds and the ragged edge of the pack, and it is not a
fixed correction: it moves by nine percentage points across those four years, so it cannot be
subtracted away as a constant.

Second convention, smaller but worth naming: there is a **hole in the data over the pole**, because
the satellites' orbits do not pass over it. For extent, that hole is *assumed* ice-covered. It nearly
always is. It has also shrunk as instruments changed, so the assumption covers less area now than it
did in 1979.

## 2. The Arctic, against NSIDC's published figures

September extent, least squares with standard error, quoted against the 1981–2010 mean of
6.41 million km² as NSIDC quotes it:

| window | slope | as a percentage |
| --- | --- | --- |
| 1979–2012 | −0.87 ± 0.07 | **−13.6%/decade** |
| 1979–2024 | −0.78 ± 0.06 | **−12.1%/decade** |
| 1979–2025 | −0.76 ± 0.06 | **−11.9%/decade** |

NSIDC publishes about **12.2% per decade**. Ending the window where they ended theirs reproduces it to
0.1. Carrying on to 2025 gives 11.9. **Neither is wrong.** Ending a trend on a record low year is what
makes it look steepest, which is why every slope on this tab is printed with its window beside it.

Two more Arctic results worth having:

- **The decline is 13 times its own standard error.** That is why it is not seriously disputed.
- **Summer ice is going several times faster than winter ice**: −11.9%/decade in September against
  −2.8% in January. September is the steepest of all twelve months and every month is negative. A
  single annual figure averages that away and hides the thing that matters, which is that what is
  disappearing is the ice that used to survive the summer.

## 3. The Antarctic, which is not the Arctic

February extent, the southern minimum month:

| window | slope | significance |
| --- | --- | --- |
| 1979–2014 | **+0.13 ± 0.06** | 2.3σ, real |
| 2014–2026 | **−0.92 ± 0.36** | 2.5σ, real, and seven times steeper |
| 1979–2026 | −0.07 ± 0.05 | **1.5σ, no signal at all** |

The winter maximum tells the same story more strongly: +0.23 ± 0.06 (4.0σ) to 2014, then
−1.43 ± 0.48 (3.0σ).

**One series holding a real rise, a real fall, and a total indistinguishable from zero.** That is not a
paradox, it is what a change of regime looks like in a short record, and it is the honest reason the
same dataset was quoted for years on both sides of an argument.

A correction worth recording: the first version of the test file asserted that the early Antarctic
increase had never been significant and was only noise. Measured, it is 2.3 times its standard error,
and the winter rise is 4 times. The assumption was wrong and the measured story is better.

**The Arctic decline is 13σ. The Antarctic full-record trend is 1.5σ.** Quoting those two side by side
as comparable claims, which happens constantly, is a statement about error bars nobody printed.

## 4. What is deliberately not done

- **No sea level contribution.** Sea ice floats, and floating ice displaces its own weight, so melting
  it does not raise sea level. That comes from **land** ice, Greenland and Antarctica, plus thermal
  expansion. None of it is in this dataset and none of it is computed here.
- **No volume, and no thickness.** These instruments cannot measure it; that needs ICESat-2,
  CryoSat-2 or submarine sonar. Volume has fallen further than area has, and old thick ice being
  replaced by thin young ice is invisible in every number on this page.
- **No ice-free-Arctic date.** Extrapolating a noisy 47-year series to a threshold crossing is a
  projection, and projections belong to models with physics in them, not to a straight line.
- **No pre-satellite splice.** Ship, aircraft and coastal records exist before 1978 and are not
  comparable to this, so they are not joined onto it.
- **The 1987–88 outage is left empty.** December 1987 and January 1988 are missing in both
  hemispheres because the satellite failed. Those months are nulls, never zeros and never
  interpolated, and every trend here skips them.

## Acknowledgment

Sea Ice Index, Version 4. National Snow and Ice Data Center, Boulder, Colorado. Derived from passive
microwave products NSIDC-0051 and NSIDC-0803 (and NSIDC-0081 for the most recent days), which are US
Government works in the public domain. The product covering each stretch of years is listed on the tab
itself, because the instrument under a trend line changed more than once and a reader is entitled to
know where.
