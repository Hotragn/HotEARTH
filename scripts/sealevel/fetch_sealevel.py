#!/usr/bin/env python3
"""
Commit the two ways of measuring sea level as JSON.

WHY TWO SOURCES, AND WHY THAT IS THE POINT. There is no single measurement
called "sea level". There are two instruments answering two different questions:

  SATELLITE ALTIMETRY measures the height of the sea surface against the centre
  of the Earth. It has covered almost the whole ocean since 1992, and it says
  the global mean is rising about 3.2 mm a year.

  A TIDE GAUGE measures the height of the sea against the land it is bolted to.
  Some of those records reach back to 1807. And the land moves: rebounding from
  the weight of ice that melted ten thousand years ago, or sinking because
  somebody pumped the groundwater out from under it. So the same ocean gives
  Skagway MINUS 18 mm a year and Manila plus 13.

Neither instrument is wrong. They are measuring different things, and almost
every argument about local sea level rise is really an argument about which one
somebody meant.

WHAT IS FETCHED
  - NOAA Laboratory for Satellite Altimetry global mean sea level, all four
    published variants. They differ only by convention: whether the seasonal
    cycle is removed, and whether the domain is 66S to 66N or the reference
    missions' own 90 percent coverage. The header of each file carries NOAA's
    own trend, which this project checks its arithmetic against instead of
    trusting itself.
  - PSMSL Revised Local Reference annual means for a curated set of gauges,
    chosen because between them they cover falling, average and very fast rising
    sea level. The set is listed below with the reason each one is in it.

A NOTE ON THE PSMSL NUMBERS. They are millimetres relative to an arbitrary local
datum, offset by roughly 7,000 mm so the values stay positive. The absolute
number is therefore meaningless and only the trend means anything, which is
exactly the same caveat the tides tab carries about its gauge traces.

Sources
  https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/  (NOAA LSA, credit required)
  https://psmsl.org/data/obtaining/  (Permanent Service for Mean Sea Level)

Usage:
    python scripts/sealevel/fetch_sealevel.py --out public/data/sealevel/sea-level.json
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import urllib.request

ALTIMETRY_BASE = "https://www.star.nesdis.noaa.gov/socd/lsa/SeaLevelRise/slr"
PSMSL_DATA = "https://psmsl.org/data/obtaining/rlr.annual.data"
PSMSL_LIST = "https://psmsl.org/data/obtaining/rlr.annual.data/filelist.txt"

# The four published global variants. Same measurements, different conventions.
VARIANTS = {
    "free_all_66": {
        "file": "slr_sla_gbl_free_all_66.csv",
        "seasonal": "removed",
        "domain": "66S to 66N",
    },
    "keep_all_66": {
        "file": "slr_sla_gbl_keep_all_66.csv",
        "seasonal": "retained",
        "domain": "66S to 66N",
    },
    "free_ref_90": {
        "file": "slr_sla_gbl_free_ref_90.csv",
        "seasonal": "removed",
        "domain": "reference missions, 90 percent coverage",
    },
    "keep_ref_90": {
        "file": "slr_sla_gbl_keep_ref_90.csv",
        "seasonal": "retained",
        "domain": "reference missions, 90 percent coverage",
    },
}

# Chosen so that between them they make the local-versus-global point, with the
# reason kept next to the station because a curated list without its reasons is
# just a list somebody picked.
GAUGES = [
    (1, "Brest", "France", "One of the longest instrumental records of anything, from 1807."),
    (12, "New York", "United States", "The Battery, from 1856. The mid-Atlantic coast is subsiding, so it reads faster than the global mean."),
    (10, "San Francisco", "United States", "From 1855, and close to the global average."),
    (155, "Honolulu", "United States", "Mid-ocean, far from any subsiding delta, which makes it the nearest thing to a global reading a single gauge gives."),
    (161, "Galveston", "United States", "Fast rise, and most of it is the ground going down after a century of oil, gas and groundwater extraction."),
    (145, "Manila", "Philippines", "The fastest rise in this set, several times the global mean, almost all of it groundwater subsidence rather than ocean."),
    (78, "Stockholm", "Sweden", "Sea level FALLING, because Scandinavia is still rebounding from the ice sheet that left ten thousand years ago."),
    (62, "Oslo", "Norway", "Also falling, for the same reason as Stockholm."),
    (495, "Skagway", "United States", "Falling faster than anywhere else on Earth: the land is rising about two centimetres a year as Little Ice Age glaciers unload it."),
    (196, "Sydney", "Australia", "Fort Denison, the southern hemisphere's long record."),
]

# PSMSL uses -99999 for a missing year.
PSMSL_MISSING = -30000
# Sanity bounds for an RLR annual mean, in mm about the local datum.
PSMSL_MIN = 3000
PSMSL_MAX = 11000
# Sanity bounds for a global mean anomaly, in mm.
GMSL_MIN = -60
GMSL_MAX = 200


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


def parse_altimetry(text: str, key: str) -> dict:
    """
    One global variant, kept as one series per satellite.

    The first version of this parser assumed exactly one mission reports per
    sample, on the theory that the record is a clean relay. It is not, and the
    file said so immediately: from 2002 to 2005 both TOPEX/Poseidon and Jason-1
    carry values, because a new altimeter is flown in FORMATION with the old one
    for years before the old one is retired. That overlap is how the splice is
    calibrated, and it is the most interesting structural fact in the file, so the
    missions are kept apart rather than flattened.

    The merged series used for trends takes the mean of whatever is reporting,
    and the overlap disagreement is measured and reported instead of hidden.
    """
    published_trend = None
    missions: list[str] = []
    times: list[float] = []
    values: list[float | None] = []
    per_mission: list[list[float | None]] = []

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            if line.lower().startswith("#trend"):
                # "#trend = 3.17 mm/year (no glacial isostatic adjustment correction)"
                for token in line.split():
                    try:
                        published_trend = float(token)
                        break
                    except ValueError:
                        continue
            continue
        parts = [p.strip() for p in line.split(",")]
        if parts[0].lower() == "year":
            missions = parts[1:]
            per_mission = [[] for _ in missions]
            continue
        if not missions:
            die(f"{key}: data before the header row")
        try:
            t = float(parts[0])
        except ValueError:
            continue

        row: list[float | None] = []
        for i in range(len(missions)):
            raw_value = parts[i + 1] if i + 1 < len(parts) else ""
            if raw_value in ("", "NaN"):
                row.append(None)
                continue
            try:
                value = float(raw_value)
            except ValueError:
                row.append(None)
                continue
            if not (GMSL_MIN <= value <= GMSL_MAX):
                die(f"{key}: {t} value {value} mm outside {GMSL_MIN} to {GMSL_MAX}")
            row.append(round(value, 2))

        reporting = [v for v in row if v is not None]
        if not reporting:
            continue
        times.append(round(t, 5))
        values.append(round(sum(reporting) / len(reporting), 2))
        for i, v in enumerate(row):
            per_mission[i].append(v)

    if published_trend is None:
        die(f"{key}: no #trend line, so there is nothing to check our own fit against")
    if len(times) < 1000:
        die(f"{key}: only {len(times)} samples, expected the full record")
    for a, b in zip(times, times[1:]):
        if b <= a:
            die(f"{key}: time axis not increasing at {a}, {b}")
    used = [i for i, col in enumerate(per_mission) if any(v is not None for v in col)]
    if len(used) < 3:
        die(f"{key}: only {len(used)} missions present, expected the full relay")

    # Where two altimeters flew at once, how far apart did they read? This is the
    # calibration residual, and it belongs on the page rather than in a footnote:
    # it is the honest size of the uncertainty at every splice in a "continuous"
    # thirty-year record.
    overlaps = []
    for a in range(len(missions)):
        for b in range(a + 1, len(missions)):
            both = [
                (times[i], per_mission[a][i], per_mission[b][i])
                for i in range(len(times))
                if per_mission[a][i] is not None and per_mission[b][i] is not None
            ]
            if len(both) < 5:
                continue
            diffs = [abs(x[1] - x[2]) for x in both]
            overlaps.append(
                {
                    "missions": [missions[a], missions[b]],
                    "from": both[0][0],
                    "to": both[-1][0],
                    "samples": len(both),
                    "meanAbsDifferenceMm": round(sum(diffs) / len(diffs), 2),
                    "maxAbsDifferenceMm": round(max(diffs), 2),
                }
            )
    if not overlaps:
        die(f"{key}: no mission overlaps found, which contradicts how these records are built")

    # Each mission's series is stored SPARSE, as indices into the shared time axis
    # plus values, rather than as a dense column of 1,557 mostly-null slots. Four
    # variants times five dense columns came to 276 KB on the wire, which is not a
    # reasonable price for a page about millimetres.
    #
    # Sparse rather than a start index and a run, and the reason is worth writing
    # down because the first guess was wrong twice over. A mission's indices are
    # NOT contiguous, but not because its coverage has holes: during an overlap the
    # two satellites' ten-day cycles are out of phase, so their samples INTERLEAVE
    # in the merged time axis and each one's indices step by two. Counting index
    # steps as "gaps" therefore reports interleaving as missing data, which is why
    # the gaps below are measured in TIME. Measured that way there is exactly one
    # real gap in the whole record: 72 days of Jason-1.
    runs = []
    for i, name in enumerate(missions):
        col = per_mission[i]
        idx = [j for j, v in enumerate(col) if v is not None]
        if not idx:
            continue
        gaps = [times[b] - times[a] for a, b in zip(idx, idx[1:]) if times[b] - times[a] > 0.1]
        runs.append(
            {
                "mission": name,
                "index": idx,
                "value": [col[j] for j in idx],
                "timeGaps": len(gaps),
                "largestGapDays": round(max(gaps) * 365.25, 1) if gaps else 0,
            }
        )

    return {
        "publishedTrendMmPerYear": published_trend,
        "missions": missions,
        "time": times,
        "value": values,
        "missionRuns": runs,
        "overlaps": overlaps,
        "seasonal": VARIANTS[key]["seasonal"],
        "domain": VARIANTS[key]["domain"],
    }


def parse_gauge(text: str, sid: int, name: str) -> dict:
    years: list[int] = []
    values: list[float | None] = []
    for raw in text.splitlines():
        parts = [p.strip() for p in raw.split(";")]
        if len(parts) < 2:
            continue
        try:
            year = int(float(parts[0]))
            value = float(parts[1])
        except ValueError:
            continue
        if value <= PSMSL_MISSING:
            value_out = None
        else:
            if not (PSMSL_MIN <= value <= PSMSL_MAX):
                die(f"{name} ({sid}): {year} value {value} mm outside the RLR range")
            value_out = value
        if years and year <= years[-1]:
            die(f"{name} ({sid}): years not increasing at {years[-1]}, {year}")
        years.append(year)
        values.append(value_out)

    usable = [v for v in values if v is not None]
    if len(usable) < 30:
        die(f"{name} ({sid}): only {len(usable)} usable years, too short to trend")
    return {
        "years": years,
        "value": values,
        "firstYear": years[0],
        "lastYear": years[-1],
        "missing": [y for y, v in zip(years, values) if v is None],
    }


def parse_station_list(text: str) -> dict[int, tuple[float, float]]:
    """PSMSL's own catalogue, for coordinates. id; lat; lon; name; ..."""
    out: dict[int, tuple[float, float]] = {}
    for raw in text.splitlines():
        parts = [p.strip() for p in raw.split(";")]
        if len(parts) < 4:
            continue
        try:
            out[int(parts[0])] = (float(parts[1]), float(parts[2]))
        except ValueError:
            continue
    if len(out) < 500:
        die(f"station list has only {len(out)} entries, layout probably changed")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    out: dict = {
        "generated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "credit": {
            "altimetry": "Altimetry data are provided by NOAA Laboratory for Satellite Altimetry.",
            "gauges": "Permanent Service for Mean Sea Level (PSMSL), Revised Local Reference annual means.",
        },
        "sources": {"altimetry": ALTIMETRY_BASE, "gauges": PSMSL_DATA},
        "global": {},
        "gauges": [],
    }

    for key, meta in VARIANTS.items():
        out["global"][key] = parse_altimetry(fetch(f"{ALTIMETRY_BASE}/{meta['file']}"), key)

    # All four variants are the same measurements presented four ways, so they
    # must share a time axis. If they ever stop doing so, the comparison the tab
    # is built around is no longer apples to apples.
    axes = {k: v["time"] for k, v in out["global"].items()}
    first = next(iter(axes.values()))
    for k, v in axes.items():
        if v != first:
            die(f"global variant {k} has a different time axis from the others")

    # Shared, so stored once.
    out["time"] = first
    for v in out["global"].values():
        del v["time"]

    # The COVERAGE pattern is a property of the satellites, not of the product, so
    # all four variants index the time axis identically. Checked rather than
    # assumed, then hoisted: the indices are stored once and each variant keeps
    # only its values.
    base = {r["mission"]: r["index"] for r in next(iter(out["global"].values()))["missionRuns"]}
    for key, g in out["global"].items():
        for r in g["missionRuns"]:
            if r["index"] != base.get(r["mission"]):
                die(f"{key}: mission {r['mission']} covers different samples than the other variants")
    out["missionIndex"] = base
    out["missionOrder"] = [r["mission"] for r in next(iter(out["global"].values()))["missionRuns"]]
    for g in out["global"].values():
        g["missionValue"] = {r["mission"]: r["value"] for r in g["missionRuns"]}
        g["missionGaps"] = {
            r["mission"]: {"gaps": r["timeGaps"], "largestGapDays": r["largestGapDays"]}
            for r in g["missionRuns"]
        }
        del g["missionRuns"]
        # The merged series is the mean of whatever was reporting, which the
        # browser can rebuild from the per-mission values. Shipping it as well
        # would be shipping the same numbers twice.
        del g["value"]

    coords = parse_station_list(fetch(PSMSL_LIST))

    for sid, name, country, why in GAUGES:
        if sid not in coords:
            die(f"station {sid} ({name}) is not in the PSMSL catalogue any more")
        lat, lon = coords[sid]
        series = parse_gauge(fetch(f"{PSMSL_DATA}/{sid}.rlrdata"), sid, name)
        out["gauges"].append(
            {"id": sid, "name": name, "country": country, "why": why, "lat": lat, "lon": lon, **series}
        )

    # Only rewrite if the DATA changed. The payload carries a build timestamp, so
    # a naive write produces a diff every run, the workflow's "nothing changed"
    # branch becomes dead code, and the repository collects a commit a month
    # whether or not anything was published upstream.
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
            pass

    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"written to {args.out}")
    print(f"  {len(out['time'])} samples {out['time'][0]:.2f} to {out['time'][-1]:.2f}")
    for key, g in out["global"].items():
        print(
            f"  {key}: "
            f"NOAA trend {g['publishedTrendMmPerYear']} mm/yr, "
            f"missions {', '.join(g['missions'])}"
        )
        for name, gapinfo in g["missionGaps"].items():
            print(
                f"    {name}: {len(out['missionIndex'][name])} samples, "
                f"{gapinfo['gaps']} time gap(s) over 36 days"
                + (f", largest {gapinfo['largestGapDays']:.0f} days" if gapinfo["gaps"] else "")
            )
        for o in g["overlaps"]:
            print(
                f"    overlap {o['missions'][0]} / {o['missions'][1]}: "
                f"{o['from']:.2f} to {o['to']:.2f}, {o['samples']} samples, "
                f"mean |diff| {o['meanAbsDifferenceMm']} mm, max {o['maxAbsDifferenceMm']} mm"
            )
    for g in out["gauges"]:
        usable = len([v for v in g["value"] if v is not None])
        print(f"  {g['name']:14s} {g['firstYear']}-{g['lastYear']} ({usable} years)")


if __name__ == "__main__":
    main()
