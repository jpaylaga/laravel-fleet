import { existsSync } from 'node:fs';
import { copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import type { CliGlobalOptions } from '../../types.js';

const EXAMPLE = new URL('../../../examples/fleet.config.json', import.meta.url);

export default function initCommand(): Command {
  return new Command('init')
    .description('write an example fleet.config.json')
    .action(async (_opts: unknown, command: Command) => {
      const dest = command.optsWithGlobals<CliGlobalOptions>().config;
      if (existsSync(dest)) throw new Error(`${dest} already exists`);
      await copyFile(fileURLToPath(EXAMPLE), dest);
      console.log(`wrote ${dest}`);
    });
}
