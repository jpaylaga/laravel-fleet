import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import stopWorkersLines from './fragments/stopWorkersLines.js';

const workersStop: Stage = {
  name: 'workers-stop',
  mutates: true,
  script: ({ config }) => (config.app.workers.length ? bashScript(config, stopWorkersLines(config.app, true)) : null),
};

export default workersStop;
