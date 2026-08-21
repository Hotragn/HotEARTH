# Sea level: what is measured, what is a convention

**Honesty rule for this tab.** Two sources supply raw series. Every trend, error bar, acceleration,
per-decade block and land residual is computed in the browser from them. Where our arithmetic
disagrees with the publisher's, both numbers are shown and the disagreement is described rather than
tuned away.

Implemented in `lib/sealevel.ts`, validated by 29 unit tests in `lib/sealevel.test.ts`.

## Data

| | |
| --- | --- |
| Altimetry | NOAA Laboratory for Satellite Altimetry, global mean sea level, 1992 to present |
| Variants | **four**, published by NOAA: seasonal cycle removed or retained × two spatial domains |
| Satellites | TOPEX/Poseidon, Jason-1, Jason-2, Jason-3, Sentinel-6MF |
| Gauges | PSMSL Revised Local Reference annual means, 10 curated stations, Brest from **1807** |
| Licence | NOAA LSA (credit required), PSMSL (free with credit). Both public |
| Committed mirror | **yes**, refreshed monthly, and normally a no-op |
| Payload | 86 KB |

The altimetry series currently ends about a year behind the present. That is the source's own
publication cadence, not a staleness bug, and the tab shows the last sample date.

## 1. Two instruments, two questions

A **satellite altimeter** measures the height of the sea surface against the centre of the Earth.
A **tide gauge** measures the height of the sea against the land it is bolted to. When that land is
rising or sinking, the two disagree about the same ocean in the same year, and both are right.

Trends over the altimeter era, computed here:

| | mm/yr | what is happening |
| --- | --- | --- |
| **Skagway, Alaska** | **−21** | land rising ~2 cm/yr as Little Ice Age glaciers unload it |
| Stockholm | −1 | post-glacial rebound |
| Oslo | −1 | post-glacial rebound |
| San Francisco | +2 | close to the global figure |
| Honolulu | +3 | mid-ocean, the nearest a single gauge gets to "global" |
| **Global mean (satellite)** | **+3.2** | the whole planet, against Earth's centre |
| New York | +4 | mid-Atlantic coast subsiding |
| Galveston | +8 | a century of oil, gas and groundwater extraction |
| **Manila** | **+13** | groundwater pumped out from under the city |

A spread of over 30 mm a year. Anyone asking whether their street will flood wants the gauge, not the
satellite, and the global mean is the least useful number on this page for that question.

The **land residual** the tab reports is the gauge rate minus the global altimeter rate over the same
years, sign-flipped to read as ground motion. It is labelled an estimate of a residual and not a
measurement: it lumps vertical land motion together with regional ocean differences. Measuring the
land itself takes GPS at the gauge.

PSMSL values are millimetres above an **arbitrary local datum**, offset by about 7,000 mm to stay
positive. The absolute number is meaningless; only the slope means anything. That is why the gauge
exhibit is a chart of *rates* and never of heights on a shared axis.

## 2. Even the global number is a set of choices

NOAA publishes the same satellite passes four ways, and the choices move the trend:

| variant | NOAA's trend | ours |
| --- | --- | --- |
| seasonal removed, 66°S–66°N | 3.17 | 3.23 |
| seasonal retained, 66°S–66°N | 3.17 | 3.24 |
| seasonal removed, reference-mission coverage | 3.11 | 3.18 |
| seasonal retained, reference-mission coverage | 3.11 | 3.18 |

**The domain choice alone moves it 2%.** None of the four is the true one.

On top of that, the figure usually quoted in public carries a **glacial isostatic adjustment** of
about **+0.3 mm/yr**, because the ocean floor is still sinking as the mantle relaxes from the last ice
age, which makes the basin bigger. NOAA's published trend here does *not* include it and says so in
the file. So 3.2 and 3.5 are both defensible: one answers *how high is the surface*, the other *how
much water is in the basin*.

### A disagreement we could not resolve

Our plain least squares on NOAA's own file gives **3.23 mm/yr** where their header says **3.17** — a
2% gap. Three candidate explanations were tested and rejected:

