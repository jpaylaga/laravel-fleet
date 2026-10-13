import { GetCommandInvocationCommand, InvocationDoesNotExist } from '@aws-sdk/client-ssm';
import type { RunResult, SsmClientLike, Target } from '../../types.js';

const PENDING = new Set(['Pending', 'InProgress', 'Delayed']);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls one SSM command invocation until it finishes, then maps it to a RunResult. */
export default async function waitForInvocation(
  client: SsmClientLike,
  target: Target,
  commandId: string,
  timeoutSeconds: number,
  pollIntervalMs: number,
): Promise<RunResult> {
  const deadline = Date.now() + (timeoutSeconds + 60) * 1000;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    try {
      const inv = await client.send(
        new GetCommandInvocationCommand({ CommandId: commandId, InstanceId: target.instanceId }),
      );
      if (inv.Status && PENDING.has(inv.Status)) continue;
      return {
        exitCode: inv.Status === 'Success' ? 0 : inv.ResponseCode && inv.ResponseCode > 0 ? inv.ResponseCode : 1,
        stdout: inv.StandardOutputContent ?? '',
        stderr: inv.StandardErrorContent || (inv.Status === 'Success' ? '' : `SSM status: ${inv.Status}`),
      };
    } catch (err) {
      // The invocation is not queryable for a moment after SendCommand.
      if (err instanceof InvocationDoesNotExist) continue;
      throw err;
    }
  }
  return { exitCode: 124, stdout: '', stderr: `timed out waiting for SSM command ${commandId}` };
}
