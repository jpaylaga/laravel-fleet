import type { FleetConfig, Target } from '../types.js';

export default function selectTargets(config: FleetConfig, names?: string[]): Target[] {
  if (!names || names.length === 0) return config.targets;
  const unknown = names.filter((n) => !config.targets.some((t) => t.name === n));
  if (unknown.length > 0) throw new Error(`Unknown target(s): ${unknown.join(', ')}`);
  return config.targets.filter((t) => names.includes(t.name));
}
