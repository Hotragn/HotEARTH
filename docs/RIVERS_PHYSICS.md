# Rivers: what is measured, what is a convention

The rivers tab is about a single number that almost everybody has heard and
almost nobody has been told the definition of. A **hundred year flood** is a
flood with a **one percent chance of being exceeded in any given year**. The
name says century and the definition says probability, and essentially every
argument about flood statistics lives in the gap between the two.

Everything on the tab is computed in the browser by `lib/rivers.ts` from a
committed mirror. There is no model and no API key.

## Data

United States Geological Survey, National Water Information System:

1. **Annual peak streamflow** for eight gauges, from
   `nwis.waterdata.usgs.gov/nwis/peak`. Every peak USGS holds: the date, the
   discharge in cubic feet per second, the gauge height, and the qualification
   codes.
2. **Station metadata** from `waterservices.usgs.gov/nwis/site/`: names,
   coordinates, drainage areas.

Works of the USGS are in the public domain. Neither endpoint needs a key.
Neither sends CORS headers, which is why they are mirrored at all.

Mirroring is honest here for the same reason it is for climate, carbon, ice, sea
level and ozone, and the opposite reason it is refused for earthquakes. An annual
peak is a **state**, revised when a rating curve is re-surveyed or a historic
flood re-estimated, not a list of events.

The eight, ordered by how managed the river is:

| gauge | site | peaks | record |
| --- | --- | --- | --- |
| Middle Fork Flathead | 12358500 | 85 | 1916-2023 |
| Altamaha | 02226000 | 101 | 1925-2025 |
| Potomac | 01646500 | 95 | 1931-2025 |
| Willamette | 14191000 | 136 | 1862-2025 |
| Sacramento | 11425500 | 96 | 1930-2025 |
| Colorado at Lees Ferry | 09380000 | 104 | 1884-2023 |
| Missouri at Hermann | 06934500 | 99 | 1844-2025 |
| Mississippi at St. Louis | 07010000 | 165 | 1844-2025 |

## 1. A water year starts in October, and getting that wrong is invisible

A USGS **water year** runs from 1 October to 30 September and is named for the
calendar year it **ends** in. A flood on 4 December 1861 is therefore the water
year **1862** peak.

Reading the calendar year straight out of the date string is wrong for every
autumn flood, and wrong quietly: the result is still sorted, still looks like one
peak per year, and lines every autumn flood up against the wrong year's rainfall,
the wrong dam and the wrong decade.

It is not a small effect. **Forty six of the Willamette's hundred and thirty six
peaks fall between October and December**, because its floods are winter storms,
so a third of that record would sit under the wrong year.

This was found by a guard rather than by reading the documentation. The fetch
script refuses to write a file with a repeated water year, and it fired on the
Middle Fork Flathead, which has exactly two autumn peaks in eighty five years.
The rule was then verified against all eight gauges: applying it turns 883 peaks
with duplicates on **every single gauge** into 883 with none.

When USGS does not know the month it writes `00`, and the year it filed the peak
under is kept as it stands, with a `monthKnown` flag beside it.

## 2. What the fetch script refuses to write

- A peak file missing any of `site_no`, `peak_dt`, `peak_va`, `peak_cd`,
  `gage_ht`, or whose second line is not an RDB format row.
- Fewer than 30 usable peaks at any gauge.
- A discharge outside 1 to 5,000,000 cubic feet per second.
- Water years out of order, or repeated. See above.
- A Lees Ferry record where fewer than 90 percent of the peaks after 1963 carry
  the regulation flag, or where any peak before the dam carries it. Glen Canyon
  Dam is the fixed point that keeps the qualification column honest: if that flag
  stops appearing, the script is reading the wrong field and every statement the
  tab makes about managed rivers is being made from garbage.

## 3. The qualification codes, which most analyses drop

Next to each peak USGS publishes a flag saying what kind of number it is. Read
together they say the list is **not one population**:

| code | meaning | where it bites |
| --- | --- | --- |
| 1 | a maximum **daily average**, not an instantaneous peak | 40 of 165 Mississippi peaks |
| 2 | the discharge is an estimate | scattered |
| 5 | affected to an **unknown** degree by regulation | 90 Mississippi, 89 Missouri |
| 6 | affected by regulation or diversion | 61 Colorado, 84 Willamette, **96 of 96** Sacramento |
| 7 | a **historic peak**, reconstructed rather than gauged | the 3 largest Willamette floods |
| B | the month or day is not exact | scattered |
| R | revised | scattered |

