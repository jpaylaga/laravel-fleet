import { randomBytes } from 'node:crypto';

/** Per-deploy `artisan down --secret` value. */
export default function newSecret(): string {
  return randomBytes(16).toString('hex');
}
