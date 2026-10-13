import { z } from 'zod';
import type { FleetConfig } from '../types.js';
import configSchema from './configSchema.js';

export default function parseConfig(input: unknown): FleetConfig {
  const result = configSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid fleet config:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
