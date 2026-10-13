import artisan from '../../shell/artisan.js';
import asAppUser from '../../shell/asAppUser.js';
import type { AppConfig } from '../../types.js';

export default function rebuildCachesLines(app: AppConfig): string[] {
  const lines: string[] = [];
  if (app.caches.includes('config')) {
    // Remove the cached config before rebuilding it. Apps that pull values from SSM
    // Parameter Store at boot skip that lookup when a cached config exists, so
    // config:cache on top of a stale file can bake in a config without those values.
    lines.push(asAppUser(app, 'rm -f bootstrap/cache/config.php'));
  }
  for (const kind of ['config', 'route', 'view', 'event'] as const) {
    if (app.caches.includes(kind)) lines.push(artisan(app, `${kind}:cache`));
  }
  return lines;
}
