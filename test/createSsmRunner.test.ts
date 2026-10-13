import { InvocationDoesNotExist, SendCommandCommand } from '@aws-sdk/client-ssm';
import { describe, expect, it } from 'vitest';
import createSsmRunner from '../src/runners/createSsmRunner.js';

const target = { name: 'web', instanceId: 'i-0123456789abcdef0', canary: false };

function fakeClient(invocations: Array<Record<string, unknown> | Error>) {
  const sent: unknown[] = [];
  return {
    sent,
    client: {
      send: async (cmd: unknown) => {
        sent.push(cmd);
        if (cmd instanceof SendCommandCommand) return { Command: { CommandId: 'cmd-1' } };
        const next = invocations.shift();
        if (next instanceof Error) throw next;
        return next;
      },
    },
  };
}

const notYet = () => new InvocationDoesNotExist({ message: 'not yet', $metadata: {} });

describe('createSsmRunner', () => {
  it('sends the script base64-encoded to bash and polls until done', async () => {
    const fake = fakeClient([notYet(), { Status: 'InProgress' }, { Status: 'Success', ResponseCode: 0, StandardOutputContent: 'ok' }]);
    const runner = createSsmRunner({ defaultRegion: 'us-west-2', pollIntervalMs: 1, clientFor: () => fake.client as never });
    const result = await runner.run(target, 'echo "hi"', { label: 'smoke', timeoutSeconds: 30 });

    expect(result).toEqual({ exitCode: 0, stdout: 'ok', stderr: '' });
    const input = (fake.sent[0] as SendCommandCommand).input;
    expect(input.DocumentName).toBe('AWS-RunShellScript');
    const command = input.Parameters?.commands?.[0] ?? '';
    const b64 = /'([A-Za-z0-9+/=]+)'/.exec(command)?.[1] ?? '';
    expect(Buffer.from(b64, 'base64').toString()).toBe('echo "hi"');
    expect(input.Parameters?.executionTimeout).toEqual(['30']);
  });

  it('returns the remote exit code on failure', async () => {
    const fake = fakeClient([{ Status: 'Failed', ResponseCode: 3, StandardErrorContent: 'boom' }]);
    const runner = createSsmRunner({ defaultRegion: 'us-west-2', pollIntervalMs: 1, clientFor: () => fake.client as never });
    expect(await runner.run(target, 'false', { label: 'x', timeoutSeconds: 5 })).toEqual({ exitCode: 3, stdout: '', stderr: 'boom' });
  });

  it('uses one client per region', async () => {
    const regions: string[] = [];
    const runner = createSsmRunner({
      defaultRegion: 'us-west-2',
      pollIntervalMs: 1,
      clientFor: (r) => { regions.push(r); return fakeClient([{ Status: 'Success' }, { Status: 'Success' }]).client as never; },
    });
    await runner.run(target, 'true', { label: 'a', timeoutSeconds: 5 });
    await runner.run({ ...target, region: 'ap-southeast-1' }, 'true', { label: 'b', timeoutSeconds: 5 });
    expect(regions).toEqual(['us-west-2', 'ap-southeast-1']);
  });
});
