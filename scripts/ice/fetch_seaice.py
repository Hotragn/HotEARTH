#!/usr/bin/env python3
"""
Commit the NSIDC Sea Ice Index as JSON.

WHY A MIRROR. NSIDC does not send CORS headers, so a browser cannot read these
CSVs directly. Mirroring is honest here for the same reason it is for the
climate and carbon tabs and the opposite reason it is refused for earthquakes: a
monthly mean sea ice extent is a STATE, revised when the record is reprocessed,
not a list of events. A mirror a few weeks old is still a correct description of
the ice. A stale list of earthquakes is a lie about what is happening now.

WHAT IS FETCHED
  - monthly extent and area, both hemispheres, all twelve months, 1979 onward.
    24 files. These carry the trends.
  - daily extent for a few named years plus the current one, both hemispheres,
    so the seasonal cycle can be drawn rather than described.
  - the 1981-2010 daily climatology with its percentile band, which is NSIDC's
    own reference period and their own percentiles, not something computed here.

TWO THINGS IN THIS DATA THAT ARE CONVENTIONS, NOT MEASUREMENTS, and are stated
on the tab rather than buried:

  1. EXTENT counts a grid cell as ice if at least 15% of it is ice. AREA adds up
     the actual fractions. Extent is therefore always larger, and the 15% is a
     choice: it exists because it is the level at which the passive microwave
     signal is reliable, not because 15% ice is meaningfully different from 14%.
     Both numbers are in these files, which is why this tab shows both.

  2. THE POLE HOLE. The satellites do not see the area immediately around the
     pole, because their orbits do not pass over it. For extent, NSIDC assumes
     that hole is ice-covered, which is nearly always right and is still an
     assumption. The hole has shrunk as instruments changed (SMMR, then SSM/I,
     then SSMIS), so the assumption covers less area now than it did in 1979.

The source_dataset column is preserved for the same reason: the underlying
product changes over the record (NSIDC-0051 for most of it, NSIDC-0803 for
recent months), and a reader is entitled to know when the instrument changed
under a trend line.

Source: https://noaadata.apps.nsidc.org/NOAA/G02135/
Sea Ice Index, Version 4. NSIDC, Boulder, Colorado. US Government work, free to
use with credit.

Usage:
    python scripts/ice/fetch_seaice.py --out public/data/ice/sea-ice.json
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import os
import sys
import urllib.request

BASE = "https://noaadata.apps.nsidc.org/NOAA/G02135"

HEMIS = {"north": "N", "south": "S"}

# Extent in millions of square km. Anything outside this is a parse failure, not
# a surprising planet: the Arctic runs about 4 to 16, the Antarctic about 2 to 20.
MIN_EXTENT = 1.0
MAX_EXTENT = 22.0

# The passive microwave record begins on 26 October 1978, so NOVEMBER and
# DECEMBER have one more year than every other month. October 1978 is absent even
# though the record starts inside it, because six days is not a month: NSIDC
# declines to publish a monthly mean it cannot compute, which is the same rule
# the carbon tab applies to partial years. 1978 is therefore a partial year that
# no annual statistic can use.
#
# Encoded here rather than smoothed over, so that a change in the upstream layout
# fails loudly instead of quietly shifting a 47-year trend by a year.
RECORD_START = dt.date(1978, 10, 26)
FIRST_FULL_YEAR = 1979
FIRST_FULL_MONTH_OF_1978 = 11


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "H.O.T-EARTH/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            if r.status != 200:
                die(f"{url} returned HTTP {r.status}")
            return r.read().decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        die(f"{url}: {exc}")
        raise


def parse_monthly(text: str, hemi: str, month: int) -> dict:
    """One month of one hemisphere: year, extent, area, and the source product."""
    rows = list(csv.reader(io.StringIO(text)))
    if not rows:
        die(f"empty monthly file for {hemi} {month}")
    header = [c.strip().lower() for c in rows[0]]
    for want in ("year", "extent", "area"):
        if want not in header:
            die(f"monthly {hemi} {month}: no {want!r} column, layout changed")
    iy = header.index("year")
    ie = header.index("extent")
    ia = header.index("area")
    isrc = header.index("source_dataset") if "source_dataset" in header else None
    imo = header.index("mo") if "mo" in header else None

    years: list[int] = []
    extent: list[float | None] = []
    area: list[float | None] = []
    sources: dict[str, list[int]] = {}

    for row in rows[1:]:
        if len(row) <= max(iy, ie, ia):
            continue
        try:
            y = int(row[iy].strip())
            e = float(row[ie].strip())
            a = float(row[ia].strip())
        except ValueError:
            continue
        if imo is not None:
            try:
                if int(row[imo].strip()) != month:
                    die(f"monthly {hemi} {month}: row claims month {row[imo].strip()}")
            except ValueError:
                pass
        # NSIDC uses -9999 for missing months (there are a few in 1987-88).
        ev = e if e > 0 else None
        av = a if a > 0 else None
        if ev is not None and not (MIN_EXTENT <= ev <= MAX_EXTENT):
            die(f"monthly {hemi} {month} {y}: extent {ev} outside {MIN_EXTENT}-{MAX_EXTENT}")
        if ev is not None and av is not None and av > ev:
            # Area can never exceed extent: extent counts partly-covered cells in
            # full. If this ever trips, the columns have been swapped upstream.
            die(f"monthly {hemi} {month} {y}: area {av} exceeds extent {ev}")
        years.append(y)
        extent.append(ev)
        area.append(av)
        if isrc is not None:
            src = row[isrc].strip()
            if src:
                sources.setdefault(src, []).append(y)

    if not years:
        die(f"monthly {hemi} {month}: no usable rows")
    expected_first = (
        RECORD_START.year if month >= FIRST_FULL_MONTH_OF_1978 else FIRST_FULL_YEAR
    )
    if years[0] != expected_first:
        die(
            f"monthly {hemi} {month}: starts at {years[0]}, expected {expected_first} "
            f"(the record begins {RECORD_START.isoformat()})"
        )
    # Years must be strictly increasing with no duplicates. Gaps are allowed and
    # recorded rather than rejected: there is a real one, the satellite outage
    # from December 1987 to January 1988.
    gaps: list[list[int]] = []
    for a, b in zip(years, years[1:]):
        if b <= a:
            die(f"monthly {hemi} {month}: years not increasing at {a}, {b}")
        if b != a + 1:
            gaps.append([a, b])

    return {
        "years": years,
        "extent": extent,
        "area": area,
        "gaps": gaps,
        "missing": [y for y, e in zip(years, extent) if e is None],
        "sources": {k: [min(v), max(v)] for k, v in sorted(sources.items())},
    }


def parse_daily(text: str) -> dict:
    """Daily extent, kept as year -> (day of year, extent)."""
    rows = list(csv.reader(io.StringIO(text)))
    if len(rows) < 3:
        die("daily file too short")
    by_year: dict[int, dict[int, float]] = {}
    for row in rows[2:]:  # two header lines
        if len(row) < 4:
            continue
        try:
            y = int(row[0].strip())
            m = int(row[1].strip())
            d = int(row[2].strip())
            e = float(row[3].strip())
        except ValueError:
            continue
        if not (MIN_EXTENT <= e <= MAX_EXTENT):
            continue
        try:
            doy = dt.date(y, m, d).timetuple().tm_yday
        except ValueError:
            continue
        by_year.setdefault(y, {})[doy] = e
    if not by_year:
        die("daily file produced no usable rows")
    return by_year


def parse_climatology(text: str) -> dict:
    rows = list(csv.reader(io.StringIO(text)))
    # first line is a note about the years, second is the header
    header_idx = 0
    for i, row in enumerate(rows[:4]):
        if row and row[0].strip().upper() == "DOY":
            header_idx = i
            break
    else:
        die("climatology: no DOY header row")
    header = [c.strip().lower() for c in rows[header_idx]]

    def col(name: str) -> int:
        for i, h in enumerate(header):
            if name in h:
                return i
        die(f"climatology: no {name!r} column")
        raise AssertionError

    i_doy = col("doy")
    i_avg = col("average")
    i_10 = col("10th")
    i_25 = col("25th")
    i_50 = col("50th")
    i_75 = col("75th")
    i_90 = col("90th")

    doy: list[int] = []
    avg: list[float] = []
    p10: list[float] = []
    p25: list[float] = []
    p50: list[float] = []
    p75: list[float] = []
    p90: list[float] = []
    for row in rows[header_idx + 1 :]:
        if len(row) <= i_90:
            continue
        try:
            d = int(row[i_doy].strip())
            vals = [float(row[i].strip()) for i in (i_avg, i_10, i_25, i_50, i_75, i_90)]
        except ValueError:
            continue
        if any(not (MIN_EXTENT <= v <= MAX_EXTENT) for v in vals):
            continue
        doy.append(d)
        avg.append(vals[0])
        p10.append(vals[1])
        p25.append(vals[2])
        p50.append(vals[3])
        p75.append(vals[4])
        p90.append(vals[5])

    if len(doy) < 360:
        die(f"climatology: only {len(doy)} days, expected a full year")
    # The percentiles must be ordered on every single day, or the columns have
    # been misread. This is cheap and catches a whole class of silent error.
    for i in range(len(doy)):
        if not (p10[i] <= p25[i] <= p50[i] <= p75[i] <= p90[i]):
            die(f"climatology day {doy[i]}: percentiles out of order")

    return {
        "doy": doy,
        "average": avg,
        "p10": p10,
        "p25": p25,
        "p50": p50,
        "p75": p75,
        "p90": p90,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--daily-years",
        type=int,
        default=3,
        help="how many recent years of daily extent to keep, on top of the record years",
    )
    args = ap.parse_args()

    out: dict = {
        "generated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "source": BASE,
        "credit": "NSIDC Sea Ice Index, Version 4, National Snow and Ice Data Center, Boulder, Colorado",
        "note": "Extent counts a cell as ice at 15% concentration or more; area sums the fractions. Both are here on purpose.",
        "hemispheres": {},
    }

    this_year = dt.datetime.now(dt.timezone.utc).year

    for hemi, code in HEMIS.items():
        monthly: dict[str, dict] = {}
        for month in range(1, 13):
            url = f"{BASE}/{hemi}/monthly/data/{code}_{month:02d}_extent_v4.0.csv"
            monthly[str(month)] = parse_monthly(fetch(url), code, month)

        daily_raw = parse_daily(
            fetch(f"{BASE}/{hemi}/daily/data/{code}_seaice_extent_daily_v4.0.csv")
        )
        clim = parse_climatology(
            fetch(
                f"{BASE}/{hemi}/daily/data/"
                f"{code}_seaice_extent_climatology_1981-2010_v4.0.csv"
            )
        )

        # Which years of daily data to keep: the recent ones, plus the year of the
        # record minimum, which is the one a reader will want to compare against.
        # Chosen from the DATA rather than hardcoded, so the file cannot end up
        # claiming a record that has since been broken.
        sept_or_feb = 9 if hemi == "north" else 2
        mins = monthly[str(sept_or_feb)]
        pairs = [
            (y, e) for y, e in zip(mins["years"], mins["extent"]) if e is not None
        ]
        record_year = min(pairs, key=lambda p: p[1])[0] if pairs else None

        keep = {y for y in range(this_year - args.daily_years + 1, this_year + 1)}
        if record_year:
            keep.add(record_year)
        keep = {y for y in keep if y in daily_raw}

        daily = {}
        for y in sorted(keep):
            days = sorted(daily_raw[y].items())
            daily[str(y)] = {
                "doy": [d for d, _ in days],
                "extent": [round(v, 3) for _, v in days],
            }

        out["hemispheres"][hemi] = {
            "code": code,
            "monthly": monthly,
            "daily": daily,
            "climatology": clim,
            "climatologyYears": [1981, 2010],
            "recordMinimumYear": record_year,
            "minimumMonth": sept_or_feb,
        }

    # Only rewrite the file if the DATA changed.
    #
    # The payload carries a build timestamp, so a naive write produces a diff on
    # every run and the workflow's "nothing changed" branch becomes dead code:
    # the repository would collect a commit a month whether or not NSIDC
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
    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"written to {args.out}")
    for hemi in HEMIS:
        h = out["hemispheres"][hemi]
        m = h["monthly"][str(h["minimumMonth"])]
        last = next(
            (
                (y, e)
                for y, e in reversed(list(zip(m["years"], m["extent"])))
                if e is not None
            ),
            (None, None),
        )
        print(
            f"  {hemi}: {m['years'][0]} to {m['years'][-1]}, minimum month "
            f"{h['minimumMonth']}, latest {last[1]} in {last[0]}, "
            f"record low {h['recordMinimumYear']}, "
            f"{len(h['daily'])} daily years"
        )
        srcs = m["sources"]
        if srcs:
            print(f"    products: {', '.join(f'{k} {v[0]}-{v[1]}' for k, v in srcs.items())}")


if __name__ == "__main__":
    main()
