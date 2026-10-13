import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import startWorkersLines from './fragments/startWorkersLines.js';

const workersStart: Stage = {
  name: 'workers-start',
  mutates: true,
  script: ({ config }) => (config.app.workers.length ? bashScript(config, startWorkersLines(config.app, true)) : null),
};

export default workersStart;
