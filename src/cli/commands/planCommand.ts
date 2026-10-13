import { Command } from 'commander';
import assertValidRef from '../../config/assertValidRef.js';
import deploy from '../../orchestration/deploy.js';
import createPrintRunner from '../../runners/createPrintRunner.js';
import resolveContext from '../resolveContext.js';

export default function planCommand(): Command {
  return new Command('plan')
    .argument('<ref>', 'branch, tag or SHA')
    .description('print every script a deploy would run, without touching any host')
    .action(async (ref: string, _opts: unknown, command: Command) => {
      const { config, targets } = await resolveContext(command);
      await deploy({ config, ref: assertValidRef(ref), targets, runner: createPrintRunner(), secret: '<generated>' });
    });
}
