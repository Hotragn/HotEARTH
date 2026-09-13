# Ozone: what is measured, what is a convention

The ozone tab is the only one on this site about a global environmental problem
the world agreed to fix. That makes it the easiest tab to get wrong, because the
honest answer is not a clean success story and it is not a debunking either. The
chemicals are unambiguously falling. The hole they cause has not yet shown it in
the two numbers that get reported every October. Both statements are
measurements, and the tab puts them next to each other.

Everything on the tab is computed in the browser by `lib/ozone.ts` from a
committed mirror. There is no model and no API key.

## Data

Three sources, all free to use with credit, none of which sends CORS headers,
which is why they are mirrored at all.

1. **NASA Ozone Watch**, Goddard Space Flight Center: `annual_data.txt`. One row
   a year from 1979 carrying the mean Antarctic ozone hole area over 7 September
   to 13 October, and the minimum total column over 21 September to 16 October.
2. **NOAA Global Monitoring Laboratory, Ozone Depleting Gas Index** (Montzka,
   Dutton and Vimont): tables 1 and 2. Yearly global mean surface abundances of
   ten ozone depleting gases in parts per trillion, the equivalent effective
   stratospheric chlorine derived from them, and the index itself, separately for
   the Antarctic and mid-latitude stratosphere.
3. **NOAA Global Monitoring Laboratory Dobson network**: individual total column
   observations from five stations, averaged by the fetch script to monthly means
   with the observation count kept alongside. South Pole (89.9 S, from 1963),
   Lauder (45.0 S, from 1987), Mauna Loa (19.5 N, from 1963), Boulder (40.0 N,
   from 1966) and Utqiagvik (71.3 N, from 1973).

Mirroring is honest here for the same reason it is for climate, carbon, ice and
sea level, and the opposite reason it is refused for earthquakes. An annual hole
area, a yearly mean mixing ratio and a monthly mean column are all **states**,
revised when a record is reprocessed. A mirror a few weeks old still describes
the ozone layer correctly. A stale list of earthquakes is a lie about what is
happening now.

### What the fetch script refuses to write

- A NASA record that does not start in 1979, whose years are not strictly
  increasing, or that is missing more than two years.
- A hole area outside 0 to 35 million km², or a column outside 70 to 700 DU.
- An ODGI table with fewer than fifteen columns, fewer than twenty rows, or a
  broken run of years.
- An ODGI table whose index is no longer an affine function of its own EESC
  column about a single benchmark. See below.
- A Dobson file whose header latitude and longitude have moved more than half a
  degree from the station this script thinks it is reading, or which rejects
  more than five percent of its rows.
- A South Pole file in which fewer than 95 percent of the moon observations fall
  between April and September.

### 1995 is missing, and should be

Nimbus-7 TOMS failed in May 1993, Meteor-3 TOMS ended that December, and the next
mapping instrument did not fly until August 1996. Nobody measured the 1995 hole.
The gap is in the instrument, not in the ozone.

It is carried through as an explicit missing year rather than closed up, and the
chart draws a break rather than a line, because a series indexed by position
instead of by year shifts everything after 1994 by one and nothing complains.

### The polar night guard is a fraction, not a rule

A Dobson spectrophotometer compares two ultraviolet wavelengths in a beam of
sunlight. At the South Pole the sun is down for half the year, so the observers
point it at the moon. The kind of observation is the last column of the file, and
the guard checks that the moon observations land in the polar night.

It is a fraction rather than an absolute rule because the record contains exactly
one February moon observation. A guard that fires on one genuine row is a guard
that gets deleted, which is the same lesson the rotation tab learned when its
splice check fired on a filler zero in January 1973.

## 1. The index is its own definition

NOAA defines the ODGI as 100 at the peak halogen abundance and 0 at the 1980
abundance, which makes it an affine function of the EESC column published beside
it:

```
ODGI(y) = 100 · (EESC(y) − EESC_1980) / (EESC_peak − EESC_1980)
```

`EESC_1980` is not in the file. The fetch script **solves** for it from every row
that has an index other than 100, takes the median, and then requires that the
round trip reproduces NOAA's own index column.

Over the Antarctic the solved benchmark is 2151 ppt against a peak of 4151 ppt in
2001, and the rebuilt index agrees with the published one to 0.05 index points
across all 33 years. At mid-latitudes the benchmark is 1160.7 ppt against a peak
of 1935 ppt in 1997, agreeing to 0.09.

A hardcoded benchmark would go silently wrong the day NOAA revised the scale.
This fails the job instead, and the tab can show the rebuild rather than asking
anyone to take the index on faith.

