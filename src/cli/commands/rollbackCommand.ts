import { Command } from 'commander';
import rollback from '../../orchestration/rollback.js';
import createSsmRunner from '../../runners/createSsmRunner.js';
import confirm from '../confirm.js';
import printEvent from '../printEvent.js';
import printOutcomes from '../printOutcomes.js';
import resolveContext from '../resolveContext.js';

export default function rollbackCommand(): Command {
  return new Command('rollback')
    .description("restore each host's previous release (migrations are not reversed)")
    .option('-y, --yes', 'skip the confirmation prompt')
    .action(async (opts: { yes?: boolean }, command: Command) => {
      const { config, targets } = await resolveContext(command);
      await confirm(`Roll back ${targets.map((t) => t.name).join(', ')}?`, opts.yes);

      const outcomes = await rollback({
        config,
        targets,
        runner: createSsmRunner({ defaultRegion: config.region }),
        onEvent: printEvent,
      });
      printOutcomes(outcomes, 'rolled-back');
    });
}
