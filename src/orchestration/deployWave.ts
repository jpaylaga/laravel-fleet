import type { HostOutcome, HostRun, Target } from '../types.js';
import deployHost from './deployHost.js';

/** Deploys every host in a wave at once. */
export default function deployWave(
  run: Omit<HostRun, 'target' | 'runMigrations'>,
  wave: Target[],
  runMigrations: boolean,
): Promise<HostOutcome[]> {
  return Promise.all(wave.map((target) => deployHost({ ...run, target, runMigrations })));
}
