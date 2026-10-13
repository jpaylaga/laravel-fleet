import asAppUser from '../shell/asAppUser.js';
import bashScript from '../shell/bashScript.js';
import git from '../shell/git.js';
import q from '../shell/q.js';
import type { Stage } from '../types.js';

const fetchRelease: Stage = {
  name: 'fetch',
  mutates: true,
  script: ({ config, ref }) => {
    const app = config.app;
    return bashScript(config, [
      `prev=$(${git(app, 'rev-parse HEAD')})`,
      git(app, 'fetch --tags --force --prune origin'),
      `if ${git(app, `rev-parse -q --verify ${q(`origin/${ref}^{commit}`)}`)} >/dev/null; then sha=$(${git(app, `rev-parse --verify ${q(`origin/${ref}^{commit}`)}`)}); else sha=$(${git(app, `rev-parse --verify ${q(`${ref}^{commit}`)}`)}); fi`,
      `printf '%s\\n' "$prev" | ${asAppUser(app, 'tee .fleet/rollback-to .fleet/previous')} >/dev/null`,
      git(app, '-c advice.detachedHead=false checkout --detach "$sha"'),
      `printf '%s\\n' "$sha" | ${asAppUser(app, 'tee .fleet/current')} >/dev/null`,
      `echo "checked out $sha (was $prev)"`,
    ]);
  },
};

export default fetchRelease;
