import { describe, expect, it } from 'vitest';
import assertValidRef from '../src/config/assertValidRef.js';
import parseConfig from '../src/config/parseConfig.js';
import selectTargets from '../src/config/selectTargets.js';
import { exampleConfig } from './helpers.js';

describe('config', () => {
  it('parses the shipped example and applies defaults', () => {
    const config = exampleConfig();
    expect(config.targets).toHaveLength(3);
    expect(config.targets[1]?.canary).toBe(false);
  });

  it('fills defaults for a minimal config', () => {
    const config = parseConfig({
      region: 'us-east-1',
      app: { path: '/srv/app', fpmService: 'php-fpm' },
      targets: [{ name: 'web', instanceId: 'i-0123456789abcdef0' }],
    });
    expect(config.app.user).toBe('www-data');
    expect(config.app.caches).toEqual(['config', 'route', 'view', 'event']);
    expect(config.maintenance.retryAfter).toBe(15);
    expect(config.concurrency).toBe(1);
  });

  it('rejects duplicate target names and bad instance ids', () => {
    const base = { region: 'us-east-1', app: { path: '/srv/app', fpmService: 'php-fpm' } };
    expect(() =>
      parseConfig({ ...base, targets: [{ name: 'a', instanceId: 'i-0123456789abcdef0' }, { name: 'a', instanceId: 'i-0123456789abcdef1' }] }),
    ).toThrow(/unique/);
    expect(() => parseConfig({ ...base, targets: [{ name: 'a', instanceId: 'web-1' }] })).toThrow(/instance id/);
  });

  it('selects targets by name and reports unknown ones', () => {
    const config = exampleConfig();
    expect(selectTargets(config, ['tenant-b']).map((t) => t.name)).toEqual(['tenant-b']);
    expect(() => selectTargets(config, ['nope'])).toThrow(/Unknown target/);
  });

  it.each(['main', 'v1.4.2', 'release/2026-10', 'a1b2c3d'])('accepts ref %s', (ref) => {
    expect(assertValidRef(ref)).toBe(ref);
  });

  it.each(['--upload-pack=x', 'main..evil', "main'; rm -rf /", 'a b', ''])('rejects ref %j', (ref) => {
    expect(() => assertValidRef(ref)).toThrow(/Invalid git ref/);
  });
});
