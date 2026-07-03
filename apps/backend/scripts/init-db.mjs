import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = join(root, 'prisma', 'dev.sqlite');
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.sqlite' };

if (existsSync(dbFile)) {
  console.log('[init-db] dev.sqlite found, skipping migrate + seed');
} else {
  console.log('[init-db] no dev.sqlite, creating database...');
  execSync('pnpm exec prisma migrate deploy', { cwd: root, stdio: 'inherit', env });
  execSync('pnpm exec prisma db seed', { cwd: root, stdio: 'inherit', env });
}
