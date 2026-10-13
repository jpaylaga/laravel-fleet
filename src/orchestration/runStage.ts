import type { HostRun, RunResult, Stage } from '../types.js';
import safeRun from './safeRun.js';

/** Runs one stage on one host. Returns null when the stage does not apply to this host. */
export default async function runStage(host: HostRun, stage: Stage): Promise<RunResult | null> {
  const script = stage.script(host);
  if (script === null) return null;

  host.emit({ type: 'stage-start', target: host.target, stage: stage.name });
  const started = Date.now();
  const result = await safeRun(host.runner, host.target, script, {
    label: stage.name,
    timeoutSeconds: host.config.commandTimeoutSeconds,
  });
  host.emit({ type: 'stage-end', target: host.target, stage: stage.name, result, ms: Date.now() - started });
  return result;
}
