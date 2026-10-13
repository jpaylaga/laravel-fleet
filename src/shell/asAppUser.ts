import type { AppConfig } from '../types.js';
import q from './q.js';

// Every git/php/composer call runs as the app user: git >= 2.35.2 refuses to work in a
// repository owned by someone else ("dubious ownership"), and root-owned cache files
// break the next request that tries to rewrite them.
export default function asAppUser(app: AppConfig, command: string): string {
  return `sudo -H -u ${q(app.user)} -- ${command}`;
}
