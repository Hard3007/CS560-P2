import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const config = Object.freeze({
  port,
  mongoUri: process.env.MONGODB_URI?.trim() || '',
  mongoDb: process.env.MONGODB_DB?.trim() || 'recallguard',
  requireDatabase: process.env.NODE_ENV === 'production',
  revision: process.env.RAILWAY_GIT_COMMIT_SHA || null,
});
