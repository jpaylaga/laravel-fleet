import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import q from '../src/shell/q.js';
import deployStages from '../src/stages/deployStages.js';
import rollbackScript from '../src/stages/rollbackScript.js';
import type { DeployContext } from '../src/types.js';
import { exampleConfig } from './helpers.js';

const config = exampleConfig();
const ctx = (over: Partial<DeployContext> = {}): DeployContext => ({
  config,
  target: config.targets[0]!,
  ref: 'v1.2.3',
  secret: 'abc123',
  runMigrations: true,
  ...over,
});
const stage = (name: string, c = ctx()) => deployStages.find((s) => s.name === name)!.script(c);
const bashSyntaxOk = (script: string) => spawnSync('bash', ['-n'], { input: script }).status === 0;

describe('deploy stages', () => {
  it('runs in an order where traffic stops before anything is touched', () => {
    expect(deployStages.map((s) => s.name)).toEqual([
      'preflight', 'maintenance-on', 'workers-stop', 'fetch', 'composer', 'migrate',
      'caches', 'fpm-reload', 'workers-start', 'smoke', 'maintenance-off',
    ]);
  });

  it('produces syntactically valid bash for every stage and the rollback', () => {
    for (const s of deployStages) {
      const script = s.script(ctx());
      if (script) expect(bashSyntaxOk(script), s.name).toBe(true);
    }
    expect(bashSyntaxOk(rollbackScript(config, 'abc123', 'rollback-to'))).toBe(true);
  });

  it('starts every script with strict mode in the app directory', () => {
    expect(stage('caches')).toMatch(/^set -Eeuo pipefail\ncd '\/var\/www\/app'\n/);
  });

  it('never pipes supervisorctl into grep (pipefail inverts the check)', () => {
    for (const name of ['workers-stop', 'workers-start']) {
      expect(stage(name)).not.toMatch(/supervisorctl[^\n|]*\|\s*grep/);
      expect(stage(name)).toContain('status_out=$(supervisorctl status');
    }
  });

  it('removes the cached config before config:cache', () => {
    const script = stage('caches')!;
    expect(script.indexOf('rm -f bootstrap/cache/config.php')).toBeLessThan(script.indexOf('config:cache'));
  });

  it('runs git, composer and artisan as the app user', () => {
    const lines = deployStages.flatMap((s) => (s.script(ctx()) ?? '').split('\n'));
    const offenders = lines.filter((l) => /(^|\s)(git|artisan|composer')\s/.test(l) && !l.includes("sudo -H -u 'www-data' --"));
    expect(offenders).toEqual([]);
  });

  it('only migrates on the migration host', () => {
    expect(stage('migrate', ctx({ runMigrations: true }))).toContain('migrate --force');
    expect(stage('migrate', ctx({ runMigrations: false }))).toBeNull();
  });

  it('smoke-checks through the maintenance bypass before going live', () => {
    const script = stage('smoke')!;
    expect(script).toContain("'http://127.0.0.1/abc123'");
    expect(script).toContain("-H 'Host: app.example.com'");
    expect(stage('maintenance-on')).toContain("--secret='abc123'");
  });

  it('skips worker and smoke stages when they are not configured', () => {
    const bare = exampleConfig({ smoke: undefined, app: { ...config.app, workers: [] } });
    const c = ctx({ config: bare });
    expect(stage('workers-stop', c)).toBeNull();
    expect(stage('workers-start', c)).toBeNull();
    expect(stage('smoke', c)).toBeNull();
  });

  it('prefers origin/<ref> so stale local branches are not deployed', () => {
    expect(stage('fetch')).toContain(`'origin/v1.2.3^{commit}'`);
  });

  it('rollback restores the marker commit, rebuilds caches and always ends with up', () => {
    const script = rollbackScript(config, 'abc123', 'rollback-to');
    expect(script).toContain('to=$(cat .fleet/rollback-to)');
    expect(script).not.toContain('migrate');
    expect(script.trimEnd().split('\n').at(-2)).toContain('artisan up');
  });
});

describe('q', () => {
  it('survives single quotes', () => {
    const out = spawnSync('bash', ['-c', `printf %s ${q("it's $HOME")}`], { encoding: 'utf8' }).stdout;
    expect(out).toBe("it's $HOME");
  });
});
