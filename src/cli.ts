#!/usr/bin/env node
import { Command } from 'commander';
import deployCommand from './cli/commands/deployCommand.js';
import execCommand from './cli/commands/execCommand.js';
import initCommand from './cli/commands/initCommand.js';
import planCommand from './cli/commands/planCommand.js';
import rollbackCommand from './cli/commands/rollbackCommand.js';

const program = new Command()
  .name('fleet')
  .description('Zero-SSH, stage-by-stage Laravel deploys to EC2 fleets via AWS SSM Run Command')
  .version('0.1.0')
  .option('-c, --config <path>', 'config file', 'fleet.config.json')
  .option('-t, --target <names>', 'comma-separated target names (default: all)')
  .addCommand(initCommand())
  .addCommand(planCommand())
  .addCommand(deployCommand())
  .addCommand(rollbackCommand())
  .addCommand(execCommand());

program.parseAsync().catch((err: unknown) => {
  console.error(`fleet: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
