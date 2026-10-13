import artisan from '../shell/artisan.js';
import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';

const migrate: Stage = {
  name: 'migrate',
  mutates: true,
  script: ({ config, runMigrations }) =>
    runMigrations && config.app.migrate
      ? bashScript(config, [artisan(config.app, 'migrate --force --no-interaction')])
      : null,
};

export default migrate;
