import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import rebuildCachesLines from './fragments/rebuildCachesLines.js';

const caches: Stage = {
  name: 'caches',
  mutates: true,
  script: ({ config }) => (config.app.caches.length ? bashScript(config, rebuildCachesLines(config.app)) : null),
};

export default caches;
