# Server checklist

What each host needs before `fleet deploy` will work, and the settings that make a deploy safe.

## Required

- **SSM agent running** and an instance profile with `AmazonSSMManagedInstanceCore`. No inbound SSH is needed.
- **Tag** the instance `laravel-fleet=true` if you use [`iam-policy.json`](iam-policy.json) as written.
- **The app is a git checkout** owned by the app user (default `www-data`), with an `origin` remote the host can fetch from (deploy key or HTTPS token).
- **`.fleet/` in the app's `.gitignore`.** laravel-fleet keeps its release markers there (`current`, `previous`, `rollback-to`) plus a Composer home.
- `bash`, `sudo`, `curl` (for the smoke check), `composer`, and `supervisorctl` if you list workers.

## PHP-FPM: set `process_control_timeout`

`systemctl reload php-fpm` sends SIGUSR2. FPM then waits up to `process_control_timeout` for each child to finish its request. The default is `0`, which means children are killed mid-request.

```ini
; /etc/php/8.3/fpm/php-fpm.conf
process_control_timeout = 30s
```

## Supervisor workers

- Set `stopwaitsecs` at least as long as your longest job, so `workers-stop` lets jobs finish instead of killing them.
- List program names exactly as `supervisorctl status` shows them. Groups work with `name:*`.

## Laravel

- A health route for the smoke check. Laravel 11+ ships `/up`; point `smoke.url` at it through the local web server (`http://127.0.0.1/up` plus `smoke.host` if nginx routes on the Host header).
- Migrations must work with the release before them. Hosts deploy one wave at a time, so old code runs against the new schema until the last wave finishes. Rollback never reverses migrations.
