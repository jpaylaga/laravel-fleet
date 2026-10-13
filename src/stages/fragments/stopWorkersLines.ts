import q from '../../shell/q.js';
import type { AppConfig } from '../../types.js';

// Capture supervisorctl output before grepping it. `supervisorctl status | grep -q RUNNING`
// under pipefail reports failure whenever any process is not running (status exits 3),
// even when grep matched, so the check silently inverts.
export default function stopWorkersLines(app: AppConfig, strict: boolean): string[] {
  return app.workers.flatMap((w) => [
    `supervisorctl stop ${q(w)} || true`,
    ...(strict
      ? [
          `status_out=$(supervisorctl status ${q(w)} || true)`,
          `if grep -qE 'RUNNING|STOPPING|STARTING' <<<"$status_out"; then printf 'worker %s did not stop:\\n%s\\n' ${q(w)} "$status_out" >&2; exit 1; fi`,
        ]
      : []),
  ]);
}
