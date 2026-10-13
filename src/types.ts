import type { SSMClient } from '@aws-sdk/client-ssm';
import type { z } from 'zod';
import type configSchema from './config/configSchema.js';

// ── Config ────────────────────────────────────────────────────────────────

export type FleetConfig = z.infer<typeof configSchema>;
export type Target = FleetConfig['targets'][number];
export type AppConfig = FleetConfig['app'];

// ── Stages ────────────────────────────────────────────────────────────────

export interface DeployContext {
  config: FleetConfig;
  target: Target;
  ref: string;
  /** `artisan down --secret` value, so the smoke check can reach the app before it goes live. */
  secret: string;
  /** Only the first host of a deploy runs migrations. */
  runMigrations: boolean;
}

export interface Stage {
  name: string;
  /** False when a failure here leaves the host untouched, so no rollback is needed. */
  mutates: boolean;
  /** Returns the bash script for this stage, or null when the stage does not apply. */
  script(ctx: DeployContext): string | null;
}

export type RollbackMarker = 'rollback-to' | 'previous';

// ── Runners ───────────────────────────────────────────────────────────────

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface RunOptions {
  label: string;
  timeoutSeconds: number;
}

/** Runs a bash script as root on one target host. */
export interface Runner {
  run(target: Target, script: string, options: RunOptions): Promise<RunResult>;
}

export type SsmClientLike = Pick<SSMClient, 'send'>;

export interface SsmRunnerOptions {
  defaultRegion: string;
  pollIntervalMs?: number;
  clientFor?: (region: string) => SsmClientLike;
}

// ── Orchestration ─────────────────────────────────────────────────────────

export type HostStatus = 'deployed' | 'failed' | 'rolled-back' | 'rollback-failed' | 'skipped';

export interface HostOutcome {
  target: string;
  status: HostStatus;
  failedStage?: string;
}

export type DeployEvent =
  | { type: 'stage-start'; target: Target; stage: string }
  | { type: 'stage-end'; target: Target; stage: string; result: RunResult; ms: number }
  | { type: 'rollback-start'; target: Target }
  | { type: 'rollback-end'; target: Target; result: RunResult; ms: number }
  | { type: 'halted'; reason: string };

export type EventSink = (event: DeployEvent) => void;

export interface DeployOptions {
  config: FleetConfig;
  ref: string;
  runner: Runner;
  targets?: Target[];
  secret?: string;
  stages?: Stage[];
  onEvent?: EventSink;
}

export type RollbackOptions = Omit<DeployOptions, 'ref' | 'stages'>;

/** Everything one host needs while it deploys. Built once by `deploy`, passed down unchanged. */
export interface HostRun extends DeployContext {
  runner: Runner;
  stages: Stage[];
  emit: EventSink;
}

export type RollbackRun = Pick<HostRun, 'config' | 'runner' | 'secret' | 'emit' | 'target'>;

// ── CLI ───────────────────────────────────────────────────────────────────

export interface CliGlobalOptions {
  config: string;
  target?: string;
}
