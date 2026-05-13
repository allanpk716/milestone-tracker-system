import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { sql } from 'drizzle-orm';
import { db } from '$lib/db/index.js';
import { createLogger } from '$lib/server/logger.js';
// @ts-expect-error — Vite handles JSON imports natively
import pkg from '../../../../package.json';

const logger = createLogger('health');

// ── Types ────────────────────────────────────────────────────────────────────

export interface HealthResponse {
	status: 'ok';
	version: string;
	uptime: number;
	db: 'connected' | 'error';
}

export interface DbClient {
	run: (query: ReturnType<typeof sql>) => unknown;
}

// ── Health check logic (exported for testability) ────────────────────────────

/**
 * Execute a lightweight DB probe. Returns 'connected' on success, 'error' on failure.
 * Extracted so tests can inject a mock DbClient without touching the global singleton.
 */
export async function healthCheck(database: DbClient): Promise<{ db: 'connected' | 'error' }> {
	try {
		await database.run(sql`SELECT 1`);
		return { db: 'connected' };
	} catch {
		return { db: 'error' };
	}
}

// ── Handler ──────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async () => {
	const { db: dbStatus } = await healthCheck(db);

	const response: HealthResponse = {
		status: 'ok',
		version: pkg.version,
		uptime: process.uptime(),
		db: dbStatus
	};

	logger.debug('Health check', { db: dbStatus });

	return json(response);
};