A daily average is always lower than the instantaneous peak inside that day, so
those forty Mississippi years are biased downward against the years beside them.
A reconstructed peak is an inference from high water marks, and on the Willamette
**every point at the far end of the curve, the end that sets the answer, is one**.

## 4. The arithmetic nobody believes

With an annual exceedance probability of 1/T, the chance of at least one
exceedance in `n` years is `1 - (1 - 1/T)^n`:

| window | chance of at least one 1% flood |
| --- | --- |
| this year | 1.0% |
| five years | 4.9% |
| **a thirty year mortgage** | **26.0%** |
| a lifetime, 70 years | 50.5% |
| a century | **63.4%**, not a certainty |

And two of them inside five years is `0.098%`, about **1 in 1,020** at one gauge.
There are thousands of gauges, so that happens somewhere every year and is
reported every time as evidence the statistics are broken.

Both ends of that table are the confusion: people expect a 1% flood to be nearly
impossible in thirty years, and expect it to be guaranteed in a hundred.

## 5. The distribution, and how it is checked

Log-Pearson Type III by method of moments on log10 discharge, with the
**Wilson-Hilferty** approximation to the frequency factor. That is the United
States federal standard distribution, Bulletin 17C.

The frequency factor is not checked against a published table. It is checked
against **exact** Pearson III quantiles derived from scratch in the test file.
Pearson III standardised is `(Y - a)/sqrt(a)` for `Y` drawn from a gamma of shape
`a`, with skew `2/sqrt(a)`. When `a` is an integer that gamma is an **Erlang**,
whose CDF is `exp(-y)` times a finite series, so the exact quantile falls out of a
loop and a bisection with no special functions and no table.

That gives four independent check points and measures the approximation error
directly:

| shape | skew | exact K at 1% | Wilson-Hilferty | error |
| --- | --- | --- | --- | --- |
| 1 | 2.00 | 3.60517 | 3.61025 | 0.14% |
| 4 | 1.00 | 3.02256 | 3.03032 | 0.26% |
| 16 | 0.50 | 2.68572 | 2.68840 | 0.10% |
| 100 | 0.20 | 2.47226 | 2.47274 | 0.02% |

Under a third of a percent everywhere in the tail, which is where flood estimates
live. It is worse near the median, up to about 3% at skew 2, and the tests pin
that too rather than implying the error is uniform.

The normal quantile underneath it is Acklam's rational approximation with one
Halley refinement, checked against the published z values: 1.644854, 1.959964,
2.326348, 3.090232.

### What is NOT done

This is the **textbook fit, not an agency estimate**. Bulletin 17C also weights
the station skew against a regional map, censors low outliers, and adjusts for
historical periods outside the systematic record. None of that is here, and the
published regulatory numbers will differ. What is on the page is what the
distribution says about the numbers in the file, which is the part a reader can
check.

## 6. How much of the answer is extrapolation

Every one percent flood here is fitted to between 85 and 165 annual peaks and
then asked about a flood rarer than anything in them. Resampling the record with
replacement, refitting each time, says what that costs:

| gauge | peaks | 1% flood | 90% range | ratio |
| --- | --- | --- | --- | --- |
| Middle Fork Flathead | 85 | 75,700 | 38,700 to 122,600 | **3.16** |
| Potomac | 95 | 412,900 | 302,500 to 533,300 | 1.76 |
| Altamaha | 101 | 194,400 | 146,500 to 257,100 | 1.75 |
| Willamette | 136 | 430,400 | 355,400 to 515,000 | 1.45 |
| Mississippi at St. Louis | 165 | 1,035,800 | 949,600 to 1,132,500 | **1.19** |

Record length is the whole of the difference, and no method fixes it. The band is
drawn behind the curve on the tab so it reads as the width of the answer rather
than as a separate result; on the shortest record it is wider than the gap
between a ten year and a hundred year flood.

The resampling is seeded, so the interval is identical on every load. A
confidence interval that moved when you refreshed the page would be the least
trustworthy thing on it.

## 7. The record against the curve fitted to it

