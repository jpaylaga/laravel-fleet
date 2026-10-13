import { readFileSync } from 'node:fs';
import parseConfig from '../src/config/parseConfig.js';
import type { FleetConfig, RunOptions, RunResult, Runner, Target } from '../src/types.js';

export function exampleConfig(overrides: Partial<FleetConfig> = {}): FleetConfig {
  const raw = JSON.parse(readFileSync(new URL('../examples/fleet.config.json', import.meta.url), 'utf8'));
  return parseConfig({ ...raw, ...overrides });
}

export interface Call { target: string; label: string; script: string }

/** Records every call; `fail` decides which (target, label) pairs exit non-zero. */
export class FakeRunner implements Runner {
  calls: Call[] = [];
  constructor(private readonly fail: (target: string, label: string) => boolean = () => false) {}

  async run(target: Target, script: string, { label }: RunOptions): Promise<RunResult> {
    this.calls.push({ target: target.name, label, script });
    return this.fail(target.name, label)
      ? { exitCode: 1, stdout: '', stderr: `${label} failed` }
      : { exitCode: 0, stdout: '', stderr: '' };
  }

  labels(target: string) {
    return this.calls.filter((c) => c.target === target).map((c) => c.label);
  }
}
