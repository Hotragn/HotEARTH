#!/usr/bin/env python3
"""Build the committed greenhouse-gas mirror for the Carbon tab.

    python scripts/carbon/fetch_carbon.py --out public/data/carbon/greenhouse-gases.json

Same reasoning as the climate mirror: NOAA GML does not send CORS headers, and a
monthly mean concentration is a STATE that gets revised slightly as flasks are
reanalysed, not a list of events. A mirror a few weeks old is still a correct
description of the atmosphere. (The earthquake tab refuses a mirror for the
opposite reason.)

THREE SERIES, chosen so the tab can say something the individual curves cannot:

  co2_mlo   Mauna Loa monthly CO2, 1958 onwards. The Keeling curve itself, and
            the longest direct record there is. At 19 N, downwind of the whole
            northern landmass, so its seasonal sawtooth is large.
  co2_glob  Globally averaged marine surface CO2, 1979 onwards. Averaging over
            both hemispheres largely cancels the seasonal cycle, because the
            northern and southern biospheres breathe in antiphase. Putting this
            next to Mauna Loa is how you SEE that the sawtooth is vegetation.
  ch4_glob  Globally averaged methane, 1983 onwards. A different gas with a
            different story: it stalled around 1999 to 2006 and then resumed.

Validation before anything is written, so a bad download fails loudly:

  - each series must start in its published first month
  - each must reach within a year of today
  - values must sit inside physically sane ranges (CO2 250-600 ppm,
    CH4 1500-2200 ppb)
  - the series must be strictly ordered in time with no duplicate months
  - NOAA's missing-data sentinels (-9.99, -0.99, -999.99) must be gone

SOURCE, public domain (US Government work), free to use with attribution:
  NOAA Global Monitoring Laboratory, Trends in Atmospheric Carbon Dioxide.
  Mauna Loa CO2 is a collaboration with Scripps, whose record Charles David
  Keeling began in 1958.
  https://gml.noaa.gov/ccgg/trends/
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime, timezone

BASE = "https://gml.noaa.gov/webdata/ccgg/trends"
SERIES = {
    "co2_mlo": {
        "url": f"{BASE}/co2/co2_mm_mlo.csv",
        "value": "average",
        "trend": "deseasonalized",
        "first": (1958, 3),
        "sane": (250.0, 600.0),
        "unit": "ppm",
    },
    "co2_glob": {
        "url": f"{BASE}/co2/co2_mm_gl.csv",
        "value": "average",
        "trend": "trend",
        "first": (1979, 1),
        "sane": (250.0, 600.0),
        "unit": "ppm",
    },
    "ch4_glob": {
        "url": f"{BASE}/ch4/ch4_mm_gl.csv",
        "value": "average",
        "trend": "trend",
        "first": (1983, 7),
        "sane": (1500.0, 2200.0),
        "unit": "ppb",
    },
}

TIMEOUT = 60
# NOAA writes missing values as these; anything at or below is not a measurement.
MISSING = -9.0


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "H.O.T-EARTH/carbon"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        if r.status != 200:
            raise SystemExit(f"{url} returned HTTP {r.status}")
        return r.read().decode("utf-8", errors="replace")


def parse(text: str, value_col: str, trend_col: str) -> list[dict]:
    """Read the CSV, skipping NOAA's '#' comment header block."""
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
    rows = list(csv.DictReader(lines))
    out: list[dict] = []
    for r in rows:
        try:
            year = int((r.get("year") or "").strip())
            month = int((r.get("month") or "").strip())
            value = float((r.get(value_col) or "").strip())
        except (TypeError, ValueError):
            continue
        if value <= MISSING:
            continue
        try:
            trend: float | None = float((r.get(trend_col) or "").strip())
            if trend <= MISSING:
                trend = None
        except (TypeError, ValueError):
            trend = None
        out.append({"year": year, "month": month, "value": value, "trend": trend})
    out.sort(key=lambda d: (d["year"], d["month"]))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    now = datetime.now(timezone.utc)
    payload_series = {}

    for name, spec in SERIES.items():
        rows = parse(fetch(spec["url"]), spec["value"], spec["trend"])
        if not rows:
            raise SystemExit(f"validation failed: {name} parsed to nothing")

        first = (rows[0]["year"], rows[0]["month"])
        if first != tuple(spec["first"]):
            raise SystemExit(
                f"validation failed: {name} starts at {first}, expected {tuple(spec['first'])}"
            )

        last = rows[-1]
        months_behind = (now.year - last["year"]) * 12 + (now.month - last["month"])
        if months_behind > 12:
            raise SystemExit(
                f"validation failed: {name} ends at {last['year']}-{last['month']:02d}, "
                f"{months_behind} months behind"
            )

        lo, hi = spec["sane"]
        bad = [r for r in rows if not (lo < r["value"] < hi)]
        if bad:
            raise SystemExit(
                f"validation failed: {name} has {len(bad)} values outside {lo}-{hi} "
                f"{spec['unit']}, first {bad[0]}"
            )

        seen = set()
        prev = None
        for r in rows:
            key = (r["year"], r["month"])
            if key in seen:
                raise SystemExit(f"validation failed: {name} has a duplicate month {key}")
            if prev and key <= prev:
                raise SystemExit(f"validation failed: {name} is out of order at {key}")
            seen.add(key)
            prev = key

        payload_series[name] = {
            "unit": spec["unit"],
            "years": [r["year"] for r in rows],
            "months": [r["month"] for r in rows],
            "value": [round(r["value"], 2) for r in rows],
            "trend": [(round(r["trend"], 2) if r["trend"] is not None else None) for r in rows],
        }
        print(
            f"  {name}: {rows[0]['year']}-{rows[0]['month']:02d} to "
            f"{last['year']}-{last['month']:02d} ({len(rows)} months), "
            f"latest {last['value']} {spec['unit']}"
        )

    payload = {
        "meta": {
            "title": "Atmospheric greenhouse gas concentrations, NOAA GML",
            "generated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "why_committed": (
                "NOAA GML does not send CORS headers, so the browser cannot read it "
                "directly. Mirroring is honest because a monthly mean concentration is a "
                "state that is revised slightly on reanalysis, not a list of events."
            ),
            "source": {
                "name": "NOAA Global Monitoring Laboratory, Trends in Atmospheric Carbon Dioxide",
                "url": "https://gml.noaa.gov/ccgg/trends/",
                "licence": "US Government work, public domain",
                "note": (
                    "Mauna Loa CO2 is a NOAA and Scripps collaboration; the record was "
                    "begun by Charles David Keeling in 1958 and is the longest direct "
                    "measurement of atmospheric CO2 in existence."
                ),
            },
            "series": {
                "co2_mlo": "Mauna Loa, 19.5 N. One station, downwind of the northern landmass, so its seasonal cycle is large.",
                "co2_glob": "Globally averaged marine surface. Averaging both hemispheres largely cancels the seasonal cycle.",
                "ch4_glob": "Globally averaged methane.",
            },
        },
        **payload_series,
    }

    # Only rewrite the file if the DATA changed.
    #
    # The payload carries a build timestamp, so a naive write produces a diff on
    # every run and the workflow's "nothing changed" branch becomes dead code:
    # the repository would collect a commit a month whether or not NOAA
    # published anything new. Comparing everything except the timestamp makes
    # that branch true again. The timestamp sits under "meta" here rather than at
    # the top level, so it is the meta block that has to be stripped.
    def without_timestamp(doc: dict) -> dict:
        meta = {k: v for k, v in doc.get("meta", {}).items() if k != "generated"}
        return {**{k: v for k, v in doc.items() if k != "meta"}, "meta": meta}

    if os.path.exists(args.out):
        try:
            with io.open(args.out, encoding="utf-8") as f:
                previous = json.load(f)
            if without_timestamp(previous) == without_timestamp(payload):
                print(f"{args.out} is already current; leaving it alone")
                return
        except (OSError, ValueError):
            pass  # unreadable or not JSON: write a fresh one

    with io.open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, separators=(",", ":"))
        f.write("\n")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    sys.exit(main())
