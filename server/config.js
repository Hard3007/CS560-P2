import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_ID);
const isProduction = process.env.NODE_ENV === 'production';
const publicMongoUri = process.env.MONGODB_PUBLIC_URI?.trim() || '';
const defaultMongoUri = process.env.MONGODB_URI?.trim() || '';

export const config = Object.freeze({
  port,
  mongoUri:
    !isRailway && !isProduction
      ? publicMongoUri || defaultMongoUri
      : defaultMongoUri,
  mongoDb: process.env.MONGODB_DB?.trim() || 'recallguard',
  requireDatabase: isRailway || isProduction,
  revision: process.env.RAILWAY_GIT_COMMIT_SHA || null,
});
