import type { Runner } from '../types.js';

/** Prints each script instead of running it. Backs `fleet plan`. */
export default function createPrintRunner(write: (text: string) => void = (t) => process.stdout.write(t)): Runner {
  return {
    async run(target, script, { label }) {
      write(`\n# ── ${target.name} (${target.instanceId}) · ${label} ──\n${script}\n`);
      return { exitCode: 0, stdout: '', stderr: '' };
    },
  };
}
