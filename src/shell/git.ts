import type { AppConfig } from '../types.js';
import asAppUser from './asAppUser.js';

export default function git(app: AppConfig, args: string): string {
  return asAppUser(app, `git ${args}`);
}
