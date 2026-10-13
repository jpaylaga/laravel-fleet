import type { AppConfig } from '../types.js';
import asAppUser from './asAppUser.js';
import q from './q.js';

export default function artisan(app: AppConfig, args: string): string {
  return asAppUser(app, `${q(app.php)} artisan ${args}`);
}
