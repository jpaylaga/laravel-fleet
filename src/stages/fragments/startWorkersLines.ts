import q from '../../shell/q.js';
import type { AppConfig } from '../../types.js';

export default function startWorkersLines(app: AppConfig, strict: boolean): string[] {
  return app.workers.flatMap((w) => [
    `supervisorctl start ${q(w)} || true`,
    ...(strict
      ? [
          `for _ in $(seq 1 15); do status_out=$(supervisorctl status ${q(w)} || true); grep -qv 'RUNNING' <<<"$status_out" || break; sleep 2; done`,
          `if grep -qv 'RUNNING' <<<"$status_out"; then printf 'worker %s is not running:\\n%s\\n' ${q(w)} "$status_out" >&2; exit 1; fi`,
        ]
      : []),
  ]);
}
