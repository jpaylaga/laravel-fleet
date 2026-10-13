# Using it as a library

```ts
import { createSsmRunner, deploy, loadConfig } from 'laravel-fleet';

const config = await loadConfig('fleet.config.json');
await deploy({ config, ref: 'v2.4.0', runner: createSsmRunner({ defaultRegion: config.region }) });
```

- Stages are plain `{ name, mutates, script(ctx) }` objects; pass your own via `deploy({ stages })`.
- `Runner` is a one-method interface if you need something other than SSM.
