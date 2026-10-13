import { SSMClient } from '@aws-sdk/client-ssm';
import type { Runner, SsmClientLike, SsmRunnerOptions } from '../types.js';
import sendScript from './ssm/sendScript.js';
import waitForInvocation from './ssm/waitForInvocation.js';

/**
 * Runs scripts through SSM Run Command (AWS-RunShellScript), so hosts need the SSM
 * agent and an instance profile, but no inbound SSH.
 */
export default function createSsmRunner(options: SsmRunnerOptions): Runner {
  const pollIntervalMs = options.pollIntervalMs ?? 1500;
  const clientFor = options.clientFor ?? ((region: string) => new SSMClient({ region }));
  const clients = new Map<string, SsmClientLike>();

  const clientIn = (region: string): SsmClientLike => {
    let client = clients.get(region);
    if (!client) {
      client = clientFor(region);
      clients.set(region, client);
    }
    return client;
  };

  return {
    async run(target, script, runOptions) {
      const client = clientIn(target.region ?? options.defaultRegion);
      const commandId = await sendScript(client, target, script, runOptions);
      return waitForInvocation(client, target, commandId, runOptions.timeoutSeconds, pollIntervalMs);
    },
  };
}
