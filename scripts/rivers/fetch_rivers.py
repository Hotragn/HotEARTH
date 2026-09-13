#!/usr/bin/env python3
"""
Commit the USGS annual peak streamflow record for eight long-record gauges.

WHY A MIRROR. The USGS peak service does not send CORS headers, so a browser
cannot read it directly. Mirroring is honest here for the same reason it is for
climate, carbon, ice, sea level and ozone, and the opposite reason it is refused
for earthquakes: an annual peak is a STATE, revised when a rating curve is
re-surveyed or a historic flood is re-estimated, not a list of events. A mirror a
few weeks old is still a correct description of the flood record. A stale list of
earthquakes is a lie about what is happening now.

WHAT IS FETCHED. For each gauge, every annual peak discharge USGS has: the water
year, the date, the peak discharge in cubic feet per second, the gauge height,
and THE QUALIFICATION CODES, which are the point.

WHY THE CODES ARE THE POINT. A flood frequency curve is fitted to a list of
numbers, and USGS publishes, next to each number, a flag saying what kind of
number it is. Read together they say that the list is not one population:

  1  the value is a maximum DAILY AVERAGE, not an instantaneous peak, and is
     therefore systematically lower than the peaks it sits beside.
  2  the discharge is an estimate.
  5  affected to an unknown degree by regulation or diversion.
  6  affected by regulation or diversion. On the Colorado at Lees Ferry this
     flag appears in 1962 and never goes away, because Glen Canyon Dam closed.
  7  a HISTORIC PEAK: reconstructed from high water marks or newspaper accounts
     rather than gauged. The three largest floods in the Willamette record are
     all of these.
  A  the year is not exact.  B  the month or day is not exact.
  C  affected by urbanisation, mining, channelisation or other change.

A tab that fits a single curve across those without saying so is presenting a
model of a river that stopped existing when the dam closed.

Sources, public domain, keyless:
  USGS National Water Information System, annual peak streamflow.
    https://nwis.waterdata.usgs.gov/nwis/peak
  USGS NWIS site service, for station names, coordinates and drainage areas.
    https://waterservices.usgs.gov/nwis/site/
  Works of the United States Geological Survey are in the public domain.

Usage:
    python scripts/rivers/fetch_rivers.py --out public/data/rivers/rivers.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.parse
import urllib.request

PEAK = "https://nwis.waterdata.usgs.gov/nwis/peak"
SITE = "https://waterservices.usgs.gov/nwis/site/"

# Eight gauges, chosen to span basin size, region, and above all HOW MANAGED the
# river is, because that is the axis the tab is about. The short label is what
# the UI shows; the station name from USGS is kept beside it.
#
# The regulation column is not asserted here. It is read back out of the USGS
# qualification codes after fetching, and the guard below checks that Lees Ferry
# still carries the regulation flag on the years after Glen Canyon Dam closed.
SITES = [
    ("12358500", "Middle Fork Flathead"),
    ("02226000", "Altamaha"),
    ("01646500", "Potomac"),
    ("14191000", "Willamette"),
    ("11425500", "Sacramento"),
    ("09380000", "Colorado at Lees Ferry"),
    ("06934500", "Missouri at Hermann"),
    ("07010000", "Mississippi at St. Louis"),
]

# Plausibility window for an annual peak, in cubic feet per second. The smallest
# gauge here peaks in the thousands; the Mississippi at St. Louis has never been
# recorded above about 1.1 million.
MIN_CFS = 1.0
MAX_CFS = 5_000_000.0

# A frequency curve fitted to fewer than this many peaks is not worth drawing,
# and a gauge that suddenly has fewer is a fetch that went wrong.
MIN_PEAKS = 30

# Glen Canyon Dam closed its diversion tunnels in March 1963, and the USGS record
# at Lees Ferry carries the regulation flag from the 1962 water year. If that flag
# stops appearing, the code column has moved and every claim on the tab about
# managed rivers is being made from the wrong field.
REGULATION_CODE = "6"
LEES_FERRY = "09380000"
GLEN_CANYON_WATER_YEAR = 1963


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


def rdb_rows(text: str, url: str) -> tuple[list[str], list[list[str]]]:
    """Split a USGS RDB payload into its header and its data rows.

    RDB puts comments on lines starting with #, then a header row, then a row of
    format specifiers like "5s" or "10d", then the data. The format row is what
    tells you the header really is a header, so it is required rather than
    skipped blindly.
    """
    lines = [ln.rstrip("\n") for ln in text.splitlines() if not ln.startswith("#")]
    lines = [ln for ln in lines if ln.strip()]
    if len(lines) < 2:
        die(f"{url}: RDB payload has {len(lines)} non-comment lines")
    header = lines[0].split("\t")
    spec = lines[1].split("\t")
    if len(spec) != len(header) or not all(s[:1].isdigit() for s in spec if s):
        die(f"{url}: second line is not an RDB format row; the layout changed")
    return header, [ln.split("\t") for ln in lines[2:]]


def water_year(year: int, month: str) -> int:
    """The water year a peak belongs to, which is NOT the year in its date.

    A USGS water year runs 1 October to 30 September and is named for the
    calendar year it ENDS in, so a flood on 4 December 1861 is the water year
    1862 peak. Reading the calendar year straight out of the date string is
    wrong for every autumn flood, and quietly so: it produces a list that is
    still in order and still looks like one peak a year.

    It is not a small effect. Forty-six of the Willamette's one hundred and
    thirty-six peaks fall between October and December, because its floods are
    winter storms, so a third of that record would sit under the wrong year and
    line up against the wrong rainfall, the wrong dam and the wrong decade.

    This was found by a guard rather than by reading the documentation: the
    duplicate-year check below fired on the Middle Fork Flathead, which has only
    two autumn peaks in eighty-five years. The rule was then verified against all
    eight gauges, where it turns 883 peaks with duplicates on every single gauge
    into 883 with none.

    When the month is unknown USGS writes 00, and the year it filed the peak
    under is kept as it stands. There is nothing better to do, and the
    monthKnown flag beside it says the date is partial.
    """
    return year + 1 if month.isdigit() and int(month) >= 10 else year


def parse_peaks(text: str, site: str) -> list[dict]:
    """Every annual peak USGS holds for one gauge, with its qualification codes."""
    header, rows = rdb_rows(text, f"{PEAK}?site_no={site}")
    need = ["site_no", "peak_dt", "peak_va", "peak_cd", "gage_ht"]
    missing = [c for c in need if c not in header]
    if missing:
        die(f"{site}: peak file is missing columns {missing}; the layout changed")
    col = {c: header.index(c) for c in need}

    out: list[dict] = []
    for r in rows:
        if len(r) <= max(col.values()):
            continue
        date = r[col["peak_dt"]].strip()
        raw = r[col["peak_va"]].strip()
        if not date or not raw:
            continue  # a year USGS lists but could not quantify
        try:
            discharge = float(raw)
        except ValueError:
            die(f"{site}: unparseable peak discharge {raw!r} on {date}")
        if not MIN_CFS <= discharge <= MAX_CFS:
            die(f"{site}: peak {discharge} cfs on {date} outside {MIN_CFS}..{MAX_CFS}")

        year_text = date[:4]
        if not year_text.isdigit():
            die(f"{site}: peak date {date!r} does not start with a year")

        # USGS writes an unknown month or day as 00, which is not a date any
        # parser will take. Both are kept as they are: a peak known only to the
        # month is a different kind of fact from one known to the day, and the
        # accompanying B code says so.
        month = date[5:7].strip()
        day = date[8:10].strip()

        height_text = r[col["gage_ht"]].strip()
        try:
            height = float(height_text) if height_text else None
        except ValueError:
            height = None

        out.append(
            {
                "waterYear": water_year(int(year_text), month),
                "date": date,
                "monthKnown": month not in ("", "00"),
                "dayKnown": day not in ("", "00"),
                "cfs": discharge,
                "gageHeightFt": height,
                "codes": [c for c in r[col["peak_cd"]].strip().split(",") if c],
            }
        )

    if len(out) < MIN_PEAKS:
        die(f"{site}: only {len(out)} usable peaks, expected at least {MIN_PEAKS}")

    years = [p["waterYear"] for p in out]
    if years != sorted(years):
        die(f"{site}: peaks are not in year order")
    if len(set(years)) != len(years):
        dupes = sorted({y for y in years if years.count(y) > 1})
        die(
            f"{site}: repeated water years {dupes}; a peak file holds one peak per "
            f"water year, so this means the water year is being derived wrongly"
        )
    return out


def parse_sites(text: str) -> dict[str, dict]:
    """Station names, coordinates, drainage areas."""
    header, rows = rdb_rows(text, SITE)
    need = ["site_no", "station_nm", "dec_lat_va", "dec_long_va", "drain_area_va"]
    missing = [c for c in need if c not in header]
    if missing:
        die(f"site service is missing columns {missing}; the layout changed")
    col = {c: header.index(c) for c in need}

    def number(text_value: str) -> float | None:
        try:
            return float(text_value.strip())
        except ValueError:
            return None

    out: dict[str, dict] = {}
    for r in rows:
        if len(r) <= max(col.values()):
            continue
        site = r[col["site_no"]].strip()
        out[site] = {
            "stationName": " ".join(r[col["station_nm"]].split()),
            "lat": number(r[col["dec_lat_va"]]),
            "lon": number(r[col["dec_long_va"]]),
            # Square miles, as USGS publishes it. The library converts.
            "drainageAreaSqMi": number(r[col["drain_area_va"]]),
        }
    return out


def check_regulation_flag(gauges: list[dict]) -> None:
    """The guard that keeps the code column honest.

    Glen Canyon Dam closed in 1963 and the Lees Ferry record has carried the
    regulation flag ever since. If this stops being true, either USGS restructured
    the file or this script is reading the wrong field, and every statement the
    tab makes about managed rivers is being made from garbage. Checked as a
    fraction rather than on every row, because one unflagged year in sixty is a
    clerical matter and a collapse to zero is a bug.
    """
    lees = next((g for g in gauges if g["site"] == LEES_FERRY), None)
    if lees is None:
        die("Lees Ferry is not in the payload; the regulation guard cannot run")
    after = [p for p in lees["peaks"] if p["waterYear"] >= GLEN_CANYON_WATER_YEAR]
    if len(after) < 20:
        die(f"Lees Ferry has only {len(after)} peaks after {GLEN_CANYON_WATER_YEAR}")
    flagged = [p for p in after if REGULATION_CODE in p["codes"]]
    share = len(flagged) / len(after)
    if share < 0.9:
        die(
            f"only {share:.0%} of Lees Ferry peaks after Glen Canyon Dam carry the "
            f"regulation code {REGULATION_CODE!r}; the qualification column moved"
        )

    before = [p for p in lees["peaks"] if p["waterYear"] < GLEN_CANYON_WATER_YEAR]
    if any(REGULATION_CODE in p["codes"] for p in before[:-2]):
        die("Lees Ferry carries the regulation code before the dam; the column moved")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    meta = parse_sites(
        fetch(
            SITE
            + "?"
            + urllib.parse.urlencode(
                {
                    "format": "rdb",
                    "sites": ",".join(s for s, _ in SITES),
                    "siteOutput": "expanded",
                }
            )
        )
    )

    gauges = []
    for site, label in SITES:
        peaks = parse_peaks(
            fetch(
                PEAK
                + "?"
                + urllib.parse.urlencode(
                    {"site_no": site, "agency_cd": "USGS", "format": "rdb"}
                )
            ),
            site,
        )
        info = meta.get(site)
        if info is None:
            die(f"{site}: the site service returned no metadata for this gauge")

        # Which codes actually appear here, and how often. The tab shows this
        # rather than describing the record as clean.
        tally: dict[str, int] = {}
        for p in peaks:
            for c in p["codes"]:
                tally[c] = tally.get(c, 0) + 1

        gauges.append(
            {
                "site": site,
                "label": label,
                **info,
                "peaks": peaks,
                "codeCounts": dict(sorted(tally.items())),
            }
        )

    check_regulation_flag(gauges)

    out = {
        "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "gauges": gauges,
    }

    # Only rewrite the file if the DATA changed.
    #
    # The payload carries a build timestamp, so a naive write produces a diff on
    # every run and the workflow's "nothing changed" branch becomes dead code:
    # the repository would collect a commit a month whether or not USGS published
    # a new peak. Comparing everything except the timestamp makes that branch
    # true again.
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

    print(f"written to {args.out} ({os.path.getsize(args.out) / 1024:.0f} kB)")
    for g in gauges:
        peaks = g["peaks"]
        biggest = max(peaks, key=lambda p: p["cfs"])
        print(
            f"  {g['label']:24s} n={len(peaks):3d} "
            f"{peaks[0]['waterYear']}-{peaks[-1]['waterYear']} "
            f"max {biggest['cfs']:>9,.0f} cfs in {biggest['waterYear']} "
            f"codes {g['codeCounts'] or '{}'}"
        )


if __name__ == "__main__":
    main()
