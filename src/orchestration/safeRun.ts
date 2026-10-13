import type { RunOptions, Runner, RunResult, Target } from '../types.js';

/** Runs a script and turns a thrown runner error into a failed RunResult. */
export default async function safeRun(
  runner: Runner,
  target: Target,
  script: string,
  options: RunOptions,
): Promise<RunResult> {
  try {
    return await runner.run(target, script, options);
  } catch (err) {
    return { exitCode: -1, stdout: '', stderr: err instanceof Error ? err.message : String(err) };
  }
}
