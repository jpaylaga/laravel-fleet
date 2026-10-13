import type { FleetConfig } from '../types.js';
import q from './q.js';

/** Strict-mode bash script that starts in the app directory. */
export default function bashScript(config: FleetConfig, lines: string[]): string {
  return ['set -Eeuo pipefail', `cd ${q(config.app.path)}`, ...lines].join('\n');
}
