import artisan from '../shell/artisan.js';
import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';

const maintenanceOff: Stage = {
  name: 'maintenance-off',
  mutates: true,
  script: ({ config }) => bashScript(config, [artisan(config.app, 'up')]),
};

export default maintenanceOff;
