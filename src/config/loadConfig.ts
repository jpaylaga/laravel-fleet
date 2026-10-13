import { readFile } from 'node:fs/promises';
import type { FleetConfig } from '../types.js';
import parseConfig from './parseConfig.js';

export default async function loadConfig(path: string): Promise<FleetConfig> {
  const raw = await readFile(path, 'utf8');
  return parseConfig(JSON.parse(raw));
}
