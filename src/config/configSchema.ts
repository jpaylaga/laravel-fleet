import { z } from 'zod';

const cacheKind = z.enum(['config', 'route', 'view', 'event']);

const targetSchema = z.object({
  name: z.string().regex(/^[A-Za-z0-9._-]+$/, 'use letters, digits, dot, dash or underscore'),
  instanceId: z.string().regex(/^i-[0-9a-f]{8,17}$/, 'must be an EC2 instance id like i-0abc1234'),
  region: z.string().optional(),
  canary: z.boolean().default(false),
});

const configSchema = z.object({
  region: z.string().min(1),
  app: z.object({
    path: z.string().startsWith('/', 'must be an absolute path'),
    user: z.string().default('www-data'),
    php: z.string().default('php'),
    composer: z.string().default('composer'),
    fpmService: z.string().min(1),
    workers: z.array(z.string().min(1)).default([]),
    migrate: z.boolean().default(true),
    caches: z.array(cacheKind).default(['config', 'route', 'view', 'event']),
  }),
  maintenance: z
    .object({ retryAfter: z.number().int().positive().default(15) })
    .default({ retryAfter: 15 }),
  smoke: z
    .object({
      url: z.url(),
      host: z.string().optional(),
      expectStatus: z.number().int().default(200),
      timeoutSeconds: z.number().int().positive().default(10),
    })
    .optional(),
  concurrency: z.number().int().positive().default(1),
  commandTimeoutSeconds: z.number().int().positive().default(900),
  targets: z
    .array(targetSchema)
    .min(1)
    .refine((t) => new Set(t.map((x) => x.name)).size === t.length, 'target names must be unique'),
});

export default configSchema;
