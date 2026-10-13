import type { DeployEvent } from '../types.js';

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const tail = (text: string, lines = 30) => text.trimEnd().split('\n').slice(-lines).join('\n');

/** One line per event; failed output is shown trimmed to its last 30 lines. */
export default function printEvent(e: DeployEvent): void {
  switch (e.type) {
    case 'stage-start':
      console.log(`[${e.target.name}] → ${e.stage}`);
      break;
    case 'stage-end': {
      const ok = e.result.exitCode === 0;
      console.log(`[${e.target.name}] ${ok ? '✓' : '✗'} ${e.stage} (${secs(e.ms)})`);
      if (!ok) {
        if (e.result.stdout) console.log(tail(e.result.stdout));
        if (e.result.stderr) console.error(tail(e.result.stderr));
      }
      break;
    }
    case 'rollback-start':
      console.log(`[${e.target.name}] ↺ rollback`);
      break;
    case 'rollback-end':
      console.log(`[${e.target.name}] ${e.result.exitCode === 0 ? '✓' : '✗'} rollback (${secs(e.ms)})`);
      if (e.result.stdout) console.log(tail(e.result.stdout));
      if (e.result.exitCode !== 0 && e.result.stderr) console.error(tail(e.result.stderr));
      break;
    case 'halted':
      console.error(`halted: ${e.reason}; remaining hosts were not touched`);
      break;
  }
}
