#!/usr/bin/env python3
"""
Commit the ozone record as JSON: the hole, the chemicals that made it, and five
ground stations that watched it happen.

WHY A MIRROR. None of these three sources sends CORS headers, so a browser
cannot read them directly. Mirroring is honest here for the same reason it is
for climate, carbon, ice and sea level, and the opposite reason it is refused
for earthquakes: an annual ozone hole area, a yearly mean mixing ratio and a
monthly mean total column are all STATES, revised when a record is reprocessed,
not lists of events. A mirror a few weeks old still describes the ozone layer
correctly. A stale list of earthquakes is a lie about what is happening now.

WHAT IS FETCHED

  1. NASA Ozone Watch annual_data.txt. One row a year from 1979: the mean
     Antarctic ozone hole area over 7 September to 13 October, and the minimum
     total column over 21 September to 16 October. These are the two numbers the
     news quotes.

  2. NOAA's Ozone Depleting Gas Index, tables 1 and 2. Yearly global mean
     surface abundances of ten ozone depleting gases in parts per trillion, the
     equivalent effective stratospheric chlorine computed from them, and the
     index itself, separately for the Antarctic and mid-latitude stratosphere.
     This is the CAUSE, measured in air rather than inferred from an emissions
     inventory.

  3. NOAA GML Dobson total column, five stations, individual observations from
     1963 onward, averaged here to monthly means. South Pole, Lauder, Mauna Loa,
     Boulder and Barrow: a ladder from 90 South to 71 North. These are ground
     spectrophotometers, wholly independent of the satellites in item 1, and
     three of them were running before the hole existed.

WHAT THE GUARDS ARE FOR

  THE INDEX IDENTITY. NOAA defines the ODGI as 100 at the peak halogen
  abundance and 0 at the 1980 abundance, which makes it an affine function of
  the EESC column published beside it. The 1980 abundance itself is not in the
  file. This script SOLVES for it from every row and requires that the round
  trip reproduces NOAA's own index column to better than 0.15 index points. A
  hardcoded baseline would go silently wrong the day NOAA revises the scale;
  this fails the job instead.

  THE POLAR NIGHT. A Dobson spectrophotometer needs a light source. At the South
  Pole the sun is down for half the year, so the observations switch to
  moonlight, and the kind of observation is recorded in the last column. The
  script requires that at least 95 percent of the South Pole's Direct_Moon
  observations fall between April and September. If the column layout shifts
  under this parser, that fraction collapses and the job fails. It is a fraction
  rather than an absolute rule because the record contains exactly one February
  moon observation, and a guard that fires on one genuine row is a guard that
  gets deleted.

Sources, all free to use with credit, all keyless:
  NASA Ozone Watch, Goddard Space Flight Center.
    https://ozonewatch.gsfc.nasa.gov/
  NOAA Global Monitoring Laboratory Ozone Depleting Gas Index (Montzka, Dutton,
    Vimont).  https://gml.noaa.gov/odgi/
  NOAA Global Monitoring Laboratory Dobson total ozone network.
    https://gml.noaa.gov/aftp/data/ozwv/Dobson/

Usage:
    python scripts/ozone/fetch_ozone.py --out public/data/ozone/ozone.json
"""

from __future__ import annotations

import argparse
import collections
import datetime as dt
import json
import os
import statistics
import sys
import urllib.request

NASA_ANNUAL = "https://ozonewatch.gsfc.nasa.gov/meteorology/annual_data.txt"
ODGI = "https://gml.noaa.gov/odgi/odgi_table{n}.csv"
DOBSON = "https://gml.noaa.gov/aftp/data/ozwv/Dobson/dobson_to{code}.txt"

# The satellite hole record begins with TOMS on Nimbus-7 in 1979.
FIRST_HOLE_YEAR = 1979

# NASA's threshold for the edge of the hole, in Dobson Units. A convention, not
# a measurement: column values below 220 DU were not seen before 1979, and an
# aircraft campaign showed that getting below 220 requires catalysed chlorine
# and bromine loss. The tab says so rather than presenting it as a natural edge.
HOLE_THRESHOLD_DU = 220

# Plausibility windows. Anything outside these is a parse failure, not a
# surprising planet. The hole has never exceeded 27 million square km; the
# whole area south of 60 South is about 50 million. Total column runs from
# roughly 90 DU inside the worst of the hole to 500 over the Arctic in spring.
MAX_HOLE_AREA = 35.0
MIN_COLUMN_DU = 70.0
MAX_COLUMN_DU = 700.0

