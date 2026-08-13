# Aurora: what is measured, what is computed

**Honesty rule for this tab.** The coloured oval is **NOAA's OVATION Prime model output**, not our
model and not a photograph. Everything else on the page (geomagnetic coordinates, the oval edge for
the current Kp, horizon ranges, the verdict for your location) is computed here in `lib/aurora.ts`,
validated by 39 unit tests.

## Data

| | |
| --- | --- |
| Source | NOAA Space Weather Prediction Center |
| Licence | public domain (US Government work) |
| Key required | none |
| Feeds | 1-minute estimated Kp, 3-day Kp forecast, OVATION Prime grid (~900 KB), DSCOVR solar wind speed and magnetic field |
| Committed mirror | none |

Space weather is a state of *right now*. A saved copy of last week's Kp would tell you nothing about
tonight, so if SWPC is unreachable the tab says so and shows nothing.

## 1. Geomagnetic latitude, and why it is the whole tab

Aurora rings the **geomagnetic** pole (IGRF-13 epoch 2020: 80.65°N, 72.68°W), which is in the
Canadian Arctic, not at the top of the globe. Geomagnetic latitude is 90° minus the angular distance
to that pole:

$$ \sin\phi_m = \sin\phi \sin\phi_p + \cos\phi \cos\phi_p \cos(\lambda - \lambda_p) $$

The consequence, and the reason the tab exists:

| Place | Geographic | Geomagnetic |
| --- | --- | --- |
| Edinburgh | 55.95°N | ~58.2°N |
| Moscow | 55.76°N | ~51.7°N |
| Vancouver | 49.28°N | ~54.6°N |
| Paris | 48.86°N | ~50.4°N |

Edinburgh and Moscow are within 0.2° of each other geographically and **over six degrees apart**
geomagnetically. Tests assert both pairings, plus exact identities: the pole returns 90°, the
geographic north pole returns exactly the pole offset (80.65°), the transform is antisymmetric
through the Earth's centre, and no place is displaced by more than the 9.35° pole separation.

**Limit:** this is a centred *dipole*. Operational corrected-geomagnetic coordinates differ by up to
about 3° in places, most noticeably around the North Atlantic. Near the oval edge, treat the verdict
as a strong hint rather than a ruling.

## 2. The oval edge, and a model consolidation

The equatorward edge by Kp comes from the table NOAA publishes with its aurora products: 66.5° at
Kp0 falling to 48.1° at Kp9, interpolated for the thirds Kp is actually reported in.

**This replaced a second, disagreeing model inside the same app.** `lib/sun` carried its own rule of
thumb, `boundary = 67 - 3·Kp`, also attributed to NOAA guidance, which reaches 40° at Kp9 against the
table's 48.1° — an eight-degree disagreement between two tabs. `lib/sun` now delegates to
`lib/aurora`, so there is one model.

The table is also the better decomposition. The old rule folded two separate effects into one
number: where the oval *is*, and how far away you can still *see* it. Those are now separate.

## 3. Horizon geometry: why red aurora is reported from absurdly far south

An emission at height $h$ is above the horizon out to a ground range of

$$ d = R \arccos\left(\frac{R}{R+h}\right) $$

| Emission | Altitude | Range | In latitude |
| --- | --- | --- | --- |
| Green (atomic oxygen) | 110 km | ~1,175 km | ~10.6° |
| Red (long-lived oxygen state) | 300 km | ~1,960 km | ~17.6° |

The red layer is higher because that transition is slow: it only survives where the air is thin
enough that nothing collides with the atom first. Being higher, it clears the horizon from about
seven degrees of latitude further away. That is the whole explanation for the red glows reported
from far south of where the oval actually reached during a severe storm, and the verdict reports
`horizon` and `red-only` as separate cases rather than blurring them.

## 4. The verdict, and the question other sites skip

`auroraVerdict` combines the observer's geomagnetic latitude, the oval edge for the current Kp, and
the two horizon ranges into four honest cases: `overhead`, `horizon`, `red-only`, `too-far`. Tests
walk a single city through all of them as Kp climbs, assert the progression is monotonic, and assert
the tropics stay excluded even at Kp9.

The tab then borrows `lib/tonight` to ask whether it is **dark** where you are. A strong oval over a
sky that never fully darkens is not an aurora you will see, which is precisely the situation at
aurora latitudes in midsummer.

## 5. What is deliberately not done

- **No forecast beyond the model's own hour.** OVATION looks about an hour ahead because that is the
  solar wind's travel time from L1. Nothing sees a storm coming much earlier than the wind reaches
  that spacecraft.
- **No local Kp.** Kp is a 3-hour planetary index. It is not a local measurement and not an
  instantaneous one, and the tab says so.
- **No cloud cover, no light pollution.** Same as Tonight.
- **No substorm timing.** Aurora arrives in bursts that nothing currently predicts minute to minute.
- **No sightings, no crowd reports, no photographs presented as forecasts.**
