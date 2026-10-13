import type { HostOutcome, HostRun } from '../types.js';
import rollbackHost from './rollbackHost.js';
import runStage from './runStage.js';

/** Runs every stage on one host; rolls it back as soon as a mutating stage fails. */
export default async function deployHost(host: HostRun): Promise<HostOutcome> {
  const target = host.target.name;

  for (const stage of host.stages) {
    const result = await runStage(host, stage);
    if (result === null || result.exitCode === 0) continue;

    if (!stage.mutates) return { target, status: 'failed', failedStage: stage.name };

    const rollback = await rollbackHost(host, 'rollback-to');
    return {
      target,
      status: rollback.exitCode === 0 ? 'rolled-back' : 'rollback-failed',
      failedStage: stage.name,
    };
  }

  return { target, status: 'deployed' };
}
