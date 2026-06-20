// Prisma 7 configuration for migrate/introspect/seed.
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

loadEnv({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
