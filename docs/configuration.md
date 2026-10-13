# Configuration

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
