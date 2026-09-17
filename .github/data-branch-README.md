# The `data` branch

High-churn data mirrors, kept out of `main` on purpose.

`main` is deployed. Every push to it produces a Vercel deployment whose whole
build output is then stored, so a file that changes four times a day was costing
four stored deployments a day for 550 kB of new numbers. This branch holds those
files instead, is **force-pushed on every refresh**, and therefore has exactly
one commit at any time and a history that never grows.

The app reads these over raw.githubusercontent.com, which sends
`Access-Control-Allow-Origin: *` and `Cache-Control: max-age=300`, and falls back
to the copy committed in `main` if that is unreachable. Nothing here needs a
credential beyond the `GITHUB_TOKEN` the workflows already have.

| file | source | refreshed |
| --- | --- | --- |
| `wind/current.json` | NOAA GFS 10 m wind, via `scripts/wind/fetch_wind.py` | every 6 hours |

Do not open pull requests against this branch and do not expect its history to
be meaningful. It is a bucket, not a record. The record is `main`.