# The five ground stations, poleward-first in the south. Latitudes and longitudes
# are read from each file's own header row and checked against these.
STATIONS = [
    ("SPO", "Amundsen-Scott South Pole", -89.90, -24.80),
    ("LAU", "Lauder, New Zealand", -45.04, 169.68),
    ("MLO", "Mauna Loa, Hawaii", 19.53, -155.58),
    ("BLD", "Boulder, Colorado", 40.02, -105.25),
    ("BRW", "Utqiagvik (Barrow), Alaska", 71.32, -156.61),
]

# Months in which the South Pole has no sun and the Dobson must use the moon.
POLAR_NIGHT_MONTHS = {4, 5, 6, 7, 8, 9}
MOON_IN_NIGHT_FRACTION = 0.95

# How closely the recomputed index must reproduce NOAA's published column.
ODGI_TOLERANCE = 0.15


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "H.O.T-EARTH/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            if r.status != 200:
                die(f"{url} returned HTTP {r.status}")
            return r.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        die(f"{url}: {exc}")
        raise


def parse_hole(text: str) -> dict:
    """NASA's annual Antarctic hole area and minimum column."""
    years: list[int] = []
    area: list[float] = []
    minimum: list[float] = []
    area_window = ""
    min_window = ""
    for line in text.splitlines():
        if line.startswith("#"):
            low = line.lower()
            if "hole area mean" in low:
                area_window = line.split("(", 1)[-1].rstrip(") ").strip()
            elif "minimum ozone" in low:
                min_window = line.split("(", 1)[-1].rstrip(") ").strip()
            continue
        parts = line.split()
        if len(parts) != 3 or not parts[0].isdigit():
            continue
        try:
            y, a, m = int(parts[0]), float(parts[1]), float(parts[2])
        except ValueError:
            continue
        years.append(y)
        area.append(a)
        minimum.append(m)

    if not years:
        die("NASA annual file parsed to zero rows; the layout changed")
    if years[0] != FIRST_HOLE_YEAR:
        die(f"NASA record starts at {years[0]}, expected {FIRST_HOLE_YEAR}")
    if years != sorted(set(years)):
        die("NASA years are not strictly increasing; a year is repeated")

    # 1995 IS MISSING, AND SHOULD BE. Nimbus-7 TOMS failed in May 1993, Meteor-3
    # TOMS ended that December, and the next mapping instrument did not fly until
    # August 1996, so there was no measurement of the 1995 hole. The gap is in
    # the instrument, not in the ozone.
    #
    # It is carried through as an explicit year rather than closed up, because a
    # series indexed by position instead of by year quietly shifts everything
    # after 1994 by one and nothing complains. Anything more than a couple of
    # gaps is a layout change rather than a satellite gap, and fails.
    gaps = [y for y in range(years[0], years[-1] + 1) if y not in set(years)]
    if len(gaps) > 2:
        die(f"NASA record is missing {len(gaps)} years ({gaps}); the layout changed")
    for y, a, m in zip(years, area, minimum):
        if not 0.0 <= a <= MAX_HOLE_AREA:
            die(f"{y}: hole area {a} outside 0..{MAX_HOLE_AREA} million km2")
        if not MIN_COLUMN_DU <= m <= MAX_COLUMN_DU:
            die(f"{y}: minimum column {m} DU outside {MIN_COLUMN_DU}..{MAX_COLUMN_DU}")
    if not area_window or not min_window:
        die("NASA header no longer names the averaging windows")

    # NASA writes these as "07 September -- 13 October". That is a fixed-width
    # field and a typewriter dash, neither of which belongs in a sentence on a
    # page, so they are normalised once here rather than patched at every place
    # the string is printed.
    def tidy(window: str) -> str:
        out = window.replace("--", "to").replace("  ", " ")
        return " ".join(w.lstrip("0") if w.isdigit() else w for w in out.split())

    area_window = tidy(area_window)
    min_window = tidy(min_window)

    return {
        "years": years,
        "areaMillionKm2": area,
        "minimumDu": minimum,
        "gapYears": gaps,
        "areaWindow": area_window,
        "minimumWindow": min_window,
        "thresholdDu": HOLE_THRESHOLD_DU,
    }