- **the seasonal treatment.** Adding annual and semiannual harmonics to the seasonal-*retained*
  product reproduces the seasonal-*removed* slope to 0.001 mm/yr. That is a real cross-check of
  NOAA's deseasonalisation using our own arithmetic, and it passes.
- **the start date.** Starting at 1993.0 instead of 1992.96 changes the answer by 0.0007 mm/yr.
- **which satellite is preferred during an overlap.** Preferring the newer, the older, or the mean
  changes the answer by under 0.001 mm/yr.

Whatever remains is a fitting-method difference not recoverable from the file. Both numbers are on the
page. Tuning ours until it matched would have destroyed the only interesting thing here, which is that
two careful analyses of one file differ by 2%.

## 3. Acceleration: why one rate is the wrong shape

A quadratic fit gives **+0.081 mm/yr per year**, against a published figure of about 0.084 ± 0.025
(Nerem et al. 2018; IPCC AR6 chapter 9 carries the same). That curvature means:

- the rate at the start of the record was about **1.9 mm/yr**;
- the rate now is about **4.5 mm/yr**;
- the famous **3.2 mm/yr** is the average of something that has roughly doubled, and describes
  neither end.

The same result, with no curve assumed at all, as three straight lines over three decades:

```
1993–2002   ~2 mm/yr
2003–2012   ~3 mm/yr
2013–2025   ~4 mm/yr
```

**One trend per satellite would have been a neater exhibit and is not available.** Three of the five
have flown for under ten years, and this module refuses windows shorter than that. Sentinel-6 has four
years of data; there is no sea level trend in four years, however much one would like a number per
instrument. The staircase is decades instead, which also attributes the acceleration to the right
thing: the ocean, not the instruments.

## 4. The seams in a "continuous" record

The record is **five satellites**. Each new altimeter flies in formation with the old one before the
old one retires, and that overlap is how the splice is calibrated. Measured here:

| handover | flew together | mean disagreement | worst |
| --- | --- | --- | --- |
| TOPEX/Poseidon → Jason-1 | 2002.2–2005.7, 3.5 years | 1.93 mm | 5.67 mm |
| Jason-1 → Jason-2 | 2008.6–2009.1 | 0.54 mm | 1.34 mm |
| Jason-2 → Jason-3 | 2016.1–2016.7 | 1.63 mm | 2.97 mm |
| Jason-3 → Sentinel-6MF | 2021.0–2022.3 | 1.20 mm | 2.97 mm |

Two instruments measuring the same global ocean at the same moment differ by one to two millimetres.
The signal being measured is about three millimetres **a year**. That is the honest size of a seam, and
it is why altimeter trend uncertainties are quoted at a few tenths of a mm/yr rather than the
hundredths our own standard error suggests.

Coverage, measured in time rather than in samples: exactly **one** real gap in 33 years, 72 days of
Jason-1. An earlier version of the parser reported hundreds of "gaps" per mission, which was an
artefact of counting index steps — during an overlap the two satellites' ten-day cycles are out of
phase, so their samples interleave and each one's indices step by two. Interleaving is not missing
data.

## 5. What is deliberately not done

- **No projection.** Extending this to 2100 needs ice sheet dynamics, ocean heat uptake and an
  emissions pathway, none of which is in these two files. A parabola carried forward is arithmetic
  pretending to be a model. The per-century figures on the page are explicitly labelled as the current
  rate multiplied out, which is not a forecast because the rate is changing.
- **No flood risk.** Mean sea level sets the baseline that a high tide plus a surge plus waves start
  from, and that matters enormously, but it is not a flood forecast and the tab does not offer one.
- **No GIA applied**, only named.
- **No attribution split.** How much of the rise is thermal expansion versus Greenland versus
  Antarctica versus groundwater is a real and answerable question, and it needs GRACE gravimetry and
  Argo floats, not these two series.
- **No gauge heights on a shared axis**, for the datum reason above.

## Acknowledgment

Altimetry data are provided by NOAA Laboratory for Satellite Altimetry. Tide gauge records from the
Permanent Service for Mean Sea Level (PSMSL), Revised Local Reference annual means. The ten stations
are a curated set, and each one's reason for being in it is printed next to it on the tab, because a
curated list without its reasons is just a list somebody picked.