The mid-latitude stratosphere peaked in 1997 and the Antarctic in 2001, because
Antarctic air is older: it takes about four extra years for the same surface
abundance to show up there.

## 2. The gap between cause and effect

The measured halogen loading over Antarctica is 28 percent of the way back from
its peak to the 1980 level. Mid-latitudes are 55 percent of the way.

The hole is another matter. Fitting the annual hole area against year, with the
slope's standard error:

| window | slope, million km² per year | standard errors from zero |
| --- | --- | --- |
| 1979 onward | +0.29 ± 0.06 | 4.6, and growing |
| 1990 onward | −0.06 ± 0.06 | 1.0 |
| 2000 onward | −0.11 ± 0.11 | 1.0 |
| 2010 onward | −0.03 ± 0.22 | 0.1 |

The first window contains the onset, which is why it says the hole is growing.
Every modern window is under two standard errors. Over 2000 to 2025 the fitted
line moves the area by 2.7 million km² while the points scatter 4.1 million km²
about it: the signal is two thirds of the noise.

The correlation between EESC and hole area over the 32 years both series exist is
**+0.15**, which is both negligible and the wrong sign. Dropping the two sudden
stratospheric warming years does not rescue it.

**This is not an argument against the Montreal Protocol.** The chemistry is not
in doubt and the chemicals are unambiguously falling. It says that the hole area,
over this window, is dominated by how cold and how stable the polar vortex was,
and that published detections of healing use metrics chosen to get around exactly
that. A page that showed the falling chemicals and left this number out would be
making a claim it had not checked.

The two smallest modern holes, 2002 at 12.0 and 2019 at 9.3 million km², are both
years the vortex fell apart early. The chemicals above Antarctica in 2019 were
within two percent of 2018 and 2020, both of which had holes more than twice the
size.

## 3. The hole is a season, not a place

The clearest physics on the tab comes from five huts, and needs no satellite. For
each station, the mean monthly column before the hole existed against the mean
over 2010 onward:

| station | latitude | worst month | change |
| --- | --- | --- | --- |
| South Pole | 89.9 S | October | −46.8% |
| Mauna Loa | 19.5 N | July | −2.1% |
| Boulder | 40.0 N | March | −5.8% |
| Utqiagvik | 71.3 N | March | −2.9% |

Two things fall out of that table.

**The loss is concentrated in spring.** At the South Pole, October, November and
December are down 47, 35 and 20 percent, and no other observed month is
beyond 12. Chlorine sits inert through the polar winter as HCl and
chlorine nitrate, is converted to reactive forms on the surfaces of polar
stratospheric clouds that only grow in extreme cold, and is then set loose by the
returning sun over a few weeks.

**There is no Arctic hole, and latitude is not the reason.** Utqiagvik at 71 N
spends months without sun under the same global burden of chlorine and lost three
percent. The Antarctic vortex is colder, more circular and better sealed, because
the Southern Hemisphere has almost no mountains or land-sea contrast at those
latitudes to launch the planetary waves that stir a vortex up. Cold enough for
long enough is what grows the clouds, and only the south reliably gets there.

Utqiagvik also has the thickest spring column of any station here, around 430 DU,
because the circulation piles ozone up at high northern latitudes. The place with
the most ozone and the place with the least are both polar.

Lauder has no row, because it started observing in 1987 and has no before.

### Why the South Pole has no March and no September

Not because nobody was there. The file carries the airmass with every reading:
the length of the light path relative to straight up. At the South Pole equinox
the sun sits on the horizon and the median March airmass is 7.5, against 5.1 in
October. Those months are at the edge of what the instrument can do, and the
handful of September readings that exist are all by moonlight.

## 4. Ten gases, ten schedules

The same treaty, the same years, and a range from gone to not yet started.

| gas | peak | from peak | published lifetime | measured decay |
| --- | --- | --- | --- | --- |
| CH3CCl3 | 1992 | −99% | 5.0 yr | 6 yr |
| CCl4 | 1992 | −32% | 32 yr | 81 yr |
| CH3Br | 1999 | −30% | 0.8 yr | not fitted, natural floor |
| CFC-11 | 1994 | −20% | 52 yr | 138 yr |
| halons | 2006 | −19% | aggregate | 78 yr |
| CFC-12 | 2002 | −11% | 102 yr | 182 yr |
| CH3Cl | 1999 | −3% | 0.9 yr | not fitted, natural floor |
| HCFCs | 2022 | −1% | aggregate | not fitted, too recent |

