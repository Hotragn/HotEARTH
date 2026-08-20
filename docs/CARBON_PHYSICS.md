# Carbon: what is measured, what is a convention

**Honesty rule for this tab.** NOAA supplies monthly means. Everything else, the seasonal
decomposition, the growth rates, the multiples of pre-industrial and the amplitude comparison, is
computed here, and the one surprising claim the tab makes was **measured before it was written down**.

Implemented in `lib/carbon.ts`, validated by 33 unit tests in `lib/carbon.test.ts`.

## Data

| | |
| --- | --- |
| CO₂ at Mauna Loa | monthly, from **March 1958**, NOAA GML with Scripps |
| CO₂ globally averaged | monthly, from January 1979, NOAA GML marine surface sites |
| Methane globally averaged | monthly, from July 1983, NOAA GML marine surface sites |
| Licence | US Government work, public domain |
| Committed mirror | **yes**, refreshed monthly |
| Payload | 41.3 KB, 1,904 monthly values |

Each series carries NOAA's own deseasonalised value alongside the measured one, so their seasonal
adjustment and ours can be compared rather than one being taken on trust.

### Why this one *is* mirrored, when Seismic Earth refuses to be

NOAA GML does not send CORS headers, so a browser cannot read the CSVs directly. That forced the
question, and mirroring is honest here for the exact inverse of the earthquake tab's reason: **a
monthly mean is a state, not a list of events.** It is revised as flask samples are reconciled with
the in-situ analyser, it moves by hundredths of a ppm, and a mirror five weeks old is still a correct
description of the atmosphere. A stale list of earthquakes is a lie about what is happening right now.

### What the fetch script refuses to write

`scripts/carbon/fetch_carbon.py` validates before it writes anything, so a changed CSV format fails
the job loudly instead of committing nonsense:

- the **exact first month** of each record. Keeling's first reading is March 1958 and that is a fixed
  historical fact; a shifted start means the file layout changed, not that history did.
- no more than **twelve months behind** today.
- values inside sane physical ranges (CO₂ 250–600 ppm, CH₄ 1500–2200 ppb).
- strictly increasing months with **no duplicates**.
- NOAA's `-9.99` missing-value sentinels **dropped**, never averaged. A month that cannot be used is
  removed without shifting the dates of the months after it.

## 1. The claim that turned out to be wrong

The textbook telling of the Keeling curve says the sawtooth is northern vegetation, and that averaging
both hemispheres largely cancels it because the southern hemisphere breathes in antiphase. The first
version of `lib/carbon.test.ts` encoded that as `ratio > 1.5`, with the module header saying the two
"largely cancel".

Then it was measured:

| | peak-to-trough | peaks in |
| --- | --- | --- |
| Mauna Loa, 19.5° N | **6.45 ppm** | May |
| Globally averaged, marine surface | **4.40 ppm** | April |
| ratio | **1.47** | one month earlier |

Only a third smaller. The hemispheres are not symmetric: most of the world's land, and so most of its
vegetation, lies north of the equator, so the southern cycle **trims** the northern signal rather than
opposing it evenly, and shifts its phase. What that leaves is worth sitting with, and is now the
headline of the tab: **the northern spring is visible in the average CO₂ of the entire planet.**

The module header, the honesty copy and the tests were rewritten to the measured result, including a
test pinning the one-month phase lead, which nothing in the original story predicted.

## 2. The seasonal decomposition

Detrend with a 12-month centred moving average, then take the mean departure for each calendar month:

- an **even** window is centred properly, with half weight on the two endpoints. A plain 12-point
  average is offset by half a month, which is enough to move the reported peak month.
- the smoothed line is `null` for the first and last six months rather than padded. Half a window is
  not a year, and padding puts a spurious wiggle exactly where a reader looks first: the present day.
- the cycle is computed **from 1990 onwards** by default, because the amplitude at Mauna Loa has
  itself been growing (6.31 ppm averaged from the 1960s, 6.70 from the 2010s), so averaging the whole
  record understates the cycle as it is today.

Two properties are asserted in tests rather than assumed: a 12-month average removes a pure annual
sine **exactly**, and preserves a linear slope to six decimal places. The monthly departures sum to
approximately zero, which is what "departure" has to mean.

The measured cycle at Mauna Loa, 1990 onwards, in ppm:

```
Jan +0.21  Feb +0.87  Mar +1.53  Apr +2.71  May +3.14  Jun +2.36
Jul +0.49  Aug -1.76  Sep -3.39  Oct -3.34  Nov -2.04  Dec -0.78
```

May is the peak, just before northern leaf-out gets going; September the trough, at the end of the
growing season. That is the biosphere, in twelve numbers.

## 3. Growth, and the methane stall

Mean growth per decade is the mean year-over-year difference of the **annual** means. An annual mean
requires all twelve months present, or it is `null`: averaging a partial year puts it on the seasonal
cycle rather than on the trend. A decade needs at least five complete increments to appear at all, so
the current decade is shown only once it has earned it.

CO₂ at Mauna Loa, ppm per year: 1960s **0.86**, 1970s 1.22, 1980s 1.64, 1990s 1.53, 2000s 1.91,
2010s **2.40**, 2020s **2.62**.

Methane, ppb per year: 1990s **6.8**, 2000s **2.1**, 2010s 7.3, 2020s **11.6**. That stall through
the 2000s is real, plainly visible in the curve, and still not fully explained. It is left in view
rather than smoothed into a story.

## 4. Pre-industrial, from a different instrument

CO₂ 280 ppm and CH₄ 722 ppb are the IPCC 1750 reference values, and they come from **ice cores**, not
thermometers or analysers: air trapped in Antarctic and Greenland ice, sealed off from the atmosphere
centuries ago and measured in a laboratory. Naming that matters. It is a different method on a
different continent, and the modern record only overlaps it by construction, which is a large part of
why the comparison is trusted at all.

Current: CO₂ **1.53×** pre-industrial, CH₄ **2.68×**.

## 5. "Methane is 80 times worse than CO₂" is a choice of horizon

Methane absorbs strongly but mostly breaks down within about twelve years, so any single multiplier
has already assumed a time window, usually without saying so. IPCC AR6 Table 7.15, fossil methane:

| horizon | GWP |
| --- | --- |
| 20 years | **79.7** |
| 100 years | **27.9** |
| 500 years | **7.95** |

All three are shown. `methaneGwp` returns `null` for any other horizon rather than interpolating a
number that no assessment report contains, which is the same refusal the tides tab makes about
harmonic constituents it does not have.

## 6. What is deliberately not done

- **No forecast.** No line is drawn past the last measured month. Where the curve goes is a question
  about economies and policy, not about spectroscopy, and this project does not answer it.
- **No attribution.** A concentration series says what is in the air, not what put it there. That
  needs isotopic ratios and emissions inventories.
- **No temperature consequence.** That lives one tab over in Climate, where it is measured rather
  than derived from these numbers.
- **No ice-core series plotted.** The two records are cited against each other as scalars; splicing a
  centennially-smoothed ice-core record onto monthly analyser data on one axis would look like one
  measurement and be two.

## Acknowledgment

NOAA Global Monitoring Laboratory, Earth System Research Laboratories, Boulder, Colorado. A US
Government work in the public domain. The Mauna Loa CO₂ record is a joint effort with the Scripps
Institution of Oceanography, begun by Charles David Keeling in 1958 and continued after his death in
2005; it is the longest continuous instrumental record of any atmospheric constituent.
