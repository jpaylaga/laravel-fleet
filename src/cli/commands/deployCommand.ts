import { Command } from 'commander';
import assertValidRef from '../../config/assertValidRef.js';
import deploy from '../../orchestration/deploy.js';
import createSsmRunner from '../../runners/createSsmRunner.js';
import confirm from '../confirm.js';
import printEvent from '../printEvent.js';
import printOutcomes from '../printOutcomes.js';
import resolveContext from '../resolveContext.js';

export default function deployCommand(): Command {
  return new Command('deploy')
    .argument('<ref>', 'branch, tag or SHA')
    .description('deploy a release to every selected host, wave by wave')
    .option('-y, --yes', 'skip the confirmation prompt')
    .action(async (ref: string, opts: { yes?: boolean }, command: Command) => {
      const { config, targets } = await resolveContext(command);
      assertValidRef(ref);
      await confirm(`Deploy ${ref} to ${targets.map((t) => t.name).join(', ')}?`, opts.yes);

      const outcomes = await deploy({
        config,
        ref,
        targets,
        runner: createSsmRunner({ defaultRegion: config.region }),
        onEvent: printEvent,
      });
      printOutcomes(outcomes, 'deployed');
    });
}
