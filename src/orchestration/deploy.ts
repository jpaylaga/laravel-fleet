import deployStages from '../stages/deployStages.js';
import type { DeployOptions, HostOutcome } from '../types.js';
import deployWave from './deployWave.js';
import newSecret from './newSecret.js';
import planWaves from './planWaves.js';

/**
 * Deploy `ref` to the fleet, wave by wave. The first wave is a single host that also
 * migrates; any host that does not end up deployed halts the rollout, so the hosts
 * after it stay on the previous release.
 */
export default async function deploy(options: DeployOptions): Promise<HostOutcome[]> {
  const { config, runner, ref } = options;
  const run = {
    config,
    runner,
    ref,
    stages: options.stages ?? deployStages,
    secret: options.secret ?? newSecret(),
    emit: options.onEvent ?? (() => {}),
  };
  const waves = planWaves(options.targets ?? config.targets, config.concurrency);

  const outcomes: HostOutcome[] = [];
  let halted = false;

  for (const [index, wave] of waves.entries()) {
    if (halted) {
      outcomes.push(...wave.map((t) => ({ target: t.name, status: 'skipped' as const })));
      continue;
    }

    const results = await deployWave(run, wave, index === 0);
    outcomes.push(...results);

    const failed = results.find((r) => r.status !== 'deployed');
    if (failed) {
      halted = true;
      run.emit({ type: 'halted', reason: `${failed.target} ${failed.status} at ${failed.failedStage}` });
    }
  }

  return outcomes;
}
