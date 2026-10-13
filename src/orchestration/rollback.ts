import type { HostOutcome, RollbackOptions } from '../types.js';
import newSecret from './newSecret.js';
import rollbackHost from './rollbackHost.js';

/** Manual rollback to each host's previous release, one host at a time; stops at the first failure. */
export default async function rollback(options: RollbackOptions): Promise<HostOutcome[]> {
  const run = {
    config: options.config,
    runner: options.runner,
    secret: options.secret ?? newSecret(),
    emit: options.onEvent ?? (() => {}),
  };

  const outcomes: HostOutcome[] = [];
  for (const target of options.targets ?? options.config.targets) {
    const result = await rollbackHost({ ...run, target }, 'previous');
    outcomes.push({ target: target.name, status: result.exitCode === 0 ? 'rolled-back' : 'rollback-failed' });
    if (result.exitCode !== 0) break;
  }
  return outcomes;
}
