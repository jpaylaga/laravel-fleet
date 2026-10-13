import artisan from '../shell/artisan.js';
import bashScript from '../shell/bashScript.js';
import q from '../shell/q.js';
import type { Stage } from '../types.js';

// Before stopping anything: workers and FPM can then stop without traffic still arriving.
const maintenanceOn: Stage = {
  name: 'maintenance-on',
  mutates: true,
  script: ({ config, secret }) =>
    bashScript(config, [artisan(config.app, `down --retry=${config.maintenance.retryAfter} --secret=${q(secret)}`)]),
};

export default maintenanceOn;