The largest flood in a record sits at `n+1` years by the Weibull plotting
position, **by construction**, whatever a fitted curve later calls it:

| gauge | largest peak | the record says | the curve says |
| --- | --- | --- | --- |
| Colorado at Lees Ferry | 210,000 (1884) | 105 yr | 75 yr |
| Missouri at Hermann | 750,000 (1993) | 100 yr | 88 yr |
| Mississippi at St. Louis | 1,080,000 (1993) | 166 yr | 160 yr |
| Potomac | 484,000 (1936) | 96 yr | 208 yr |
| Willamette | 500,000 (1862) | 137 yr | 214 yr |
| Middle Fork Flathead | 140,000 (1964) | 86 yr | **627 yr** |
| Altamaha | 300,000 (1925) | 102 yr | **1,539 yr** |
| Sacramento | 102,000 (1997) | 97 yr | **off the end** |

Where the two agree, the distribution is describing the river. The Mississippi,
with the longest and least managed record, agrees to within four percent. Where
they diverge by a factor of ten the curve has been asked for something the record
cannot support, and the tab prints both numbers rather than the one that sounds
more authoritative.

The Middle Fork Flathead's 1964 flood is **1.85 times** its own fitted hundred
year flood. The largest thing that actually happened is nearly twice what the
curve calls a once-a-century event.

## 8. One gauge, two rivers

Glen Canyon Dam closed in 1963 and the Colorado at Lees Ferry has carried the
USGS regulation flag every year since. The peaks before and after are not samples
of the same river.

| fit | peaks | 1% flood |
| --- | --- | --- |
| before 1963 | 43 | 197,200 |
| from 1963 | 61 | 83,400 |
| **both together** | 104 | **230,600** |

Fitting across the join gives a hundred year flood **higher than the undammed
river ever managed**, because mixing two populations inflates the spread more
than it moves the middle. That is the counterintuitive result and the reason this
cannot be waved away as conservatism.

The Willamette splits too, at 1942, and lands the other way: 550,600 before,
302,600 after, and 430,400 combined, in between. Two regulated rivers, two
different failure modes, which is why the tab computes rather than generalises.

**The split year is not hardcoded.** It is the first water year carrying the USGS
regulation flag, so the tab is quoting the agency that keeps the gauge.

### The river with no natural half

The Sacramento at Verona is flagged as regulated in **all ninety six years** of
its record. There is nothing to compare a managed river against, and
`splitByRegulation` returns null rather than a number.

Its fitted curve is also the one that misbehaves worst. Flood control clips the
peaks, the skew of the logs goes to -1.46, and the curve starts calling ordinary
floods impossibly rare: it puts the 1997 flood, the largest of ninety six, past a
million years. The module caps the return period there and the tab says "off the
end of the curve" rather than printing it. That is what a frequency curve does
when it is fitted to an operating rule instead of a climate.

## 9. Flood peaks do not scale with basin size

A small steep catchment delivers far more water per square mile than a
continental basin, whose tributaries peak on different days and never add up.
The Middle Fork Flathead's record flood is **124 cubic feet per second per square
mile**; the Mississippi at St. Louis manages **1.5**, from a basin six hundred
times larger.

## 10. What is deliberately not done

- **No flood is predicted**, and no trend is fitted. A frequency curve assumes
  the record is a sample of one unchanging process, which is the assumption a
  changing climate puts under strain, and testing that properly needs more than
  eight gauges and a straight line.
- **No regional skew, no low-outlier censoring, no historical adjustment.** See
  section 5.
- **No rating curve modelling.** A gauge measures stage and reports discharge
  through a fitted relationship, and the largest floods are usually outside the
  range it was calibrated over. The tab keeps the estimate flags rather than
  trying to correct them.

## Acknowledgment

United States Geological Survey, National Water Information System: annual peak
streamflow, <https://nwis.waterdata.usgs.gov/usa/nwis/peak>, and the NWIS site
service, <https://waterdata.usgs.gov/nwis>. Works of the United States Geological
Survey are in the public domain.

Method: Interagency Advisory Committee on Water Data, *Guidelines for Determining
Flood Flow Frequency*, Bulletin 17B and its successor 17C, for the log-Pearson
Type III distribution and the Wilson-Hilferty frequency factor.
