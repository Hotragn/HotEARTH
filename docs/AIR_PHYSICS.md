# Air: what is measured, what is a judgement call

**Honesty rule for this tab.** The feed supplies **concentrations**. Every index, band, category,
conversion and comparison on the page is computed here from published tables, and the tables are
named.

**An air quality index is not a measurement.** It is a national policy judgement wrapped around a
measurement: a lookup table with straight lines drawn between the rows, and the rows are chosen by
regulators. That is the whole point of this tab.

Implemented in `lib/air.ts`, validated by 36 unit tests in `lib/air.test.ts`.

## Data

| | |
| --- | --- |
| Source | Copernicus CAMS forecasts, served by Open-Meteo |
| Licence | CAMS data free to use with attribution |
| Key required | none |
| Payload | about 3 KB per location |
| Committed mirror | none: a stale concentration looks exactly like a current one |

## 1. The US EPA index is a lookup table

$$ I = \frac{I_{high} - I_{low}}{C_{high} - C_{low}}(C - C_{low}) + I_{low} $$

That is the entire method. Linear interpolation inside each row of a published table.

The PM2.5 table used here is the **2024 revision**, in which the Good band ends at 9.0 µg/m³ rather
than the old 12.0. That single change moves 10 µg/m³ from "Good" to "Moderate", which is worth
knowing if you are comparing against a screenshot from a few years ago.

Tests assert that every band edge maps exactly onto its index edge, for all four tables, because an
off-by-one transcription is the likeliest error and would be invisible in normal use.

## 2. Units: the factor-of-two trap

The US tables for ozone and NO₂ are written in **parts per billion**. The feed reports **micrograms
per cubic metre**. Converting requires the molar mass and a reference state:

$$ \text{ppb} = \frac{\mu g/m^3 \times V_m}{M}, \qquad V_m = 24.45\ \mathrm{L/mol}\ (25°C,\ 1013.25\ \mathrm{hPa}) $$

| Gas | 1 ppb equals |
| --- | --- |
| Ozone | 1.96 µg/m³ |
| NO₂ | 1.88 µg/m³ |
| SO₂ | 2.62 µg/m³ |
| CO | 1145 µg/m³ per ppm |

A test measures the cost of skipping this: **197 µg/m³ of ozone is 100 ppb, which is "Unhealthy";
treating the 197 as if it were already ppb lands two bands higher.** The wrong answer looks entirely
plausible on a dashboard, which is what makes it dangerous.

**Particulates are refused.** PM2.5 is a size class, not a substance, so it has no molar mass and no
ppb figure. `ugm3ToPpb` returns null rather than inventing one.

## 3. The European index is a different shape

The EEA index is a **band**, not a 0–500 score: the published product is the name of the band. Any
numeric scale attached to it is a presentation choice.

Band edges for PM2.5 (µg/m³): 10, 20, 25, 50, 75. Note the first edge is **10**, where the US index
crosses out of Good at **9.0**. That one-microgram gap is the reason the same air can be "Moderate"
in the US and "Good" in Europe, and the tab flags it when it happens.

## 4. Both indices are a maximum, not an average

Both take the **worst** pollutant. That is correct for a health warning and poor for understanding
the air, because the resulting number is silent about what it is describing. So the pollutant
responsible is named next to it.

This produces the most interesting thing the tab does. On a real Delhi reading:

| | Verdict | Driven by |
| --- | --- | --- |
| US EPA AQI | 188, Unhealthy | **Ozone** |
| European EAQI | Poor (band 4 of 6) | **PM2.5** |

The two scales disagreed about the *culprit*, not just the score, from identical concentrations. A
single index number from either country would have hidden that completely.

## 5. The WHO guideline is the anchor

WHO 2021: PM2.5 **5 µg/m³ annual**, 15 daily. PM10 15 / 45. NO₂ 10 / 25.

These are health-based rather than a scale, which makes them the more meaningful comparison. The top
of the US "Good" band, 9.0 µg/m³, is **1.8× the WHO annual guideline**. Every pollutant row shows its
multiple of the daily guideline.

## 6. What is deliberately not done

- **No cigarette equivalence.** The widely quoted "one cigarette per 22 µg/m³" was built for one
  specific comparison in one paper, not as a dose model, and it does not survive being applied to an
  hourly reading in a place with different pollution chemistry.
- **No claim to be a monitor.** These are modelled kilometre-scale concentrations. A busy road, a
  wood stove or a still valley can put the air you are breathing well above or below them.
- **No pretending about the averaging window.** The US PM2.5 table is defined on a 24-hour average
  and is applied here to hourly values. During a fast-moving smoke plume that reads high sooner than
  the official index, and recovers sooner. The shape is right; the exact number is not the one an
  agency would publish.
- **No health advice.** The categories carry the EPA's and EEA's own wording and nothing added.

## 7. The feed's own indices, as a cross-check

Open-Meteo publishes `us_aqi` and `european_aqi`. The tab shows them next to ours, labelled as a
cross-check rather than as the answer, with the reason they differ stated: the 2024 table revision
and the averaging window. Boston read 57 here against the feed's 54; Delhi 188 against 149. Showing
both, with the reason, is more honest than silently matching whichever number looked better.
