import { Command } from 'commander';
import execAll from '../../orchestration/execAll.js';
import createSsmRunner from '../../runners/createSsmRunner.js';
import bashScript from '../../shell/bashScript.js';
import resolveContext from '../resolveContext.js';

export default function execCommand(): Command {
  return new Command('exec')
    .argument('<command...>', 'shell command to run')
    .description('run a shell command in the app directory on every target')
    .action(async (words: string[], _opts: unknown, command: Command) => {
      const { config, targets } = await resolveContext(command);
      const results = await execAll(
        createSsmRunner({ defaultRegion: config.region }),
        targets,
        bashScript(config, [words.join(' ')]),
        config.commandTimeoutSeconds,
      );

      for (const { target, result } of results) {
        console.log(`\n── ${target.name} (exit ${result.exitCode}) ──`);
        if (result.stdout) process.stdout.write(result.stdout);
        if (result.stderr) process.stderr.write(result.stderr);
      }
      process.exitCode = results.some((r) => r.result.exitCode !== 0) ? 1 : 0;
    });
}
