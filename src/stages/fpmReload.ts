import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import reloadFpmLines from './fragments/reloadFpmLines.js';

const fpmReload: Stage = {
  name: 'fpm-reload',
  mutates: true,
  script: ({ config }) => bashScript(config, reloadFpmLines(config.app)),
};

export default fpmReload;
