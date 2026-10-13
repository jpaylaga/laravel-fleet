# laravel-fleet

Stage-by-stage Laravel deploys to EC2 hosts over **AWS SSM Run Command**: no SSH, automatic rollback, and a halted rollout on the first failure.

## Background

**Why it exists**
- I maintain a multi-tenant Laravel platform where each tenant runs on its own EC2 host.
- Releases go out with SSH and hand-written bash scripts, host by host.
- Those scripts kept failing in the same few ways: a worker stop that was never verified, a config cache built without its SSM values, a half-deployed host with no clean way back.
- This project turns those lessons into a single tool, with each failure covered by a stage or a guard.

**How it is used**
- `fleet plan <ref>` prints every script that would run, for review before a release.
- `fleet deploy <ref>` ships the release: the canary tenant first, then the rest in small waves.
- `fleet rollback` returns hosts to their previous release.
- `fleet exec` runs ad hoc checks (`php artisan about`, disk, versions) across every host.

**Limitations**
- Built around one specific setup (below), not a general-purpose deployer.
- Assumes a git checkout on each host, PHP-FPM under systemd, and Supervisor for workers.
- No support for containers, Envoyer-style release folders, or load-balancer draining.
- Migrations are forward-only: rollback restores code, never the schema.
- Fork it or pass your own `stages` if your setup differs.

## The setup it targets

- **Compute:** EC2 on Ubuntu, one host per tenant
- **App:** Laravel 9 on PHP 8.1, nginx + PHP-FPM
- **Background work:** Laravel queue workers and scheduler under Supervisor
- **Database:** Amazon Aurora MySQL (Serverless v2)
- **Cache and queues:** Redis, on-host and Amazon ElastiCache
- **Config and secrets:** AWS SSM Parameter Store, loaded at boot
- **Realtime:** Soketi (self-hosted, Pusher-compatible WebSockets)
- **DNS:** Amazon Route 53
- **Monitoring:** Prometheus + Grafana
- **Access:** AWS IAM Identity Center

## Why SSM Parameter Store instead of `.env`

**Benefits**
- **One source of truth:** a value changes once with `put-parameter`, not by SSHing into every host to edit `.env`. Hosts can't drift apart.
- **Secrets off disk:** a `.env` ends up in AMIs, EBS snapshots, backups and archives. SecureString values are KMS-encrypted and fetched at runtime.
- **Per-tenant access:** each instance profile can read only its own path (e.g. `/app/tenant-a/*`), so one compromised host can't read another tenant's secrets.
- **Audit trail:** CloudTrail records who read or changed what, and when.
- **Version history:** every parameter keeps its past versions, so a bad change can be traced and reverted.
- **Rotation:** rotate a password in one place; hosts pick it up on the next cache rebuild.
- **Clean bootstrap:** a new host needs only its instance profile, with no `.env` to copy over.

**Trade-offs**
- **Slow, rate-limited reads:** fetching on every request isn't viable, so config must be cached. That cache is what the `caches` stage rebuilds safely.
- **Not live:** changes apply only after a re-cache on each host.
- **Two paths:** local development still uses `.env`.
- **Deploy-time dependency:** if the SSM API is down or throttling, the config cache can't be rebuilt.

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

## Usage

```bash
npm install -g laravel-fleet    # Node.js 22.12+, AWS credentials via any SDK method

fleet init                      # writes fleet.config.json
fleet plan v2.4.0               # print every script; touches nothing
fleet deploy v2.4.0             # confirm, then deploy (--yes in CI)
fleet deploy main -t tenant-b   # only some targets
fleet rollback -t tenant-b      # previous release
fleet exec php artisan about    # ad hoc command on every target
```

- **Config:** see [`examples/fleet.config.json`](examples/fleet.config.json); schema and defaults in [`src/config/configSchema.ts`](src/config/configSchema.ts).
- **Host requirements:** [`docs/server-checklist.md`](docs/server-checklist.md).
- **IAM:** least-privilege policy in [`docs/iam-policy.json`](docs/iam-policy.json).

## As a library

```ts
import { createSsmRunner, deploy, loadConfig } from 'laravel-fleet';

const config = await loadConfig('fleet.config.json');
await deploy({ config, ref: 'v2.4.0', runner: createSsmRunner({ defaultRegion: config.region }) });
```

- Stages are plain `{ name, mutates, script(ctx) }` objects; pass your own via `deploy({ stages })`.
- `Runner` is a one-method interface if you need something other than SSM.

## Project layout

- One default export per file, named after the file.
- `deploy` reads as the orchestration: `planWaves` → `deployWave` → `deployHost` → `runStage` / `rollbackHost`.

```
src/
  config/              configSchema, parseConfig, loadConfig, selectTargets, assertValidRef
  shell/               q, bashScript, asAppUser, artisan, git
  stages/              one file per stage, deployStages, rollbackScript
  stages/fragments/    bash snippets shared by stages and rollback
  runners/             createPrintRunner, createSsmRunner
  orchestration/       deploy, planWaves, deployWave, deployHost, runStage, rollbackHost
  cli/                 commands and output
  types.ts             shared types
```

## Development

```bash
npm ci && npm test && npm run typecheck && npm run build
```

- Tests include `bash -n` on every generated script.

## License

MIT
