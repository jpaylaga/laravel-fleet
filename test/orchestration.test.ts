import { describe, expect, it } from 'vitest';
import deploy from '../src/orchestration/deploy.js';
import planWaves from '../src/orchestration/planWaves.js';
import rollback from '../src/orchestration/rollback.js';
import { exampleConfig, FakeRunner } from './helpers.js';

const config = exampleConfig();
const targets = (n: number, canary: number[] = []) =>
  Array.from({ length: n }, (_, i) => ({
    name: `h${i}`,
    instanceId: `i-00000000000000${String(i).padStart(3, '0')}`,
    canary: canary.includes(i),
  }));

describe('planWaves', () => {
  it('puts the migration host alone, then canaries one by one, then batches', () => {
    const waves = planWaves(targets(6, [3, 4]), 2);
    expect(waves.map((w) => w.map((t) => t.name))).toEqual([['h3'], ['h4'], ['h0', 'h1'], ['h2', 'h5']]);
  });

  it('runs the first host alone even without canaries', () => {
    expect(planWaves(targets(3), 5).map((w) => w.length)).toEqual([1, 2]);
  });
});

describe('deploy', () => {
  it('deploys every host and migrates only on the first', async () => {
    const runner = new FakeRunner();
    const outcomes = await deploy({ config, ref: 'main', runner, secret: 's' });
    expect(outcomes.map((o) => o.status)).toEqual(['deployed', 'deployed', 'deployed']);
    expect(runner.labels('tenant-a')).toContain('migrate');
    expect(runner.labels('tenant-b')).not.toContain('migrate');
    expect(runner.labels('tenant-a').at(-1)).toBe('maintenance-off');
  });

  it('rolls back a host that fails after mutating and halts the rest', async () => {
    const runner = new FakeRunner((t, l) => t === 'tenant-a' && l === 'smoke');
    const outcomes = await deploy({ config, ref: 'main', runner, secret: 's' });
    expect(outcomes).toEqual([
      { target: 'tenant-a', status: 'rolled-back', failedStage: 'smoke' },
      { target: 'tenant-b', status: 'skipped' },
      { target: 'tenant-c', status: 'skipped' },
    ]);
    expect(runner.labels('tenant-a').slice(-2)).toEqual(['smoke', 'rollback']);
    expect(runner.labels('tenant-b')).toEqual([]);
  });

  it('does not roll back when preflight fails, since nothing changed', async () => {
    const runner = new FakeRunner((_, l) => l === 'preflight');
    const [first] = await deploy({ config, ref: 'main', runner, secret: 's' });
    expect(first).toEqual({ target: 'tenant-a', status: 'failed', failedStage: 'preflight' });
    expect(runner.labels('tenant-a')).toEqual(['preflight']);
  });

  it('reports rollback-failed when the rollback itself fails', async () => {
    const runner = new FakeRunner((t, l) => t === 'tenant-a' && (l === 'composer' || l === 'rollback'));
    const [first] = await deploy({ config, ref: 'main', runner, secret: 's' });
    expect(first?.status).toBe('rollback-failed');
  });

  it('treats a thrown runner error as a failed stage', async () => {
    const runner = new FakeRunner();
    runner.run = async () => { throw new Error('AccessDeniedException'); };
    const [first] = await deploy({ config, ref: 'main', runner, secret: 's' });
    expect(first).toEqual({ target: 'tenant-a', status: 'failed', failedStage: 'preflight' });
  });
});

describe('rollback', () => {
  it('rolls back hosts in order using the previous marker and stops on failure', async () => {
    const runner = new FakeRunner((t) => t === 'tenant-b');
    const outcomes = await rollback({ config, runner });
    expect(outcomes.map((o) => o.status)).toEqual(['rolled-back', 'rollback-failed']);
    expect(runner.calls[0]?.script).toContain('.fleet/previous');
  });
});
