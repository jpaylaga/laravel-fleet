# Use case: shipping a release to three tenants

**Setup:** the [example config](configuration.md). Three tenants, each on its own EC2 host, `tenant-a` as the canary.

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
