import rollbackScript from '../stages/rollbackScript.js';
import type { RollbackMarker, RollbackRun, RunResult } from '../types.js';
import safeRun from './safeRun.js';

/** Restores the release recorded in `.fleet/<marker>` on one host. */
export default async function rollbackHost(host: RollbackRun, marker: RollbackMarker): Promise<RunResult> {
  host.emit({ type: 'rollback-start', target: host.target });
  const started = Date.now();
  const result = await safeRun(host.runner, host.target, rollbackScript(host.config, host.secret, marker), {
    label: 'rollback',
    timeoutSeconds: host.config.commandTimeoutSeconds,
  });
  host.emit({ type: 'rollback-end', target: host.target, result, ms: Date.now() - started });
  return result;
}
