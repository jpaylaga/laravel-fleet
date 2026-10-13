import { SendCommandCommand } from '@aws-sdk/client-ssm';
import type { RunOptions, SsmClientLike, Target } from '../../types.js';

/** Starts the script on one instance and returns the SSM command id. */
export default async function sendScript(
  client: SsmClientLike,
  target: Target,
  script: string,
  { label, timeoutSeconds }: RunOptions,
): Promise<string> {
  // AWS-RunShellScript executes with /bin/sh (dash on Ubuntu), which has no pipefail
  // and no here-strings. Ship the script base64-encoded and run it with bash.
  const encoded = Buffer.from(script, 'utf8').toString('base64');
  const sent = await client.send(
    new SendCommandCommand({
      InstanceIds: [target.instanceId],
      DocumentName: 'AWS-RunShellScript',
      Comment: `laravel-fleet ${label}`.slice(0, 100),
      Parameters: {
        commands: [`bash -c "$(printf %s '${encoded}' | base64 -d)"`],
        executionTimeout: [String(timeoutSeconds)],
      },
    }),
  );
  const commandId = sent.Command?.CommandId;
  if (!commandId) throw new Error('SSM SendCommand returned no CommandId');
  return commandId;
}
