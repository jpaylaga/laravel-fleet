import type { Target } from '../types.js';

/**
 * Order hosts into waves. The first host runs alone because it is the one that migrates;
 * every other host must not come up on the new code before the schema is ready.
 * Canaries follow one at a time, then the rest in batches of `concurrency`.
 */
export default function planWaves(targets: Target[], concurrency: number): Target[][] {
  const ordered = [...targets.filter((t) => t.canary), ...targets.filter((t) => !t.canary)];
  const [first, ...rest] = ordered;
  if (!first) return [];
  const waves: Target[][] = [[first]];
  const canaries = rest.filter((t) => t.canary);
  const others = rest.filter((t) => !t.canary);
  for (const c of canaries) waves.push([c]);
  for (let i = 0; i < others.length; i += concurrency) waves.push(others.slice(i, i + concurrency));
  return waves;
}
