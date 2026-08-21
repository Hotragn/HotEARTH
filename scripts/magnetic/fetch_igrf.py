#!/usr/bin/env python3
"""
Commit the IGRF-14 spherical harmonic coefficients as JSON.

WHY THIS IS A MIRROR AND NOT A FETCH, and why that is not the same decision as
the climate or carbon tabs. Those two mirror a STATE that is revised as new
observations arrive. This file is not revised at all: a generation of the
International Geomagnetic Reference Field is a FROZEN PUBLICATION. IGRF-14 was
released in November 2024, covers 1900 to 2030, and its numbers will never
change; IGRF-15 will be a different file with a different name. So there is
nothing to poll, no cron, and no staleness risk. The right cadence for a
document that cannot change is: fetch it once, commit it, cite it.

What the numbers are: Gauss coefficients g(n,m) and h(n,m) in nanotesla, to
degree and order 13, at 5-year epochs from 1900.0 to 2025.0, plus a secular
variation column in nT/year used to carry the field forward from 2025 to 2030.
Degree 13 means the shortest wavelength the model can describe is roughly 3,000
km, which is the single most important limitation of this tab and is stated on
screen: the crustal field, which is what actually deflects a compass needle in a
basalt outcrop, is entirely absent by construction.

Source: https://www.ngdc.noaa.gov/IAGA/vmod/coeffs/igrf14coeffs.txt
IAGA Working Group V-MOD. Produced by an international collaboration and
distributed by NOAA NCEI. Free to use with attribution.

Usage:
    python scripts/magnetic/fetch_igrf.py --out public/data/magnetic/igrf14.json
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.request

URL = "https://www.ngdc.noaa.gov/IAGA/vmod/coeffs/igrf14coeffs.txt"

# Degree 13 means sum over n of (2n+1) coefficients, n = 1..13.
EXPECTED_ROWS = sum(2 * n + 1 for n in range(1, 14))  # 195
MAX_DEGREE = 13
# Secular variation is published only to degree 8.
SV_MAX_DEGREE = 8


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(1)


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "H.O.T-EARTH/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        if r.status != 200:
            die(f"{url} returned HTTP {r.status}")
        return r.read().decode("utf-8", errors="replace")


def parse(text: str) -> dict:
    lines = [ln.rstrip("\n") for ln in text.splitlines() if ln.strip()]

    header = None
    rows: list[list[str]] = []
    for ln in lines:
        if ln.startswith("#"):
            continue
        parts = ln.split()
        if parts[0] == "c/s":
            continue
        if parts[0] == "g/h":
            header = parts
            continue
        if parts[0] in ("g", "h"):
            rows.append(parts)

    if header is None:
        die("no 'g/h n m ...' header row: the file layout changed")
    if len(rows) != EXPECTED_ROWS:
        die(f"expected {EXPECTED_ROWS} coefficient rows for degree 13, found {len(rows)}")

    # header is: g/h n m <epoch> ... <epoch> <sv label like 2025-30>
    epoch_tokens = header[3:]
    if len(epoch_tokens) < 3:
        die("header has too few epoch columns")
    sv_label = epoch_tokens[-1]
    if "-" not in sv_label:
        die(f"last header column {sv_label!r} does not look like a secular variation range")

    try:
        epochs = [float(t) for t in epoch_tokens[:-1]]
    except ValueError:
        die(f"could not read epochs from {epoch_tokens[:-1]}")

    # ---- structural checks on the epochs ----
    if epochs[0] != 1900.0:
        die(f"first epoch is {epochs[0]}, expected 1900.0")
    for a, b in zip(epochs, epochs[1:]):
        if abs((b - a) - 5.0) > 1e-9:
            die(f"epochs are not on a 5-year grid: {a} then {b}")
    n_epochs = len(epochs)

    # ---- the coefficients themselves ----
    # Stored as a flat array per epoch in the canonical Schmidt ordering
    # (n=1..13, and for each n: g(n,0), g(n,1), h(n,1), ... g(n,n), h(n,n)) so
    # the browser can walk it in the same order the synthesis needs, without
    # doing lookups per point.
    index: dict[tuple[str, int, int], list[float]] = {}
    sv: dict[tuple[str, int, int], float] = {}

    for parts in rows:
        kind = parts[0]
        n = int(parts[1])
        m = int(parts[2])
        if not (1 <= n <= MAX_DEGREE) or not (0 <= m <= n):
            die(f"coefficient {kind}({n},{m}) is out of range for degree {MAX_DEGREE}")
        if kind == "h" and m == 0:
            die("h(n,0) should not exist: it is identically zero by definition")
        values = parts[3:]
        if len(values) != n_epochs + 1:
            die(f"{kind}({n},{m}) has {len(values)} values, expected {n_epochs + 1}")
        try:
            nums = [float(v) for v in values]
        except ValueError:
            die(f"non-numeric value in {kind}({n},{m})")
        index[(kind, n, m)] = nums[:-1]
        sv[(kind, n, m)] = nums[-1]

    order: list[tuple[str, int, int]] = []
    for n in range(1, MAX_DEGREE + 1):
        order.append(("g", n, 0))
        for m in range(1, n + 1):
            order.append(("g", n, m))
            order.append(("h", n, m))

    missing = [k for k in order if k not in index]
    if missing:
        die(f"missing coefficients: {missing[:5]}")
    if len(order) != EXPECTED_ROWS:
        die("internal ordering error")

    # per-epoch flat arrays
    by_epoch = [[index[k][e] for k in order] for e in range(n_epochs)]
    sv_flat = [sv[k] for k in order]

    # ---- physical checks, so a mangled parse cannot pass quietly ----
    # g(1,0) is the axial dipole. It is NEGATIVE, which is the whole reason a
    # compass needle's north end points north: the Earth's field behaves like a
    # bar magnet with its SOUTH pole in the northern hemisphere.
    g10 = [index[("g", 1, 0)][e] for e in range(n_epochs)]
    if any(v >= 0 for v in g10):
        die("g(1,0) is not negative in every epoch, which would invert the field")
    if not all(28000 <= abs(v) <= 32000 for v in g10):
        die(f"g(1,0) magnitudes out of the historical range: {min(map(abs, g10))} to {max(map(abs, g10))}")
    # The axial dipole has weakened in every published epoch since 1900. This is
    # a real, well documented decline, so if it ever stops being monotonic in a
    # future generation this check should be revisited rather than deleted.
    if not all(abs(b) < abs(a) for a, b in zip(g10, g10[1:])):
        die("g(1,0) is not monotonically weakening, which contradicts the published record")

    # Secular variation is published to degree 8 only; higher degrees must be 0.
    for (kind, n, m), v in sv.items():
        if n > SV_MAX_DEGREE and v != 0.0:
            die(f"secular variation {kind}({n},{m}) = {v} above degree {SV_MAX_DEGREE}")
    if all(v == 0.0 for v in sv_flat):
        die("every secular variation value is zero: the last column was misread")

    return {
        "source": URL,
        "model": "IGRF-14",
        "credit": "IAGA Working Group V-MOD, distributed by NOAA NCEI",
        "maxDegree": MAX_DEGREE,
        "svMaxDegree": SV_MAX_DEGREE,
        "epochs": epochs,
        # validity: the last epoch plus the five years the SV column covers
        "validFrom": epochs[0],
        "validTo": epochs[-1] + 5.0,
        "order": [f"{k}{n},{m}" for (k, n, m) in order],
        "coeffs": by_epoch,
        "sv": sv_flat,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--url", default=URL)
    ap.add_argument("--local", help="read from a local file instead of the network")
    args = ap.parse_args()

    text = open(args.local, encoding="utf-8").read() if args.local else fetch(args.url)
    data = parse(text)

    with open(args.out, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, separators=(",", ":"))

    print(f"{data['model']} written to {args.out}")
    print(
        f"  {len(data['coeffs'])} epochs {data['epochs'][0]:.0f} to {data['epochs'][-1]:.0f}"
        f", valid to {data['validTo']:.0f}"
    )
    print(f"  {len(data['order'])} coefficients per epoch, degree {data['maxDegree']}")
    g10 = [e[0] for e in data["coeffs"]]
    print(f"  axial dipole g(1,0): {g10[0]:.1f} nT in 1900 to {g10[-1]:.1f} nT in {data['epochs'][-1]:.0f}")


if __name__ == "__main__":
    main()
