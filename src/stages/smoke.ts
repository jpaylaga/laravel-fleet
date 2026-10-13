import bashScript from '../shell/bashScript.js';
import type { Stage } from '../types.js';
import smokeCheckLines from './fragments/smokeCheckLines.js';

// Still in maintenance mode: a failed check rolls back before any user sees the release.
const smoke: Stage = {
  name: 'smoke',
  mutates: true,
  script: (ctx) => {
    const lines = smokeCheckLines(ctx);
    return lines ? bashScript(ctx.config, lines) : null;
  },
};

export default smoke;