def parse_odgi(text: str, label: str) -> dict:
    """One ODGI table: per-gas abundances, EESC, and the index.

    Also solves for the 1980 benchmark, which the file does not publish, and
    checks the solution by reproducing the published index column from it.
    """
    lines = [ln.rstrip("\n") for ln in text.splitlines() if ln.strip()]
    header = [h.strip() for h in lines[0].split(",")]
    if len(header) < 15:
        die(f"{label}: ODGI header has {len(header)} columns, expected 15")
    gas_names = header[1:11]

    years: list[int] = []
    gases: dict[str, list[float]] = {g: [] for g in gas_names}
    eesc: list[float] = []
    index: list[float] = []
    for ln in lines[1:]:
        cells = ln.split(",")
        if len(cells) < 15 or len(cells[0]) != 4 or not cells[0].isdigit():
            continue  # the notes block at the foot of the file
        try:
            values = [float(c) for c in cells[1:11]]
            e = float(cells[12])
            i = float(cells[14])
        except ValueError:
            die(f"{label}: unparseable row {cells[0]}")
        years.append(int(cells[0]))
        for g, v in zip(gas_names, values):
            gases[g].append(v)
        eesc.append(e)
        index.append(i)

    if len(years) < 20:
        die(f"{label}: only {len(years)} rows; the layout changed")
    if years != list(range(years[0], years[-1] + 1)):
        die(f"{label}: years are not a complete run")

    peak_at = max(range(len(eesc)), key=lambda i: eesc[i])
    peak = eesc[peak_at]

    # NOAA defines the index as 100 at the halogen peak and 0 at the 1980
    # abundance. That is affine in EESC, so every row with an index other than
    # 100 gives the 1980 benchmark. Solve from all of them, take the median, and
    # then require the round trip back to the published column.
    solved = [
        (100.0 * e - i * peak) / (100.0 - i)
        for e, i in zip(eesc, index)
        if abs(100.0 - i) > 1e-9
    ]
    if len(solved) < 10:
        die(f"{label}: too few rows to solve for the 1980 benchmark")
    benchmark = statistics.median(solved)
    worst = max(abs(100.0 * (e - benchmark) / (peak - benchmark) - i) for e, i in zip(eesc, index))
    if worst > ODGI_TOLERANCE:
        die(
            f"{label}: the index is no longer affine in EESC about a single "
            f"benchmark (worst residual {worst:.3f} index points, tolerance "
            f"{ODGI_TOLERANCE}). NOAA has changed the scale; do not ship a "
            f"silently wrong 1980 value."
        )

    return {
        "label": label,
        "years": years,
        "gasNames": gas_names,
        "gases": gases,
        "eescPpt": eesc,
        "odgi": index,
        "peakYear": years[peak_at],
        "peakEescPpt": peak,
        # Solved, not assumed. Rounded only for the payload; the check above ran
        # on the full-precision value.
        "benchmark1980Ppt": round(benchmark, 1),
        "worstIndexResidual": round(worst, 4),
    }


