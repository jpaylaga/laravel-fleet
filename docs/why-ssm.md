# Why SSM Parameter Store instead of `.env`

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
