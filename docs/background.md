# Background

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
