# laravel-fleet

Stage-by-stage Laravel deploys to EC2 hosts over **AWS SSM Run Command**: no SSH, automatic rollback, and a halted rollout on the first failure.

- Built for one setup: Laravel on EC2 with PHP-FPM, Supervisor workers, and config in SSM Parameter Store ([background](docs/background.md)).
- Works with [laravel-ssm-config](https://github.com/jpaylaga/laravel-ssm-config) for the config side.

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

**4. Edit `fleet.config.json`**

```jsonc
{
  "region": "ap-southeast-1",
  "app": { "path": "/var/www/app", "fpmService": "php8.1-fpm", "workers": ["app-worker:*"] },
  "smoke": { "url": "http://127.0.0.1/health", "host": "app.example.com" },
  "targets": [
    { "name": "tenant-a", "instanceId": "i-0123456789abcdef0", "canary": true },
    { "name": "tenant-b", "instanceId": "i-0123456789abcdef1" }
  ]
}
```

- Every key and default: [docs/configuration.md](docs/configuration.md).

**5. Review, then deploy**

```bash
fleet plan v2.4.0      # print every script; touches nothing
fleet deploy v2.4.0
```

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

## Documentation

- [Background](docs/background.md): why it exists, limitations, the setup it targets
- [How it works](docs/how-it-works.md): each stage and the failure it prevents, rollout order
- [Configuration](docs/configuration.md): full example and every key
- [Use case](docs/use-case.md): shipping a release to three tenants, including a rollback
- [Where to run it](docs/where-to-run.md): local machine, GitHub Actions, Jenkins and others
- [Why SSM Parameter Store](docs/why-ssm.md): benefits and trade-offs versus `.env`
- [Server checklist](docs/server-checklist.md): what each host needs
- [Using it as a library](docs/library.md)
- [Development](docs/development.md): project layout, tests

## License

MIT
