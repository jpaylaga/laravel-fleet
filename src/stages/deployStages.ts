import type { Stage } from '../types.js';
import caches from './caches.js';
import composer from './composer.js';
import fetchRelease from './fetchRelease.js';
import fpmReload from './fpmReload.js';
import maintenanceOff from './maintenanceOff.js';
import maintenanceOn from './maintenanceOn.js';
import migrate from './migrate.js';
import preflight from './preflight.js';
import smoke from './smoke.js';
import workersStart from './workersStart.js';
import workersStop from './workersStop.js';

/** Traffic stops before anything is touched, and the smoke check runs before it resumes. */
const deployStages: Stage[] = [
  preflight,
  maintenanceOn,
  workersStop,
  fetchRelease,
  composer,
  migrate,
  caches,
  fpmReload,
  workersStart,
  smoke,
  maintenanceOff,
];

export default deployStages;
