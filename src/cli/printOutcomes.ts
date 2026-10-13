import type { HostOutcome, HostStatus } from '../types.js';

/** Prints the per-host table and sets a non-zero exit code unless every host reached `expected`. */
export default function printOutcomes(outcomes: HostOutcome[], expected: HostStatus): void {
  console.log('');
  console.table(outcomes);
  process.exitCode = outcomes.every((o) => o.status === expected) ? 0 : 1;
}