There are three distinct reasons a gas has no measured decay, and the tab keeps
them apart. HCFCs peaked in 2022 and cannot be fitted yet. Methyl chloride and
methyl bromide are refused a number on purpose: they fall toward a large natural
floor rather than toward zero, so an exponential fitted to them returns something
that looks like a lifetime and is not one. Methyl bromide's fit comes out at 77
years next to a published lifetime of 0.8. Neither number is wrong; putting them
in adjacent columns would be.

Published lifetimes are from the WMO Scientific Assessment of Ozone Depletion
2022, Table A-1, and are carried as constants because a lifetime cannot be
measured from an abundance series. **The observed decline equals the lifetime
only once emissions have stopped.** Methyl chloroform, genuinely gone, is the one
that matches. The CFCs are leaving two to three times slower than their chemistry
alone would take them, and that gap is the bank: old foam, old refrigerators, old
air conditioners, still venting.

Two of the ten are largely natural. Methyl chloride comes from the ocean and from
burning vegetation, and methyl bromide has big oceanic and biomass sources under
the fumigant use that was phased out. Their burdens can never reach zero, so a
distance from peak understates the phase-out and an apparent decay time means
nothing. They are counted anyway, because a bromine atom destroys ozone without
regard to where it came from.

The halons peaked in 2006, twelve years after CFC-11, and rose while everything
else fell: they went into fire suppression systems that were not scrapped when
production stopped. The HCFCs, which is what the CFCs were swapped for, peaked
only in 2022.

### A treaty violation, in three averages

| window | CFC-11 change |
| --- | --- |
| 2002 to 2012 | −6.00 ppt/yr |
| 2013 to 2018 | −3.83 ppt/yr |
| 2019 onward | −6.33 ppt/yr |

The decline slowed by a third and then went back to its old rate. That slowdown
is how the world found out that production had restarted somewhere in breach of
the treaty (Montzka et al., *Nature*, 2018; much of it located in eastern China
by Park et al., *Nature*, 2021), and the recovery afterwards is what enforcement
looks like in global background air. It is visible on the tab as three averages
of NOAA's own published column, which is roughly how it was found.

## 5. The Dobson Unit is a thickness

One DU is a hundredth of a millimetre of pure ozone at 0 °C and one atmosphere,
equivalently 2.69 × 10^16 molecules per square centimetre. A typical 300 DU
column is three millimetres of gas. The worst measured Antarctic minimum, 92.3 DU
in 1994, is nine tenths of one millimetre.

## 6. Two conventions, stated rather than buried

**The 220 DU threshold.** The hole is defined as the area inside the 220 DU
contour. NASA chose it because column values below 220 had not been seen before
1979 and because an aircraft campaign showed that getting below 220 requires
catalysed chlorine and bromine loss. It is a choice: the pre-hole South Pole
October mean was 281 DU with a standard deviation of 33, so 220 sits under two
standard deviations below what the atmosphere used to do on a bad year. A
different line gives a different area and the same ozone.

**The two averaging windows.** The area is a mean over 7 September to 13 October
and the minimum is over 21 September to 16 October. Both are on the tab, because
a number averaged over a window is not the same as a number for a year.

## 7. What is deliberately not done

- **No recovery date is predicted.** The tab will extend the recent slope of the
  index to the axis and labels the result as arithmetic: a straight line through
  the last decade lands around 2080 for the Antarctic, where WMO's 2022
  assessment, which runs the individual lifetimes forward, gives about 2066. The
  distance between the two is the honest measure of what a straight line is worth
  when the decay bends.
- **No claim that the hole is healing**, and no claim that it is not. What is
  claimed is a slope, a standard error, and a correlation.
- **No modelling of the chemistry.** The Chapman cycle and the catalytic chlorine
  cycle are named in the copy and computed nowhere; every number is a measurement
  or arithmetic on one.
- **No mixing of the two ozones.** The air tab scores surface ozone as a
  pollutant with a health limit. It is the same molecule, roughly a tenth of the
  column sits in the troposphere, and the two tabs measure the same three
  millimetres from opposite ends.

## Acknowledgment

Antarctic ozone hole area and minimum column: NASA Ozone Watch, Goddard Space
Flight Center, <https://ozonewatch.gsfc.nasa.gov/>.

Ozone Depleting Gas Index: NOAA Global Monitoring Laboratory, Boulder, Colorado
(S. A. Montzka, G. Dutton, I. Vimont), <https://gml.noaa.gov/odgi/>.

Total column ozone: NOAA Global Monitoring Laboratory Dobson network,
<https://gml.noaa.gov/aftp/data/ozwv/Dobson/>.

Lifetimes: World Meteorological Organization, *Scientific Assessment of Ozone
Depletion: 2022*, Table A-1.

All three data sources are US Government works, free to use with credit, and
none requires a key.
