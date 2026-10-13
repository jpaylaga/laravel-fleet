# laravel-fleet

Deploy a Laravel app to a fleet of EC2 hosts, one stage at a time, over **AWS SSM Run Command**. No SSH, no agents of its own, and an automatic rollback when any stage fails.

```console
$ fleet deploy v2.4.0
[tenant-a] ✓ preflight (2.1s)
[tenant-a] ✓ maintenance-on (1.8s)
[tenant-a] ✓ workers-stop (6.3s)
[tenant-a] ✓ fetch (3.0s)
[tenant-a] ✓ composer (14.2s)
[tenant-a] ✓ migrate (4.4s)
[tenant-a] ✓ caches (5.1s)
[tenant-a] ✓ fpm-reload (1.6s)
[tenant-a] ✓ workers-start (3.9s)
[tenant-a] ✓ smoke (1.5s)
[tenant-a] ✓ maintenance-off (1.4s)
[tenant-b] ...
```

It is built for the setup a lot of Laravel teams actually run: several long-lived EC2 hosts (often one per tenant or region), PHP-FPM behind nginx, queue workers under Supervisor, and config pulled from SSM Parameter Store. Ad hoc deploy scripts for that setup tend to work until the day they half-fail. Each stage here exists because of one of those failures.

## Why each stage exists

| Stage | What it does | The failure it prevents |
| --- | --- | --- |
| `preflight` | Refuses a dirty working tree, checks disk space and tools | A hotfix edited in place on the server is silently overwritten, or a deploy dies halfway on a full disk |
| `maintenance-on` | `artisan down --secret=<random>` **before** stopping anything | Requests keep arriving while workers and FPM are restarting |
| `workers-stop` | Stops Supervisor programs and checks they actually stopped | `supervisorctl status \| grep -q RUNNING` under `pipefail` reports the wrong answer whenever any process is down, so a "verified" stop never was |
| `fetch` | Fetches, prefers `origin/<ref>`, checks out a detached SHA, records the previous SHA | A stale local branch is deployed; no record of what to roll back to |
| `composer` | `install --no-dev --optimize-autoloader` as the app user | Root-owned files in `vendor/` and caches break the next request |
| `migrate` | Runs **only on the first host**, which deploys alone | Several hosts racing the same migration; other hosts coming up on new code before the schema is ready |
| `caches` | Deletes `bootstrap/cache/config.php`, then rebuilds config, route, view and event caches | Apps that load SSM Parameter Store values at boot skip that lookup when a cached config exists, so the new cache ships without those values |
| `fpm-reload` | Graceful reload, then checks the service is active | OPcache keeps serving the old release |
| `workers-start` | Starts workers and waits until every one is `RUNNING` | Workers stuck in `BACKOFF` or `FATAL` go unnoticed until the queue backs up |
| `smoke` | Hits your health URL **through the maintenance bypass cookie** | A broken release reaches users; the check runs while the host is still down for everyone else |
| `maintenance-off` | `artisan up` | |

If a stage that changed something fails, the host runs the rollback script: back to the recorded SHA, `composer install`, rebuild caches, reload FPM, restart workers, `artisan up`. The deploy then **halts**, so the remaining hosts stay on the previous release. Migrations are never reversed (see [the server checklist](docs/server-checklist.md)).

Every command runs with `set -Eeuo pipefail`, every value is shell-quoted, and every git/PHP/Composer call runs as the app user (git refuses to work in a repo owned by someone else since 2.35.2).

## Rollout order

```
wave 1:  first host alone          ← runs migrations
wave 2+: remaining canaries, one at a time
then:    everyone else, `concurrency` hosts at a time
```

Any failure stops the rollout before the next wave.

## Install

```bash
npm install -g laravel-fleet
```

Requires Node.js 22.12+ and AWS credentials (any method the AWS SDK supports, e.g. `AWS_PROFILE`). Least-privilege policy: [`docs/iam-policy.json`](docs/iam-policy.json).

## Usage

```bash
fleet init                      # writes fleet.config.json
fleet plan v2.4.0               # prints every script a deploy would run; touches nothing
fleet deploy v2.4.0             # asks for confirmation; --yes in CI
fleet deploy main -t tenant-b   # only some targets
fleet rollback -t tenant-b      # back to each host's previous release
fleet exec php artisan about    # ad hoc command on every target, in parallel
```

## Config

```jsonc
{
  "region": "us-west-2",
  "app": {
    "path": "/var/www/app",
    "user": "www-data",
    "fpmService": "php8.3-fpm",
    "workers": ["app-worker:*", "app-scheduler"],   // Supervisor names; [] to skip
    "migrate": true,
    "caches": ["config", "route", "view", "event"]
  },
  "smoke": { "url": "http://127.0.0.1/up", "host": "app.example.com" },  // optional
  "concurrency": 2,
  "targets": [
    { "name": "tenant-a", "instanceId": "i-0123456789abcdef0", "canary": true },
    { "name": "tenant-b", "instanceId": "i-0123456789abcdef1" },
    { "name": "tenant-c", "instanceId": "i-0123456789abcdef2", "region": "ap-southeast-1" }
  ]
}
```

The full schema with defaults is in [`src/config/configSchema.ts`](src/config/configSchema.ts). Check [the server checklist](docs/server-checklist.md) before the first deploy.

## As a library

```ts
import { createSsmRunner, deploy, loadConfig } from 'laravel-fleet';

const config = await loadConfig('fleet.config.json');
const outcomes = await deploy({
  config,
  ref: 'v2.4.0',
  runner: createSsmRunner({ defaultRegion: config.region }),
  onEvent: (e) => console.log(e),
});
```

Stages are plain objects (`{ name, mutates, script(ctx) }`), so you can pass your own list to `deploy({ stages })`. `Runner` is a one-method interface if you need something other than SSM.

## Project layout

One default export per file, named after the file. `deploy` reads as the orchestration; everything it calls is a small, separately testable step.

```
src/
  cli.ts                 bin entry: wires the commands below
  index.ts               public API
  types.ts               every shared type
  config/                configSchema, parseConfig, loadConfig, selectTargets, assertValidRef
  shell/                 q, bashScript, asAppUser, artisan, git
  stages/                one file per stage, in deployStages order; rollbackScript
  stages/fragments/      bash snippets shared by stages and the rollback
  runners/               createPrintRunner, createSsmRunner (+ ssm/sendScript, ssm/waitForInvocation)
  orchestration/         deploy -> planWaves -> deployWave -> deployHost -> runStage / rollbackHost
  cli/                   resolveContext, confirm, printEvent, printOutcomes, commands/*
```

## How it runs commands

`AWS-RunShellScript` runs under `/bin/sh`, which on Ubuntu is dash: no `pipefail`, no here-strings. Each script is sent base64-encoded and executed with `bash -c`, then the CLI polls `GetCommandInvocation` until it finishes.

## Development

```bash
npm ci
npm test          # unit tests, including `bash -n` on every generated script
npm run typecheck
npm run build
```

## License

MIT
