# How it works

## Deploy stages

| Stage | Guards against |
| --- | --- |
| `preflight` | Overwriting a hotfix edited on the server; a deploy dying on a full disk |
| `maintenance-on` | Traffic arriving while workers and FPM restart (runs `artisan down` first) |
| `workers-stop` | A "verified" stop that wasn't (`supervisorctl status \| grep` under `pipefail`) |
| `fetch` | Deploying a stale local branch; no record of what to roll back to |
| `composer` | Root-owned files in `vendor/` breaking the next request |
| `migrate` | Hosts racing the same migration (only the first host migrates, alone) |
| `caches` | A config cache without its SSM values (deletes the old cache first) |
| `fpm-reload` | OPcache serving the old release |
| `workers-start` | Workers stuck in `BACKOFF` or `FATAL` going unnoticed |
| `smoke` | A broken release reaching users (checked through the maintenance bypass) |
| `maintenance-off` | |

- A failed stage rolls the host back to its previous SHA and brings it back up.
- The rollout then stops, so later hosts stay on the old release.
- Every script runs with `set -Eeuo pipefail`, quotes every value, and runs git/PHP/Composer as the app user.

## Rollout order

- **Wave 1:** the first host alone (it runs migrations)
- **Next:** remaining canaries, one at a time
- **Then:** everyone else, `concurrency` hosts per wave
