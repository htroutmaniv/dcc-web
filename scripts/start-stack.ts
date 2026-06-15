/**
 * Start Docker Postgres + nginx for development or production profile.
 *
 * Usage: bun scripts/with-env.ts <development|production> -- bun scripts/start-stack.ts
 */
import { ensurePostgres, ensureNginx } from './docker-stack.js';

ensurePostgres();
ensureNginx(true);
