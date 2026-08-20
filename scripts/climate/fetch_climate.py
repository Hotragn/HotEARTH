#!/usr/bin/env python3
"""Build the committed global-temperature mirror for the Climate tab.

    python scripts/climate/fetch_climate.py --out public/data/climate/global-temperature.json

WHY THIS IS COMMITTED, unlike the earthquake and air feeds.

Neither source sends CORS headers, so a browser cannot read them directly. That
forced the question of whether mirroring is honest here, and it is: an annual
global mean temperature is a STATE, not an event. It is revised monthly, moves
by hundredths of a degree, and a mirror that is a few weeks old is still a
correct description of the climate. A stale list of earthquakes, by contrast,
is a lie about what is happening right now, which is why that tab refuses to
keep one.

Both series are validated before anything is written, so a bad download fails
loudly instead of committing garbage:

  - GISTEMP must start in 1880 and HadCRUT5 in 1850
  - both must reach at least the previous calendar year
  - anomalies must be inside a physically sane -3 to +3 C
  - each series must average to ZERO over the baseline it claims, which is
    what an anomaly means, and is what caught HadCRUT5 being on 1850-1900
    rather than the 1961-1990 normal this script first assumed

SOURCES, both free to use with attribution:
  NASA GISS Surface Temperature Analysis (GISTEMP v4), a US Government work in
  the public domain. Baseline 1951-1980.
  https://data.giss.nasa.gov/gistemp/

  Met Office Hadley Centre / UEA CRU HadCRUT5, Open Government Licence v3.
  This formatted product is published against 1850-1900, the IPCC
  pre-industrial reference, NOT the 1961-1990 normal that raw HadCRUT5 uses.
  That is exactly the confusion this tab exists to expose, and it is verified
  below rather than trusted: each series must be zero-mean over the baseline it
  claims, which is what "anomaly relative to X" means. It also publishes a
  per-year uncertainty, carried through here.
  https://www.metoffice.gov.uk/hadobs/hadcrut5/
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
from datetime import datetime, timezone

GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
HADCRUT_URL = "https://climate.metoffice.cloud/formatted_data/gmt_HadCRUT5.csv"

TIMEOUT = 60
SANE_MIN, SANE_MAX = -3.0, 3.0


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "H.O.T-EARTH/climate"})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        if r.status != 200:
            raise SystemExit(f"{url} returned HTTP {r.status}")
        return r.read().decode("utf-8", errors="replace")


def parse_gistemp(text: str) -> dict[int, float]:
    """Annual (J-D) anomalies. Missing months are '***' and are skipped."""
    rows = list(csv.reader(io.StringIO(text)))
    header_idx = next(i for i, r in enumerate(rows) if r and r[0].strip() == "Year")
    header = [c.strip() for c in rows[header_idx]]
    jd = header.index("J-D")
    out: dict[int, float] = {}
    for r in rows[header_idx + 1 :]:
        if not r or not r[0].strip().isdigit():
            continue
        raw = r[jd].strip()
        if not raw or raw.startswith("*"):
            continue  # the current year until December is in
        try:
            out[int(r[0])] = float(raw)
        except ValueError:
            continue
    return out


def parse_hadcrut(text: str) -> dict[int, tuple[float, float | None]]:
    """Annual anomalies with the published uncertainty."""
    out: dict[int, tuple[float, float | None]] = {}
    for row in csv.DictReader(io.StringIO(text)):
        year = (row.get("Year") or "").strip()
        if not year.isdigit():
            continue
        val = (row.get("HadCRUT5 (degC)") or "").strip()
        unc = (row.get("HadCRUT5 uncertainty") or "").strip()
        try:
            v = float(val)
        except ValueError:
            continue
        try:
            u: float | None = float(unc)
        except ValueError:
            u = None
        out[int(year)] = (v, u)
    return out


def mean_over(series: dict[int, float], lo: int, hi: int) -> float:
    vals = [series[y] for y in range(lo, hi + 1) if y in series]
    if not vals:
        raise SystemExit(f"no data in the {lo}-{hi} baseline window")
    return sum(vals) / len(vals)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    gistemp = parse_gistemp(fetch(GISTEMP_URL))
    hadcrut_pairs = parse_hadcrut(fetch(HADCRUT_URL))
    hadcrut = {y: v for y, (v, _) in hadcrut_pairs.items()}

    # ---- validate before writing anything -------------------------------
    last_full_year = datetime.now(timezone.utc).year - 1
    checks = [
        (min(gistemp) == 1880, f"GISTEMP starts at {min(gistemp)}, expected 1880"),
        (min(hadcrut) == 1850, f"HadCRUT5 starts at {min(hadcrut)}, expected 1850"),
        (max(gistemp) >= last_full_year, f"GISTEMP ends at {max(gistemp)}, expected {last_full_year} or later"),
        (max(hadcrut) >= last_full_year, f"HadCRUT5 ends at {max(hadcrut)}, expected {last_full_year} or later"),
        (len(gistemp) > 140, f"GISTEMP has only {len(gistemp)} years"),
        (len(hadcrut) > 170, f"HadCRUT5 has only {len(hadcrut)} years"),
    ]
    for ok, msg in checks:
        if not ok:
            raise SystemExit(f"validation failed: {msg}")

    for name, series in (("GISTEMP", gistemp), ("HadCRUT5", hadcrut)):
        bad = {y: v for y, v in series.items() if not (SANE_MIN < v < SANE_MAX)}
        if bad:
            raise SystemExit(f"validation failed: {name} has implausible anomalies {bad}")
        mean_over(series, 1961, 1990)  # the tab rebases onto this; it must exist

    # The sharpest check available, and it has already caught one real error.
    # "Anomaly relative to X" MEANS the series averages to zero over X, so if a
    # source quietly changes its reference period this fails loudly instead of
    # mislabelling every number on the page. The first version of this script
    # asserted HadCRUT5 was on 1961-1990; it is published against 1850-1900, and
    # this check is what found that.
    for name, series, lo, hi in (
        ("GISTEMP", gistemp, 1951, 1980),
        ("HadCRUT5", hadcrut, 1850, 1900),
    ):
        m = mean_over(series, lo, hi)
        if abs(m) > 0.02:
            raise SystemExit(
                f"validation failed: {name} averages {m:+.3f} over its declared "
                f"{lo}-{hi} baseline, so that is not the baseline it is on"
            )

    payload = {
        "meta": {
            "title": "Global mean surface temperature anomaly, two independent analyses",
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "why_committed": (
                "Neither source sends CORS headers, so the browser cannot read them "
                "directly. Mirroring is honest here because an annual global mean is a "
                "state that is revised monthly, not a list of events: a mirror a few "
                "weeks old is still a correct description of the climate."
            ),
            "sources": {
                "gistemp": {
                    "name": "NASA GISS Surface Temperature Analysis (GISTEMP v4)",
                    "url": GISTEMP_URL,
                    "licence": "US Government work, public domain",
                    "baseline": "1951-1980",
                    "note": "Land-ocean index. Interpolates into the Arctic, which is the main reason it and HadCRUT5 differ in recent decades.",
                },
                "hadcrut5": {
                    "name": "Met Office Hadley Centre / UEA CRU HadCRUT5",
                    "url": HADCRUT_URL,
                    "licence": "Open Government Licence v3",
                    "baseline": "1850-1900",
                    "note": "This formatted product is published against 1850-1900, the IPCC pre-industrial reference, not the 1961-1990 normal raw HadCRUT5 uses. Verified by checking the series averages to zero over the baseline it claims. Publishes a per-year uncertainty, carried through here.",
                },
            },
        },
        "gistemp": {
            "baseline": [1951, 1980],
            "years": sorted(gistemp),
            "anomaly": [round(gistemp[y], 4) for y in sorted(gistemp)],
        },
        "hadcrut5": {
            "baseline": [1850, 1900],
            "years": sorted(hadcrut_pairs),
            "anomaly": [round(hadcrut_pairs[y][0], 4) for y in sorted(hadcrut_pairs)],
            "uncertainty": [
                (round(hadcrut_pairs[y][1], 4) if hadcrut_pairs[y][1] is not None else None)
                for y in sorted(hadcrut_pairs)
            ],
        },
    }

    with io.open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(payload, f, indent=1)
        f.write("\n")

    print(
        f"wrote {args.out}: GISTEMP {min(gistemp)}-{max(gistemp)} ({len(gistemp)} yr), "
        f"HadCRUT5 {min(hadcrut)}-{max(hadcrut)} ({len(hadcrut)} yr)"
    )


if __name__ == "__main__":
    sys.exit(main())
