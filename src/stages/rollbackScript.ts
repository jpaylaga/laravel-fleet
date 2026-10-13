import artisan from '../shell/artisan.js';
import asAppUser from '../shell/asAppUser.js';
import bashScript from '../shell/bashScript.js';
import git from '../shell/git.js';
import q from '../shell/q.js';
import type { FleetConfig, RollbackMarker } from '../types.js';
import composerInstallLines from './fragments/composerInstallLines.js';
import rebuildCachesLines from './fragments/rebuildCachesLines.js';
import reloadFpmLines from './fragments/reloadFpmLines.js';
import startWorkersLines from './fragments/startWorkersLines.js';
import stopWorkersLines from './fragments/stopWorkersLines.js';

/**
 * Restores the commit named in `.fleet/<marker>` and brings the app back up.
 * Safe to run at any point of a failed deploy: when the checkout never moved, it only
 * rebuilds caches and restarts what the deploy stopped. Migrations are never reversed.
 */
export default function rollbackScript(config: FleetConfig, secret: string, marker: RollbackMarker): string {
  const app = config.app;
  return bashScript(config, [
    `${artisan(app, `down --retry=${config.maintenance.retryAfter} --secret=${q(secret)}`)} || true`,
    ...stopWorkersLines(app, false),
    `if [ -s .fleet/${marker} ]; then`,
    `  to=$(cat .fleet/${marker})`,
    `  cur=$(${git(app, 'rev-parse HEAD')})`,
    `  if [ "$to" != "$cur" ]; then`,
    `    ${git(app, '-c advice.detachedHead=false checkout --detach "$to"')}`,
    `    printf '%s\\n' "$cur" | ${asAppUser(app, 'tee .fleet/previous')} >/dev/null`,
    `    printf '%s\\n' "$to" | ${asAppUser(app, 'tee .fleet/current')} >/dev/null`,
    ...composerInstallLines(app).map((l) => `    ${l}`),
    `    echo "rolled back to $to (was $cur)"`,
    '  fi',
    'fi',
    ...rebuildCachesLines(app),
    ...reloadFpmLines(app),
    ...startWorkersLines(app, false),
    artisan(app, 'up'),
    asAppUser(app, 'rm -f .fleet/rollback-to'),
  ]);
}
