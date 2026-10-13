import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import composerInstallLines from './fragments/composerInstallLines.js';

const composer: Stage = {
  name: 'composer',
  mutates: true,
  script: ({ config }) => bashScript(config, composerInstallLines(config.app)),
};

export default composer;