def parse_dobson(text: str, code: str, name: str, lat: float, lon: float) -> dict:
    """One Dobson station: individual observations averaged to monthly means.

    The observation count is kept beside every mean so the library, not this
    script, decides how many readings make a month worth using. A threshold
    baked in here would be invisible and untestable.
    """
    lines = text.splitlines()
    if len(lines) < 3:
        die(f"{code}: file has {len(lines)} lines")
    head = [c.strip() for c in lines[0].split(",")]
    if len(head) < 5:
        die(f"{code}: header row has {len(head)} fields, expected 5")
    try:
        file_lat, file_lon = float(head[3]), float(head[4])
    except ValueError:
        die(f"{code}: header does not carry a latitude and longitude")
    if abs(file_lat - lat) > 0.5 or abs(file_lon - lon) > 0.5:
        die(
            f"{code}: file says {file_lat},{file_lon} but this script expects "
            f"{lat},{lon}. The station list upstream changed."
        )

    buckets: dict[tuple[int, int], list[float]] = collections.defaultdict(list)
    # Airmass, by calendar month. The file calls it mu: the length of the light
    # path through the atmosphere relative to straight up. It is kept because it
    # explains the shape of the record rather than decorating it. The South Pole
    # has almost no March and no September not because nobody was there, but
    # because at the equinox the sun skims the horizon and mu runs past seven,
    # which is the edge of what the instrument can do.
    airmass: dict[int, list[float]] = collections.defaultdict(list)
    kinds: collections.Counter = collections.Counter()
    moon_months: collections.Counter = collections.Counter()
    rejected = 0
    for line in lines[2:]:
        parts = line.split()
        if len(parts) < 8:
            continue
        try:
            du = float(parts[6])
            mu = float(parts[7])
            y, m, _d = parts[0].split("/")
            year, month = int(y), int(m)
        except ValueError:
            rejected += 1
            continue
        if not MIN_COLUMN_DU <= du <= MAX_COLUMN_DU:
            rejected += 1
            continue
        if not 1 <= month <= 12:
            die(f"{code}: month {month} in {parts[0]}")
        buckets[(year, month)].append(du)
        if 1.0 <= mu <= 30.0:
            airmass[month].append(mu)
        kind = parts[-1]
        kinds[kind] += 1
        if kind == "Direct_Moon":
            moon_months[month] += 1

    if not buckets:
        die(f"{code}: parsed zero observations; the layout changed")
    total = sum(kinds.values())
    if rejected > total * 0.05:
        die(f"{code}: rejected {rejected} of {rejected + total} rows; the layout changed")

    # The polar night guard. See the module docstring.
    if code == "SPO":
        moon_total = sum(moon_months.values())
        if moon_total < 100:
            die(f"SPO: only {moon_total} moon observations; the kind column moved")
        in_night = sum(n for m, n in moon_months.items() if m in POLAR_NIGHT_MONTHS)
        frac = in_night / moon_total
        if frac < MOON_IN_NIGHT_FRACTION:
            die(
                f"SPO: only {frac:.1%} of moon observations fall in the polar "
                f"night (months {sorted(POLAR_NIGHT_MONTHS)}); expected at least "
                f"{MOON_IN_NIGHT_FRACTION:.0%}. The kind column moved."
            )

    keys = sorted(buckets)
    return {
        "code": code,
        "name": name,
        "lat": lat,
        "lon": lon,
        "months": [f"{y:04d}-{m:02d}" for y, m in keys],
        "du": [round(statistics.mean(buckets[k]), 1) for k in keys],
        "obs": [len(buckets[k]) for k in keys],
        "kinds": dict(kinds.most_common()),
        # Which months were measured by moonlight, and how often. Two fields so
        # the polar night is a thing the tab can show rather than assert: the
        # South Pole's moon observations land in April to September because that
        # is when there is no sun to point the instrument at.
        "moonMonths": {str(m): n for m, n in sorted(moon_months.items())},
        "medianAirmass": {
            str(m): round(statistics.median(v), 2) for m, v in sorted(airmass.items()) if v
        },
        "observations": total,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    out = {
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "hole": parse_hole(fetch(NASA_ANNUAL)),
        "odgi": {
            "antarctic": parse_odgi(fetch(ODGI.format(n=1)), "Antarctic"),
            "midLatitude": parse_odgi(fetch(ODGI.format(n=2)), "Mid-latitude"),
        },
        "stations": [
            parse_dobson(fetch(DOBSON.format(code=c)), c, n, la, lo)
            for c, n, la, lo in STATIONS
        ],
    }

    # Only rewrite the file if the DATA changed.
    #
    # The payload carries a build timestamp, so a naive write produces a diff on
    # every run and the workflow's "nothing changed" branch becomes dead code:
    # the repository would collect a commit a month whether or not NASA and NOAA
    # published anything new. Comparing everything except the timestamp makes
    # that branch true again.
    if os.path.exists(args.out):
        try:
            with open(args.out, encoding="utf-8") as f:
                previous = json.load(f)
            if {k: v for k, v in previous.items() if k != "generated"} == {
                k: v for k, v in out.items() if k != "generated"
            }:
                print(f"{args.out} is already current; leaving it alone")
                return
        except (OSError, ValueError):
            pass  # unreadable or not JSON: write a fresh one
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, separators=(",", ":"))

    hole = out["hole"]
    print(f"written to {args.out} ({os.path.getsize(args.out) / 1024:.0f} kB)")
    print(
        f"  hole: {hole['years'][0]} to {hole['years'][-1]}, "
        f"latest area {hole['areaMillionKm2'][-1]} million km2, "
        f"latest minimum {hole['minimumDu'][-1]} DU"
    )
    for key in ("antarctic", "midLatitude"):
        o = out["odgi"][key]
        print(
            f"  odgi {o['label']}: {o['years'][0]} to {o['years'][-1]}, "
            f"peak {o['peakEescPpt']:.0f} ppt in {o['peakYear']}, "
            f"1980 benchmark solved at {o['benchmark1980Ppt']} ppt "
            f"(worst residual {o['worstIndexResidual']}), "
            f"index now {o['odgi'][-1]}"
        )
    for s in out["stations"]:
        print(
            f"  {s['code']} ({s['lat']:+.1f}): {s['months'][0]} to "
            f"{s['months'][-1]}, {len(s['months'])} months, "
            f"{s['observations']} observations"
        )


if __name__ == "__main__":
    main()
