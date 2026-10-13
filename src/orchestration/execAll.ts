import type { Runner, RunResult, Target } from '../types.js';
import safeRun from './safeRun.js';

/** Runs one ad hoc script on every target in parallel. */
export default function execAll(
  runner: Runner,
  targets: Target[],
  script: string,
  timeoutSeconds: number,
): Promise<Array<{ target: Target; result: RunResult }>> {
  return Promise.all(
    targets.map(async (target) => ({
      target,
      result: await safeRun(runner, target, script, { label: 'exec', timeoutSeconds }),
    })),
  );
}
