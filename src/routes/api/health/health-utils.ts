import { sql } from 'drizzle-orm';

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
