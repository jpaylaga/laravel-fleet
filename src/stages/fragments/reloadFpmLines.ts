import q from '../../shell/q.js';
import type { AppConfig } from '../../types.js';

// reload (SIGUSR2) is graceful only when process_control_timeout is set in php-fpm.conf;
// with the default of 0, in-flight requests are killed. See docs/server-checklist.md.
export default function reloadFpmLines(app: AppConfig): string[] {
  return [`systemctl reload ${q(app.fpmService)}`, `systemctl is-active --quiet ${q(app.fpmService)}`];
}
