# Development

## Project layout

- One default export per file, named after the file.
- `deploy` reads as the orchestration: `planWaves` → `deployWave` → `deployHost` → `runStage` / `rollbackHost`.

```
src/
  config/              configSchema, parseConfig, loadConfig, selectTargets, assertValidRef
  shell/               q, bashScript, asAppUser, artisan, git
  stages/              one file per stage, deployStages, rollbackScript
  stages/fragments/    bash snippets shared by stages and rollback
  runners/             createPrintRunner, createSsmRunner
  orchestration/       deploy, planWaves, deployWave, deployHost, runStage, rollbackHost
  cli/                 commands and output
  types.ts             shared types
```

## Development

```bash
npm ci && npm test && npm run typecheck && npm run build
```

- Tests include `bash -n` on every generated script.
