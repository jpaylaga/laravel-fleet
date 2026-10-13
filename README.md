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

## Getting started

**1. Prepare each host** (full list in [`docs/server-checklist.md`](docs/server-checklist.md))
- SSM agent running, plus an instance profile with `AmazonSSMManagedInstanceCore`.
- The app checked out with git at the same path on every host, owned by the app user.
- `.fleet/` added to the app's `.gitignore`.

**2. Grant deploy access**
- Attach [`docs/iam-policy.json`](docs/iam-policy.json) to whoever runs `fleet` (a person or a CI role).
- Tag each instance `laravel-fleet=true`, which is what that policy allows.

**3. Install and create the config**

```bash
npm install -g laravel-fleet    # Node.js 22.12+
fleet init                      # writes fleet.config.json in the current folder
```

## Config

`fleet.config.json`, usually committed next to the app (or kept in an ops repo):

```jsonc
{
  "region": "ap-southeast-1",
  "app": {
    "path": "/var/www/app",
    "user": "www-data",
    "fpmService": "php8.1-fpm",
    "workers": ["app-worker:*", "app-scheduler"]
  },
  "smoke": { "url": "http://127.0.0.1/health", "host": "app.example.com" },
  "concurrency": 2,
  "targets": [
    { "name": "tenant-a", "instanceId": "i-0123456789abcdef0", "canary": true },
    { "name": "tenant-b", "instanceId": "i-0123456789abcdef1" },
    { "name": "tenant-c", "instanceId": "i-0123456789abcdef2" }
  ]
}
```

| Key | Default | Meaning |
| --- | --- | --- |
| `region` | required | AWS region for targets without their own `region` |
| `app.path` | required | App directory on every host; each script runs `cd` there |
| `app.user` | `www-data` | User for git, PHP and Composer |
| `app.php` / `app.composer` | `php` / `composer` | Binaries on the host |
| `app.fpmService` | required | systemd unit to reload, e.g. `php8.1-fpm` |
| `app.workers` | `[]` | Supervisor programs to stop and start; `name:*` for groups |
| `app.migrate` | `true` | Run `migrate --force` on the first host |
| `app.caches` | all four | Which of `config`, `route`, `view`, `event` to rebuild |
| `maintenance.retryAfter` | `15` | `Retry-After` seconds while down |
| `smoke.url` | none | Health URL checked through the maintenance bypass; omit to skip |
| `smoke.host` | none | `Host` header, for nginx vhosts reached via `127.0.0.1` |
| `smoke.expectStatus` | `200` | Expected HTTP status |
| `concurrency` | `1` | Hosts per wave after the first host and canaries |
| `commandTimeoutSeconds` | `900` | Per-stage timeout |
| `targets[].name` | required | Label used in output and `-t` |
| `targets[].instanceId` | required | EC2 instance ID (no hostnames, no SSH) |
| `targets[].region` | `region` | Per-target override |
| `targets[].canary` | `false` | Deploy before the others, one at a time |

## Commands

```bash
fleet plan <ref>                # print every script; touches nothing
fleet deploy <ref> [--yes]      # deploy a branch, tag or SHA
fleet rollback [--yes]          # back to each host's previous release
fleet exec -- <command...>      # ad hoc command in app.path on every target
```

- `-c <path>`: another config file (default `fleet.config.json`).
- `-t a,b`: only these targets.
- `--` before an `exec` command that has its own flags (`-n`, `--force`).

## Use case: shipping a release to three tenants

**Setup:** the config above. Three tenants, each on its own EC2 host, `tenant-a` as the canary.

**1. Review what will run**

```bash
fleet plan v2.4.0 -t tenant-a
```

**2. Deploy**

```console
$ fleet deploy v2.4.0
Deploy v2.4.0 to tenant-a, tenant-b, tenant-c? [y/N] y
[tenant-a] ✓ preflight (2.1s)
[tenant-a] ✓ maintenance-on (1.8s)
...
[tenant-a] ✓ migrate (4.4s)
...
[tenant-a] ✗ smoke (1.5s)
smoke check failed: http://127.0.0.1/health returned 500
[tenant-a] ↺ rollback
[tenant-a] ✓ rollback (19.2s)
rolled back to 3f9c2e1 (was 8a41d07)
halted: tenant-a rolled-back at smoke; remaining hosts were not touched
```

- Only `tenant-a` was ever down, and only while in maintenance mode.
- `tenant-b` and `tenant-c` never left the previous release.
- The migration stays applied, so the fix must work with the new schema.

**3. Fix, tag, and deploy again**

```console
$ fleet deploy v2.4.1 --yes
...
┌─────────┬────────────┬────────────┐
│ (index) │ target     │ status     │
├─────────┼────────────┼────────────┤
│ 0       │ 'tenant-a' │ 'deployed' │
│ 1       │ 'tenant-b' │ 'deployed' │
│ 2       │ 'tenant-c' │ 'deployed' │
└─────────┴────────────┴────────────┘
```

- Order: `tenant-a` alone (migrates), then `tenant-b` and `tenant-c` together (`concurrency: 2`).

**4. Later, one tenant reports a problem**

```bash
fleet exec -t tenant-b -- tail -n 50 storage/logs/laravel.log
fleet rollback -t tenant-b
```

## Where to run it

**Local machine (no CI/CD yet)**
- Install globally and run from a laptop with AWS credentials (`AWS_PROFILE`, IAM Identity Center via `aws sso login`).
- Nothing to host: SSM does the remote work, so no bastion, VPN or open SSH port.
- Interactive confirmation before every deploy and rollback; `fleet plan` first to review the scripts.

**Deployment automation**
- Any CI/CD runner with Node.js and AWS credentials can run it; pass `--yes` to skip the prompt.
- **GitHub Actions:** OIDC role via `aws-actions/configure-aws-credentials`, no stored keys.
- **Jenkins:** an agent with an instance profile, or the Pipeline: AWS Steps plugin (`withAWS`).
- **Others:** GitLab CI, Bitbucket Pipelines, AWS CodeBuild, or a cron job on a build box.
- A non-zero exit code on any failed or rolled-back host fails the pipeline.

GitHub Actions example (manual trigger):

```yaml
on:
  workflow_dispatch:
    inputs:
      ref: { description: 'Branch, tag or SHA', required: true }

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/laravel-fleet-deployer
          aws-region: us-west-2
      - run: npx laravel-fleet deploy "$REF" --yes   # reads fleet.config.json from the repo
        env:
          REF: ${{ inputs.ref }}   # via env, not inline, to avoid script injection
```

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
