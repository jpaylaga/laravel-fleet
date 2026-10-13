import asAppUser from '../../shell/asAppUser.js';
import q from '../../shell/q.js';
import type { AppConfig } from '../../types.js';

export default function composerInstallLines(app: AppConfig): string[] {
  return [
    asAppUser(
      app,
      `env COMPOSER_HOME=${q(`${app.path}/.fleet/composer`)} ${q(app.composer)} install --no-dev --no-interaction --no-progress --prefer-dist --optimize-autoloader`,
    ),
  ];
}
