import asAppUser from '../shell/asAppUser.js';
import bashScript from '../shell/bashScript.js';
import git from '../shell/git.js';
import type { Stage } from '../types.js';

const preflight: Stage = {
  name: 'preflight',
  mutates: false,
  script: ({ config }) => {
    const app = config.app;
    return bashScript(config, [
      `test -d .git || { echo 'no .git directory in the app path' >&2; exit 1; }`,
      `${git(app, 'diff --quiet')} && ${git(app, 'diff --cached --quiet')} || { echo 'working tree has local changes, refusing to deploy' >&2; ${git(app, 'status --short')} >&2; exit 1; }`,
      `avail_kb=$(df -Pk . | awk 'NR==2 {print $4}')`,
      `if [ "$avail_kb" -lt 1048576 ]; then echo "less than 1 GiB free ($avail_kb KiB)" >&2; exit 1; fi`,
      ...(app.workers.length > 0 ? ['command -v supervisorctl >/dev/null'] : []),
      ...(config.smoke ? ['command -v curl >/dev/null'] : []),
      asAppUser(app, 'mkdir -p .fleet'),
      asAppUser(app, 'rm -f .fleet/rollback-to'),
    ]);
  },
};

export default preflight;
