import type { Command } from 'commander';
import loadConfig from '../config/loadConfig.js';
import selectTargets from '../config/selectTargets.js';
import type { CliGlobalOptions, FleetConfig, Target } from '../types.js';

/** Loads the config file and target selection named by the global `-c` / `-t` options. */
export default async function resolveContext(command: Command): Promise<{ config: FleetConfig; targets: Target[] }> {
  const opts = command.optsWithGlobals<CliGlobalOptions>();
  const config = await loadConfig(opts.config);
  const names = opts.target?.split(',').map((s) => s.trim()).filter(Boolean);
  return { config, targets: selectTargets(config, names) };
}
