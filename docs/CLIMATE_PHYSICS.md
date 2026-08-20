# Climate: what is measured, what is a convention

**Honesty rule for this tab.** The sources supply annual anomalies. Everything else — rebasing,
trends, error bars, the comparison between the two analyses — is computed here, and the one claim the
tab makes is **proved rather than asserted**.

Implemented in `lib/climate.ts`, validated by 31 unit tests in `lib/climate.test.ts`.

## Data

| | |
| --- | --- |
| NASA GISTEMP v4 | 1880 onwards, baseline **1951–1980**, US Government work, public domain |
| Met Office HadCRUT5 | 1850 onwards, baseline **1850–1900**, Open Government Licence v3, with published uncertainty |
| Committed mirror | **yes**, refreshed monthly |
| Payload | 8.8 KB |

### Why this one *is* mirrored, when Seismic Earth refuses to be

Neither source sends CORS headers, so a browser cannot read them directly. That forced the question,
and mirroring is honest here for a reason that is the exact inverse of the earthquake tab's: **an
annual global mean is a state, not a list of events.** It is revised monthly, moves by hundredths of
a degree, and a mirror a few weeks old is still a correct description of the climate. A stale list of
earthquakes is a lie about what is happening right now.

### A real error the validation caught

The first version of the fetch script asserted HadCRUT5 was on the 1961–1990 normal. It is not: this
formatted product is published against **1850–1900**, the IPCC pre-industrial reference.

The check that found it is the sharpest one available, and it is now permanent in both the script and
the test suite: **"anomaly relative to X" means the series averages to zero over X.** HadCRUT5
averages +0.353 over 1961–1990 and −0.012 over 1850–1900, which settles it. Getting a baseline label
wrong silently shifts every number on the page — precisely the failure this tab exists to explain, so
having made it myself is recorded rather than quietly fixed.

## 1. The one claim, and its proof

$$ \text{rebase}(y) = y - \overline{y}_{[a,b]} $$

Rebasing subtracts **one constant** from every year. A constant cannot tilt a line, so:

- every headline number changes, by up to half a degree
- **no trend changes at all**

This is asserted to twelve decimal places, on synthetic series with a known slope and on the real
record, across every baseline in the catalogue. In the browser, switching from 1850–1900 to 1991–2020
moves the 2026 anomaly from **+1.38 °C to +0.49 °C** while all four trends stay byte-identical.

The baselines in the catalogue, and why each exists:

| Baseline | Used by | Effect |
| --- | --- | --- |
| 1850–1900 | IPCC, as the closest stand-in for pre-industrial. The 1.5 °C target is measured from here. | largest numbers |
| 1951–1980 | NASA GISS. Within living memory, so the anomaly reads as a departure from a remembered climate. | mid |
| 1961–1990 | WMO / Met Office standard 30-year normal. | mid |
| 1991–2020 | The current WMO normal. | **smallest numbers, because the reference period is itself already warmed** |

There is no correct choice. That is the point.

## 2. Trends, always with an error bar

Ordinary least squares, quoted per decade with the standard error of the slope.

The error bar is not decoration. It is there because of a specific abuse: pick a short window, find a
slope that looks flat or alarming, quote it without uncertainty. Measured on the real record:

| Window | Trend | Std error |
| --- | --- | --- |
| Full record | +0.067 °C/decade | ±0.003 |
| Since 1975 | +0.208 | ±0.010 |
| Last 30 years | +0.232 | ±0.021 |
| Last 15 years | +0.325 | **±0.061** |

The fifteen-year error bar is **twenty times wider** than the full-record one. Fits below ten years
are refused outright.

## 3. Two teams, one planet

For 2024, NASA published **1.28 °C** and the Met Office **1.51 °C**. That reads as a 0.23 °C
disagreement between two major climate groups.

Put both on a common 1961–1990 baseline: **1.18** and **1.16**. Two hundredths apart. Their trends
over 1975–2025 agree to **0.001 °C/decade**.

So roughly nine tenths of the apparent disagreement was a choice of reference period. What remains is
real and explainable: GISTEMP interpolates into the Arctic and HadCRUT5 historically left more of it
out, and the Arctic is warming fastest.

## 4. Verified against the IPCC

AR6 WG1 reports about **1.09 °C** of warming for 2011–2020 relative to 1850–1900. Computed here from
HadCRUT5: **1.11 °C**. A test pins it to the 1.0–1.2 range.

## 5. What is deliberately not done

- **No absolute temperatures.** Nobody can measure the Earth's absolute mean temperature to a tenth
  of a degree; it depends where you put the thermometers. Differences from a reference period are far
  better constrained, which is why climate science works in anomalies.
- **No attribution.** This tab measures. Establishing that the warming is caused by greenhouse gases
  takes physics and model experiments far beyond a temperature series, and a page claiming to
  demonstrate causation from this data alone would be overreaching.
- **No "1.5 °C breached" claim.** The target is defined on a multi-decade mean, not a single year, so
  a single year above 1.5 is not the same statement.
- **No rebasing onto a window a series does not cover.** GISTEMP starts in 1880, so it cannot honestly
  be placed on the IPCC 1850–1900 baseline. `rebase` returns null and the UI disables that option
  rather than averaging over a partial window and being wrong by an unknown amount.
- **No fixed colour scale on the stripes.** The range is taken from the data and printed underneath,
  so the picture cannot rescale silently as years are added.
