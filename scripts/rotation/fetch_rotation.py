#!/usr/bin/env python3
"""
Commit the Earth's rotation record as JSON.

WHAT THIS IS. Two things the IERS measures every day, and one table it maintains:

  LOD, the excess length of day. How much longer than 86,400 SI seconds the
  actual mean solar day was. It is usually a millisecond or two POSITIVE and has
  been as high as 4.4 ms. From 2020 to 2024 the annual mean went NEGATIVE, and
  the shortest day ever measured was 5 July 2024; over the last twelve measured
  months it is back to about +0.24 ms. Which way it is going THIS year is a
  question for the data rather than for this comment, and lib/rotation recomputes
  it on every load for exactly that reason.

  UT1-UTC. The gap between the Earth's own time and atomic time. It is kept
  inside 0.9 s by inserting leap seconds, and it is the accumulated integral of
  LOD: a millisecond a day is a third of a second a year.

  THE LEAP SECOND TABLE. Twenty-seven of them since 1972, every one positive,
  and none since the end of 2016, which is already the longest gap there has
  been. While the Earth was running fast the next one looked like it might have
  to be NEGATIVE, which has never been done; that prospect has receded over the
  past year. The parser below refuses to pass over a step that is not exactly
  +1 s, so if it ever does happen this script stops rather than shipping it
  quietly.

WHY TWO SOURCES. IERS publishes the definitive EOP 14 C04 series back to 1962,
and it lags by several months. It also publishes finals2000A, which is updated
weekly and carries predictions past the last measured day. This script takes the
definitive series wherever it exists and the weekly one after that, KEEPS THE
FLAG saying which is which, and refuses to write anything if the two disagree
where they overlap.

The two files also use different units for the same quantity: C04 gives LOD in
seconds, finals2000A gives it in milliseconds. The overlap check is what proves
the conversion, rather than a comment asserting it.

A NOTE ON SIZE. The daily record is 23,000 days and would be most of a megabyte.
Monthly means carry the long story and daily values carry the recent one, so the
payload keeps monthly for the whole record and daily for recent years only. The
record extremes are computed from every daily value BEFORE that thinning, so the
shortest day on record is the real shortest day and not the shortest survivor.

Sources
  https://datacenter.iers.org/data/csv/eopc04_14_IAU2000.62-now.csv
  https://datacenter.iers.org/data/csv/finals2000A.all.csv
  https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat
  International Earth Rotation and Reference Systems Service, Paris Observatory.
  Freely available with attribution.

Usage:
    python scripts/rotation/fetch_rotation.py --out public/data/rotation/rotation.json
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

C04_URL = "https://datacenter.iers.org/data/csv/eopc04_14_IAU2000.62-now.csv"
FINALS_URL = "https://datacenter.iers.org/data/csv/finals2000A.all.csv"
LEAP_URL = "https://hpiers.obspm.fr/iers/bul/bulc/Leap_Second.dat"

# Excess length of day, in milliseconds. The record maximum is about +4.4 ms and
# the minimum about -1.7 ms, so this brackets reality generously. Anything
# outside it is a parse or unit error, not a planet doing something new.
LOD_MIN_MS = -6.0
LOD_MAX_MS = 12.0

# UT1-UTC is held inside 0.9 s by definition; allow a little slack for the
# pre-1972 era before the rule existed.
UT1_LIMIT_S = 1.5

FIRST_YEAR = 1962
# How many recent years of DAILY values to keep in the payload.
DAILY_YEARS = 4


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


def num(s: str) -> float | None:
    try:
        return float(s.strip())
    except (ValueError, AttributeError):
        return None


def parse_eop(text: str, name: str, lod_scale: float) -> dict[str, dict]:
    """
    One IERS CSV into {iso date: {lod_ms, ut1_utc, kind}}.

    lod_scale converts the file's LOD column into milliseconds: 1000 for the C04
    series which publishes seconds, 1 for finals2000A which publishes
    milliseconds. The overlap check in main() is what verifies this rather than
    trusting the documentation.
    """
    rows = list(csv.reader(io.StringIO(text), delimiter=";"))
    if len(rows) < 2:
        die(f"{name}: no rows")
    header = rows[0]
    for want in ("Year", "Month", "Day", "UT1-UTC", "LOD"):
        if want not in header:
            die(f"{name}: no {want!r} column, layout changed")

    i_year = header.index("Year")
    i_month = header.index("Month")
    i_day = header.index("Day")
    i_ut1 = header.index("UT1-UTC")
    i_lod = header.index("LOD")
    # The block of Type columns: the one governing UT1 and LOD is the last Type
    # that appears BEFORE the UT1 column.
    type_cols = [i for i, h in enumerate(header) if h == "Type"]
    i_type = max((t for t in type_cols if t < i_ut1), default=None)

    out: dict[str, dict] = {}
    for row in rows[1:]:
        if len(row) <= max(i_lod, i_ut1):
            continue
        y, m, d = num(row[i_year]), num(row[i_month]), num(row[i_day])
        if y is None or m is None or d is None:
            continue
        lod = num(row[i_lod])
        ut1 = num(row[i_ut1])
        if lod is None and ut1 is None:
            continue
        try:
            date = dt.date(int(y), int(m), int(d))
        except ValueError:
            continue

        lod_ms = lod * lod_scale if lod is not None else None
        if lod_ms is not None and not (LOD_MIN_MS <= lod_ms <= LOD_MAX_MS):
            die(
                f"{name}: {date} LOD {lod_ms:.4f} ms outside {LOD_MIN_MS} to "
                f"{LOD_MAX_MS}, which usually means the unit scale is wrong"
            )
        if ut1 is not None and abs(ut1) > UT1_LIMIT_S:
            die(f"{name}: {date} UT1-UTC {ut1} s outside +/-{UT1_LIMIT_S}")

        kind = row[i_type].strip() if i_type is not None and len(row) > i_type else ""
        out[date.isoformat()] = {
            "lod_ms": lod_ms,
            "ut1_utc": ut1,
            "kind": kind or "final",
        }
    if not out:
        die(f"{name}: produced no usable rows")
    return out


def parse_leap_seconds(text: str) -> list[dict]:
    """IERS Leap_Second.dat: MJD, day month year, TAI-UTC."""
    entries: list[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 5:
            continue
        try:
            day, month, year = int(parts[1]), int(parts[2]), int(parts[3])
            tai_utc = int(float(parts[4]))
            date = dt.date(year, month, day)
        except (ValueError, IndexError):
            continue
        entries.append({"date": date.isoformat(), "taiMinusUtc": tai_utc})

    if len(entries) < 20:
        die(f"leap second table has only {len(entries)} entries, layout changed")
    entries.sort(key=lambda e: e["date"])

    # Every published step is exactly one second, and every one so far has been
    # POSITIVE. If a negative leap second is ever inserted this check will fire,
    # and it should be widened deliberately rather than silently, because the
    # whole tab is about that possibility.
    for a, b in zip(entries, entries[1:]):
        step = b["taiMinusUtc"] - a["taiMinusUtc"]
        if step != 1:
            die(
                f"leap second step of {step} s between {a['date']} and {b['date']}: "
                "the first non-positive or non-unit step in history, which this "
                "script deliberately refuses to pass over quietly"
            )
    return entries


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--daily-years", type=int, default=DAILY_YEARS)
    args = ap.parse_args()

    c04 = parse_eop(fetch(C04_URL), "EOP 14 C04", 1000.0)
    finals = parse_eop(fetch(FINALS_URL), "finals2000A", 1.0)

    # Where both series cover the same day they must agree. This is the check
    # that proves the unit conversion and that the two products are the same
    # measurement, and it is the reason this script can splice them at all.
    shared = [d for d in c04 if d in finals]
    if len(shared) < 1000:
        die(f"only {len(shared)} days overlap between the two series, expected decades")
    diffs: list[tuple[float, str]] = []
    for d in shared:
        a, b = c04[d]["lod_ms"], finals[d]["lod_ms"]
        if a is None or b is None:
            continue
        diffs.append((abs(a - b), d))
    if len(diffs) < 1000:
        die("too few comparable days between the two series")
    diffs.sort()
    median = diffs[len(diffs) // 2][0]
    p99 = diffs[int(len(diffs) * 0.99)][0]
    worst, worst_day = diffs[-1]
    loud = [d for v, d in diffs if v > 0.35]

    # The guard is on the DISTRIBUTION, not on the single worst day, and the
    # reason is worth recording. Measured over 19,362 shared days the two series
    # agree to a median of 0.015 ms and a 99th percentile of 0.19 ms, which is
    # excellent. Twenty-one days exceed 0.35 ms and every one of them is between
    # 1973 and 1989, when the measurements were far less precise; the single
    # worst, 1973-01-02 at 2.7 ms, is a filler zero in the weekly series rather
    # than a measurement at all.
    #
    # A max-only check therefore fails on one bad day in 1973 and tells you
    # nothing about whether the two products are the same quantity today. These
    # three checks do.
    if median > 0.05:
        die(f"median LOD disagreement {median:.4f} ms is too large to splice")
    if p99 > 0.3:
        die(f"99th percentile LOD disagreement {p99:.4f} ms is too large to splice")
    if len(loud) > len(diffs) * 0.005:
        die(
            f"{len(loud)} of {len(diffs)} shared days disagree by over 0.35 ms, "
            "which is more than the early-era noise this splice allows for"
        )

    # Definitive wherever it exists, weekly series after that.
    merged: dict[str, dict] = dict(c04)
    last_c04 = max(c04)
    for d, v in finals.items():
        if d > last_c04:
            merged[d] = v

    days = sorted(merged)
    if days[0][:4] != str(FIRST_YEAR):
        die(f"record starts {days[0]}, expected {FIRST_YEAR}")

    # ── extremes, from EVERY daily value, before any thinning ────────────────
    with_lod = [(d, merged[d]["lod_ms"]) for d in days if merged[d]["lod_ms"] is not None]
    shortest = min(with_lod, key=lambda x: x[1])
    longest = max(with_lod, key=lambda x: x[1])

    # ── monthly means for the whole record ───────────────────────────────────
    monthly: dict[str, list[float]] = {}
    for d, v in with_lod:
        monthly.setdefault(d[:7], []).append(v)
    months = sorted(monthly)
    monthly_out = {
        "month": months,
        "lodMs": [round(sum(monthly[m]) / len(monthly[m]), 4) for m in months],
        "days": [len(monthly[m]) for m in months],
    }

    # ── daily for recent years only ──────────────────────────────────────────
    cutoff = (dt.date.today() - dt.timedelta(days=365 * args.daily_years)).isoformat()
    recent = [d for d in days if d >= cutoff]
    daily_out = {
        "date": recent,
        "lodMs": [
            round(merged[d]["lod_ms"], 4) if merged[d]["lod_ms"] is not None else None
            for d in recent
        ],
        "ut1Utc": [
            round(merged[d]["ut1_utc"], 6) if merged[d]["ut1_utc"] is not None else None
            for d in recent
        ],
        "predicted": [merged[d]["kind"] != "final" for d in recent],
    }

    leaps = parse_leap_seconds(fetch(LEAP_URL))

    last_final = max((d for d in days if merged[d]["kind"] == "final"), default=days[-1])
    latest_ut1 = next(
        (merged[d]["ut1_utc"] for d in reversed(days) if merged[d]["ut1_utc"] is not None),
        None,
    )

    out = {
        "generated": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "credit": "Earth orientation data from the International Earth Rotation and Reference Systems Service (IERS), Paris Observatory.",
        "sources": {"definitive": C04_URL, "weekly": FINALS_URL, "leapSeconds": LEAP_URL},
        "definitiveThrough": last_c04,
        "lastFinal": last_final,
        "latestUt1Utc": latest_ut1,
        "taiMinusUtc": leaps[-1]["taiMinusUtc"],
        "overlapMedianDisagreementMs": round(median, 4),
        "overlapP99DisagreementMs": round(p99, 4),
        "overlapWorstDisagreementMs": round(worst, 4),
        "overlapWorstDay": worst_day,
        "overlapDays": len(diffs),
        "monthly": monthly_out,
        "daily": daily_out,
        "extremes": {
            "shortest": {"date": shortest[0], "lodMs": round(shortest[1], 4)},
            "longest": {"date": longest[0], "lodMs": round(longest[1], 4)},
        },
        "leapSeconds": leaps,
    }

    # Only rewrite if the DATA changed; the payload carries a build timestamp, so
    # a naive write would make the workflow's "nothing changed" branch dead code.
    if os.path.exists(args.out):
        try:
            with io.open(args.out, encoding="utf-8") as f:
                previous = json.load(f)
            if {k: v for k, v in previous.items() if k != "generated"} == {
                k: v for k, v in out.items() if k != "generated"
            }:
                print(f"{args.out} is already current; leaving it alone")
                return
        except (OSError, ValueError):
            pass

    with io.open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, separators=(",", ":"))

    print(f"written to {args.out}")
    print(f"  {len(days)} days, {days[0]} to {days[-1]}; definitive through {last_c04}")
    print(
        f"  overlap {len(diffs)} days: median {median:.4f} ms, p99 {p99:.4f} ms, "
        f"worst {worst:.4f} ms on {worst_day}"
    )
    print(f"  shortest day {shortest[0]} at {shortest[1]:+.4f} ms")
    print(f"  longest day  {longest[0]} at {longest[1]:+.4f} ms")
    print(f"  {len(months)} months, {len(recent)} daily values kept")
    print(f"  {len(leaps)} leap second entries, TAI-UTC now {leaps[-1]['taiMinusUtc']} s")
    print(f"  last one {leaps[-1]['date']}, UT1-UTC now {latest_ut1}")


if __name__ == "__main__":
    main()
